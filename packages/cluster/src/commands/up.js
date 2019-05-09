const chalk = require('chalk')
const path = require('path')
const { readFileSync, writeFileSync } = require('fs')
const { reporter, exec, tryCatchAsync } = require('@dhis2/cli-helpers-engine')
const {
    initDockerComposeCache,
    makeComposeProject,
    makeDockerImage,
} = require('../common')
const { seed: doSeed } = require('../db')

const run = async function({
    v,
    port,
    seed,
    seedFile,
    update,
    context,
    ...argv
}) {
    const cacheLocation = await initDockerComposeCache({
        cache: argv.getCache(),
        dockerComposeRepository: argv.cluster.dockerComposeRepository,
        force: update,
    })

    if (!cacheLocation) {
        reporter.error('Failed to initialize cache...')
        process.exit(1)
    }

    if (seed || seedFile) {
        await doSeed({ cacheLocation, v, path: seedFile, update, ...argv })
    }

    let contextPath = ''
    if (context) {
        contextPath = `<Context path="/${context}" docBase="ROOT/" />`
    }

    try {
        reporter.info(`Setting Tomcat context path to ${chalk.cyan(context)}`)
        const serverxml = readFileSync(
            path.join(cacheLocation, 'config', 'tomcat-server.xml')
        ).replace('{REPLACE_WITH_CONTEXT}', contextPath)

        writeFileSync(
            path.join(cacheLocation, 'config', 'tomcat-server.xml'),
            serverxml
        )
    } catch (e) {
        reporter.error('Failed to modifiy server.xml', e)
        process.exit(1)
    }

    reporter.info(`Spinning up cluster version ${chalk.cyan(v)}`)
    const res = await tryCatchAsync(
        'exec(docker-compose)',
        exec({
            cmd: 'docker-compose',
            args: [
                '-p',
                makeComposeProject(v),
                '-f',
                path.join(cacheLocation, 'docker-compose.yml'),
                'up',
                '-d',
            ],
            env: {
                DHIS2_CORE_TAG: makeDockerImage(v),
                DHIS2_CORE_PORT: port,
            },
            pipe: true,
        })
    )
    if (res.err) {
        reporter.error('Failed to spin up cluster docker-compose cluster')
        process.exit(1)
    }
}

module.exports = {
    command: 'up <v>',
    desc: 'Spin up a new cluster',
    aliases: 'u',
    builder: {
        context: {
            alias: 'c',
            desc: 'Set the Tomcat context path',
            type: 'string',
            default: '',
        },
        port: {
            alias: 'p',
            desc: 'Specify the port on which to expose the DHIS2 instance',
            type: 'integer',
            default: 8080,
        },
        seed: {
            alias: 's',
            desc: 'Seed the detabase from a sql dump',
            type: 'boolean',
            default: false,
        },
        seedFile: {
            desc:
                'The location of the sql dump to use when seeding that database',
            type: 'string',
        },
        update: {
            alias: 'u',
            desc: 'Indicate that d2 cluster should re-download cached files',
            type: 'boolean',
            default: false,
        },
    },
    handler: run,
}
