# D2 CLI

A unified CLI for DHIS2 development workflows.

[![npm](https://img.shields.io/npm/v/@dhis2/cli.svg)](https://www.npmjs.com/package/@dhis2/cli) [![Greenkeeper badge](https://badges.greenkeeper.io/dhis2/cli.svg)](https://greenkeeper.io/)

## Installation

The CLI can be installed globally with `npm` or `yarn` as follows:

```sh
> yarn global add @dhis2/cli
OR
> npm install --global @dhis2/cli
```

You can also run the CLI ad-hoc with `npx`, no installation necessary (sacrifices startup performance):

```
> npx @dhis2/cli app create
```

## Usage

```sh
> d2 --help
d2 <command>

Commands:
  d2 debug     Debug local d2 installation
  d2 app       Manage DHIS2 applications                            [aliases: a]
  d2 cluster   Manage DHIS2 Docker clusters                         [aliases: c]
  d2 packages  Manage DHIS2 packages                              [aliases: pkg]
  d2 style     Enforce DHIS2 code- and commit-style conventions     [aliases: s]

Options:
  --version   Show version number                                      [boolean]
  --config    Path to JSON config file
  -h, --help  Show help                                                [boolean]
```

## Examples

Bootstrap a new DHIS2 application

```sh
> d2 app create
```

Spin up a DHIS2 server installation on port 8082 (requires [Docker](https://www.docker.com/products/docker-desktop))

```sh
> d2 cluster up 2.31-rc1-alpine --port 8082
```

## Features & v1.0 Roadmap

-   [x] Heirarchical command namespaces (`d2`, `d2 app`, `d2 app scripts` etc.)
-   [x] Programmatic and command-line entrypoints at any command level
-   Configurability through:
    -   [x] command-line (`--verbose=true`)
    -   [x] custom file (`--config=.myd2rc`)
    -   [x] package.json (`"d2": { "verbose": true }`)
    -   [x] environment variables (`D2_VERBOSE=true`)
    -   [ ] find-up .rc files
    -   [ ] globally-installed user config (`~/.config/d2` or `~/.cache/d2`)
-   [ ] more performant config/cache initialization (they currently cause a slight startup lag)
-   [ ] Namespaced configuration (i.e. { config: { verbose: true } } instead of { verbose: true }
-   [x] A user-level file cache (located at `~/.cache/d2`) and abstract caching mechanism for use in various commands.
-   [x] Meta/debug command namespace for:
    -   Cache inspection `d2 debug cache`, i.e. `d2 debug cache list`
    -   Config printing `d2 debug config`
    -   System diagnostics `d2 debug system`
-   [x] Automatic update checks with [update-notifier](https://npmjs.com/package/update-notifier) (updates checked at most 1x per day)
-   [x] Basic DHIS2 Docker cluster management with `d2 cluster`
-   [x] Incorporate [packages](https://github.com/dhis2/packages) as a command module
    -   [x] Link to updated [packages](https://github.com/dhis2/packages) using cli engine
-   [ ] Implement `create-d2-app` and `d2-app-scripts` for application creation
-   [ ] Integrate the legacy [`dhis2-cli`](https://www.npmjs.com/package/dhis2-cli) UUID generation functionality ([source](https://github.com/dhis2/dhis2-cli))
-   Implement
    -   [ ] unit tests
    -   [ ] integration / smoke tests
    -   [x] `code-style`
      -    [ ] Switch to verb-form command
    -   [x] `commit-style`
      -    [ ] Switch to verb-form command
    -   [x] Travis CI
    -   [x] CI deploy to NPM
-   [ ] Build standalone packaged executables with [pkg](https://www.npmjs.com/package/pkg)
-   [ ] Add individual package READMEs for better NPM optics
-   [ ] Confirm Greenkeeper functionality (add greenkeeper.json for monorepo awareness)
-   [ ] Confirm that update notifications work well
-   [ ] Cut version 1.0 with baseline feature set and semantic versioning guarantee

### Bonus features

-   [x] Consider mono-repo or poly-repo for code sharing (particularly sharing `cliUtils`)
-   [ ] Consider using typescript for better static analysis
