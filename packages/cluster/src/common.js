const path = require('path')
const fs = require('fs')

const { Cache, reporter } = require('@dhis2/cli-helpers-engine')

const defaults = require('./defaults')

const clusterDir ='clusters'
const dockerComposeCacheName = 'docker-compose'
const cacheFile = 'config.json'

module.exports.initDockerComposeCache = async ({
    composeProjectName,
    cache,
    dockerComposeRepository,
    dockerComposeDirectory,
    force,
}) => {
    const cachePath = path.join(
        clusterDir,
        composeProjectName,
        dockerComposeCacheName,
        dockerComposeDirectory
    )

    const exists = await cache.exists(cachePath)

    if (exists && !force) {
        reporter.debug(
            'Skipping docker compose repo initialization, found cached dir'
        )
    } else {
        reporter.info('Initializing Docker Compose repository...')

        try {

            const repoDir = await cache.get(
                dockerComposeRepository,
                dockerComposeCacheName,
                {
                    force: true,
                }
            )

            const created = await cache.exists(cachePath)

            if (created) {
                reporter.debug(`Cache created at: ${cachePath}`)
            }
        } catch (e) {
            reporter.error('Initialization failed!')
            return null
        }
    }

    return cache.getCacheLocation(cachePath)
}

module.exports.substituteVersion = (string, version) =>
    replacer(string, 'version', version)

function makeDockerImage(string = '', substitutes = {}, variant = '') {
    let res = string

    // the stable channel is just dhis2/core, so if the channel is
    // unspecified or 'stable', we should just strip it out from the
    // image tag
    if (!substitutes.channel || substitutes.channel === 'stable') {
        res = replacer(res, 'channel', '')
    }

    for (const token in substitutes) {
        const value =
            token === 'channel'
                ? `-${substitutes[token]}` // add a leading '-' to channel
                : substitutes[token]

        res = replacer(res, token, value)
    }

    if (variant) {
        res = `${res}-${variant}`
    }
    return res
}

function replacer(string, token, value) {
    const regexp = new RegExp(`{${token}}`, 'g')
    return string.replace(regexp, value)
}

async function resolveConfiguration(argv = {}) {
    const file = path.join(clusterDir, argv.name, cacheFile)

    const currentCache = JSON.parse(await argv.getCache().read(file))

    let currentConfig
    if (argv.cluster && argv.cluster.clusters) {
        currentConfig = argv.cluster.clusters[argv.name]
    }

    const cache = Object.assign({}, currentConfig, currentCache)

    const config = argv.cluster
    const args = argv

    const resolved = Object.assign({}, defaults, config, cache, args)

    // resolve specials...
    resolved.dhis2Version = resolved.dhis2Version || resolved.name
    resolved.dbVersion = resolved.dbVersion || resolved.dhis2Version
    resolved.contextPath = resolved.customContext ? `/${resolved.name}` : ''

    resolved.dockerImage = makeDockerImage(
        resolved.image,
        {
            channel: resolved.channel,
            version: resolved.dhis2Version,
        },
        resolved.variant
    )

    reporter.debug('Resolved configuration\n', resolved)

    await argv.getCache().write(
        file,
        JSON.stringify(
            {
                channel: resolved.channel,
                dbVersion: resolved.dbVersion,
                dhis2Version: resolved.dhis2Version,
                customContext: resolved.customContext,
                image: resolved.image,
                port: resolved.port,
            },
            null,
            4
        )
    )

    return resolved
}

module.exports.cleanCache = async argv =>
    await argv.getCache().purge(path.join(clusterDir, argv.name))

module.exports.makeEnvironment = cfg => {
    const env = {
        DHIS2_CORE_NAME: cfg.name,
        DHIS2_CORE_IMAGE: cfg.dockerImage,
        DHIS2_CORE_CONTEXT_PATH: cfg.contextPath,
        DHIS2_CORE_VERSION: cfg.dhis2Version,
        DHIS2_CORE_DB_VERSION: cfg.dbVersion,
        DHIS2_CORE_PORT: cfg.port,
    }

    reporter.debug('Runtime environment\n', env)

    return env
}

module.exports.getLocalClusters = async () => {}

module.exports.makeDockerImage = makeDockerImage
module.exports.resolveConfiguration = resolveConfiguration
