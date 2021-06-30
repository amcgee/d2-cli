const fs = require('fs')
const path = require('path')
const { publishCommand } = require('@dhis2/cli-app-scripts')
const SemanticReleaseError = require('@semantic-release/error')
const semver = require('semver')

const { handler: publishAppHub } = publishCommand

exports.verifyConditions = (config, context) => {
    const { pkgRoot } = config
    const { env, nextRelease } = context

    const configPath = path.join(pkgRoot, 'd2.config.js')
    const packagePath = path.join(pkgRoot, 'package.json')

    if (!fs.existsSync(configPath)) {
        throw new SemanticReleaseError(
            `Failed to locate d2.config.js file, does it exist in ${pkgRoot}?`,
            'EMISSINGD2CONFIG',
            'd2.config.js is necessary to automatically publish to the App Hub'
        )
    }

    const d2Config = require(configPath)

    if (!fs.existsSync(packagePath)) {
        throw new SemanticReleaseError(
            `Failed to locate package.json file, does it exist in ${pkgRoot}?`,
            'EMISSINGPACKAGE',
            'package.json is necessary to automatically publish to the App Hub'
        )
    }

    const pkg = require(packagePath)

    if (semver.lt(pkg.version, nextRelease.version)) {
        throw new SemanticReleaseError(
            `Wrong version detected in ${packagePath}, expected ${nextRelease.version} but got ${pkg.version}.`,
            'EPACKAGEVERSION',
            'The version in package.json should be updated to the next release version before publishing.'
        )
    }

    if (d2Config.type === 'lib') {
        throw new SemanticReleaseError(
            'App Hub does not support publishing libraries.',
            'EAPPHUBSUPPORT',
            "The type in d2.config.js must not be 'lib'"
        )
    }

    if (!d2Config.id) {
        throw new SemanticReleaseError(
            "'id' field missing from d2.config.js",
            'EMISSINGAPPHUBID',
            'The App Hub application id must be defined in d2.config.js'
        )
    }

    if (!d2Config.minDHIS2Version) {
        throw new SemanticReleaseError(
            "'minDHIS2Version' field missing from d2.config.js",
            'EMISSINGMINDHIS2VERSION',
            'The minimum supported DHIS2 version must be defined in d2.config.js'
        )
    }

    if (!env.APP_HUB_TOKEN) {
        throw new SemanticReleaseError(
            'APP_HUB_TOKEN is missing from the environment',
            'EMISSINGAPPHUBTOKEN',
            'You need to supply the API token to the APP_HUB_TOKEN env var.'
        )
    }
}

// maybe we can use this step for release channels
// exports.addChannel = (config, context) => {}

exports.publish = async (config, context) => {
    const { pkgRoot, baseUrl, channel } = config
    const { env } = context

    await publishAppHub({
        cwd: pkgRoot,
        apikey: env.APP_HUB_TOKEN,
        baseUrl,
        channel,
    })
}

exports.success = (config, context) => {
    const { logger } = context

    logger.log('Published successfully to the App Hub')
}

exports.fail = (config, context) => {
    const { logger } = context

    logger.log('Published to the App Hub failed')
}