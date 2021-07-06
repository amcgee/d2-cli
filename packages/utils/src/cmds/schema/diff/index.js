const fs = require('fs')
const path = require('path')
const { reporter } = require('@dhis2/cli-helpers-engine')
const ejs = require('ejs')
const jsondiffpatch = require('jsondiffpatch')
const {
    schemasFromUrl,
    writeOutput,
    schemaDiffIdentifier,
    defaultOpts,
    resolveConfig,
} = require('../')
const utils = require('../../../support/utils')
const DHIS2HtmlFormatter = require('./schemaHtmlFormatter')

let cache

const hashKeys = ['singular', 'name', 'fieldName', 'type']
// We use the singular property as an unique identifier for schemas
// name and type are used for other nested properties
const objectHash = obj =>
    obj.singular || obj.name || obj.fieldName || obj.type || obj

const getHashKeyForObject = obj =>
    hashKeys.find(hashKey => Object.keys(obj).find(prop => hashKey === prop))

const getHashKeyForArray = array => getHashKeyForObject(array[0])

const Differ = jsondiffpatch.create({
    objectHash,
    propertyFilter: name => name !== 'href' && name !== 'apiEndpoint',
    arrays: {
        detectMove: true,
        includeValueOnMove: true,
    },
})

const formatters = {
    html: DHIS2HtmlFormatter,
    console: jsondiffpatch.formatters.console,
}

async function getSchemas(urlLike, { baseUrl, auth, force }) {
    let schemas
    let fileContents
    if ((fileContents = utils.getJSONFile(urlLike))) {
        reporter.debug(urlLike, ' is a file')
        schemas = fileContents
    } else {
        if (!utils.isRelativeUrl(urlLike)) {
            baseUrl = undefined
            urlLike = utils.prependHttpsProtocol(urlLike)
        }
        schemas = await schemasFromUrl(urlLike, {
            baseUrl,
            auth,
            force,
            cache,
        })
    }

    if (!schemas.schemas || !schemas.meta) {
        reporter.error(
            `${urlLike} is malformed. Must have an object with keys: [schemas, meta]`
        )
        process.exit(1)
    }
    return schemas
}

function sortSchemaObject(a, b) {
    const aHash = objectHash(a)
    const bHash = objectHash(b)
    if (aHash < bHash) return -1
    if (aHash > bHash) return 1
    return 0
}

function sortArrayProps(obj) {
    Object.keys(obj).forEach(key => {
        const val = obj[key]
        if (Array.isArray(val)) {
            const sorted = val.sort(sortSchemaObject)
            obj[key] = sorted
        } else if (typeof val === 'object') {
            sortArrayProps(val)
        }
    })
}

function transformArrayToObject(array, hashKey) {
    return array.reduce((acc, curr, index) => {
        let hash = curr[hashKey]
        if (!hash) {
            reporter.warn(
                'hash-candidate value not found, falling back to index for ',
                curr
            )
            hash = index
        }
        acc[curr[hashKey]] = curr
        return acc
    }, {})
}

// recursively travers the object and convert any
// array that is hashable (see hashKeys) to objects hashed by that key
// note that this will *not* further traverse array properties, only objects

function transformArrayPropsToHash(object) {
    Object.keys(object).forEach(key => {
        const val = object[key]
        if (Array.isArray(val) && val.length) {
            const hashKey = getHashKeyForArray(val)
            if (hashKey) {
                object[key] = transformArrayToObject(val, hashKey)
            }
        } else if (val && val.constructor.name === 'Object') {
            transformArrayPropsToHash(val)
        }
    })
}

// We are not interersted in indexes, so we convert to an object
// with 'singular' as hash for schemas
// This makes the diff more stable, as it has problems with
// arrays with moved objects (even with objectHash)
function prepareDiff(left, right, { sortArrays }) {
    const leftO = transformArrayToObject(left, 'singular')
    const rightO = transformArrayToObject(right, 'singular')

    transformArrayPropsToHash(leftO)
    transformArrayPropsToHash(rightO)

    if (sortArrays) {
        sortArrayProps(leftO)
        sortArrayProps(rightO)
    }
    return [leftO, rightO]
}

function diff(schemasLeft, schemasRight, opts) {
    const [left, right] = prepareDiff(
        schemasLeft.schemas,
        schemasRight.schemas,
        opts
    )
    const delta = Differ.diff(left, right)
    const meta = {
        left: schemasLeft.meta,
        right: schemasRight.meta,
    }
    return {
        delta,
        meta,
        left,
        right,
    }
}

function handleOutput(loc = false, { left, delta, meta, format }) {
    let out = delta
    let extension = format
    switch (format) {
        case 'html': {
            out = generateHtml({ left, delta, meta })
            break
        }
        case 'console': {
            out = formatters.console.format(delta, left)
            extension = 'out'
            break
        }
        case 'json': {
            out = JSON.stringify(delta)
            break
        }
    }

    if (loc !== false) {
        const defaultName = `${schemaDiffIdentifier(
            meta.left,
            meta.right
        )}.${extension}`
        writeOutput(loc, out, { defaultName })
    } else {
        reporter.pipe(out)
    }
}

function generateHtml({ left, delta, meta }) {
    const assets = {
        jsondiffpatchCSS: utils.btoa(
            fs.readFileSync(
                require.resolve('jsondiffpatch/dist/formatters-styles/html.css')
            )
        ),
    }

    const template = fs
        .readFileSync(path.join(__dirname, 'index.ejs'))
        .toString()

    return ejs.render(template, {
        left,
        delta,
        meta,
        formatted: formatters.html.format(delta),
        ...assets,
    })
}

async function run(args) {
    cache = args.getCache()
    const {
        baseUrl,
        leftUrl,
        rightUrl,
        authLeft,
        authRight,
        force,
        format,
        output,
        ignoreArrayOrder,
    } = resolveConfig(args)

    const schemasLeft = await getSchemas(leftUrl, {
        baseUrl,
        auth: authLeft,
        force,
    })
    const schemasRight = await getSchemas(rightUrl, {
        baseUrl,
        auth: authRight,
        force,
    })
    //let [left, right] = await Promise.all([prom1, prom2])
    const { left, delta, meta } = diff(schemasLeft, schemasRight, {
        sortArrays: ignoreArrayOrder,
    })
    handleOutput(output, {
        format,
        left,
        delta,
        meta,
    })
}

const builder = yargs => {
    yargs
        .positional('leftUrl', {
            type: 'string',
            describe: `the url to the running DHIS2 server, should have schemas available relative to this at ${defaultOpts.schemasEndpoint}
            Can also be a JSON-file with schemas. See schema fetch`,
        })
        .positional('rightUrl', {
            type: 'string',
            describe: `the url to another running DHIS2 server, should have schemas available relative to this at ${defaultOpts.schemasEndpoint}
            Can also be a JSON-file with schemas. See "utils schema fetch"`,
        })
        .option('base-url', {
            alias: 'b',
            coerce: opt => utils.prependHttpsProtocol(opt),
            describe: `BaseUrl to use for downloading schemas. If this is set leftServer and rightServer should be relative to this url, eg. /dev.`,
            type: 'string',
        })
        .option('output', {
            alias: 'o',
            type: 'string',
            describe: `Specify the location of the output. If used as a flag a file relative to current working directory is generated with the name "LEFT-version_revision__RIGHT-version_revision.html".
            If the location is a directory, the default filename is used and output to location.`,
        })
        .option('format', {
            type: 'string',
            default: 'console',
            choices: ['html', 'json', 'console'],
            describe: `Specify the format of the output`,
        })
        .option('ignore-array-order', {
            type: 'boolean',
            default: false,
            describe:
                'Sort all nested arrays in schemas. The order of nested arrays are non-deterministic, which may clutter the diff. Enabling this will prevent most internal array moves, which are probably irrelevant anyway. ',
        })
}
module.exports = { builder, handler: run }
