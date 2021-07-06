# Introduction

`d2 cluster` helps you spin up a DHIS2 instance using containers ([Docker](https://www.docker.com))

# Usage

While you can install and run `d2-cluster` from `@dhis2/cli-cluster`,
the preferred entrypoint is the root `d2` CLI. To install the `d2` CLI:

```bash
yarn global add @dhis2/cli
d2 cluster --help
```

Depending on your installation method, the following examples which use
`d2 cluster` may need to be modified to use `d2-cluster`, or `npx @dhis2/cli-cluster`.

For consistency we will use `d2 cluster`.

# Common concepts

## Release channels

DHIS2 has several release channels, such as **dev** and **stable**.

To each channel several artifacts can be published, so the **stable**
channel contains all the stable releases of DHIS2, such as 2.32.0,
2.32.1, etc.

The **dev** channel is the latest build straight from the development
branches. There is one development branch per supported release of
DHIS2.

For our Docker images, that means that we have one repo on Docker Hub
per channel:

-   Stable: https://hub.docker.com/r/dhis2/core
-   Dev: https://hub.docker.com/r/dhis2/core-dev

## Tags

Within each Docker repo, we have multiple tags. The channel coupled with
the tag uniquely identifies a built DHIS2 Docker image. This is
important for how the `cluster` command works.

For the **stable channel** each tag represents a formally released version
of DHIS2.

-   [2.32.0](https://github.com/dhis2/dhis2-core/tree/2.32.0)
-   [2.31.3](https://github.com/dhis2/dhis2-core/tree/2.31.3)

For the **dev channel**, each tag represents the last build from the
development branches in
[dhis2/dhis2-core](https://github.com/dhis2/dhis2-core):

-   [master](https://github.com/dhis2/dhis2-core/tree/master)
-   [2.32](https://github.com/dhis2/dhis2-core/tree/2.32)
-   [2.31](https://github.com/dhis2/dhis2-core/tree/2.31)
-   [2.30](https://github.com/dhis2/dhis2-core/tree/2.30)

## Database dumps

For development DHIS2 provides a [set of database
dumps](https://github.com/dhis2/dhis2-demo-db) which are essential in
getting a usable environment up and running quickly.

Most often we use the [Sierra
Leone](https://github.com/dhis2/dhis2-demo-db/tree/master/sierra-leone)
dumps.

# Usage

## Getting help

Remember that the help is your friend:

```bash
d2 cluster --help
```

## Command layout

There are two arguments that are always required for the `cluster` to
command to be able to do anything at all: `{command}` and `{name}`.

```bash
d2 cluster {command} {name}
```

The command refers to an action, like `up` or `down` (see below for more information and examples) and the name is the
name of the cluster to operate on, which can be anything you like, like
`mydev`, `superfly`, or `2.32`.

### Command `up`

This command spins up a new cluster: 

```bash
d2 cluster up {name}
```

### Command `down`

This command destroys a running container: 

```bash
d2 cluster down {name}
```

#### Command `down --clean`

This command destroys all data volumes as well as ephemeral containers: 

```bash
d2 cluster down {name} --clean 
```

## Arguments

In addition to the command and name, there are more arguments you can
pass to `cluster` to customize your environment. If the arguments are
omitted there is some fallback logic, so even if they are not used, they
are important to know about.

-   `--channel`: This matches to the Docker Hub repository mentioned above
    in [Release channels](#release-channels). E.g. `dev`.

-   `--dhis2-version`: This matches to the [tag name within a Docker
    Hub repo](#tags). E.g.
    [`2.32`](https://hub.docker.com/r/dhis2/core-dev/tags)

-   `--db-version`: This matches to the database dumps mentioned in
    [Database dumps](#database-dumps). E.g. `dev` or `2.32`.

So through a combination of these arguments: `channel`, `dhis2-version`,
and `db-version` we can spin up a cluster.

# Configuration

## Cached configuration

To avoid having to pass in all arguments over and over when using the
`up` and `down` commands often, the `cluster` command caches your
configuration per cluster in a `config.json` file.

```bash
d2 debug cache list cluster/2.32.0
┌────────────────┬──────┬─────────────────────┐
│ Name           │ Size │ Modified            │
├────────────────┼──────┼─────────────────────┤
│ config.json    │ 171  │ 2019-06-06 11:07:37 │
├────────────────┼──────┼─────────────────────┤
│ docker-compose │ 512  │ 2019-06-06 11:07:32 │
└────────────────┴──────┴─────────────────────┘
```

And it looks like this:

```bash
cat ~/.cache/d2/cache/cluster/2.32.0/config.json
{
    "channel": "dev",
    "dbVersion": "2.32",
    "dhis2Version": "2.32.0",
    "customContext": false,
    "image": "dhis2/core{channel}:{version}",
    "port": 8080
}
```

This means that if you run a command sequence like:

```bash
d2 cluster up superfly \
    --db-version 2.31 \
    --dhis2-version master \
    --seed \
    --custom-context \
    --port 9999 \
    --channel dev

d2 cluster down superfly

d2 cluster up superfly
```

The second time you run `up superfly` it will use the configuration from
the first run:

```bash
cat ~/.cache/d2/cache/cluster/superfly/config.json
{
    "channel": "dev",
    "dbVersion": "2.31",
    "dhis2Version": "master",
    "customContext": true,
    "image": "dhis2/core{channel}:{version}",
    "port": "9999"
}
```

This config file is automatically purged when you run `down --clean`.

To manually purge the `config.json` file you can use:

```bash
d2 debug cache purge clusters/superfly/config.json
? Are you sure you want to remove cache item "clusters/superfly/config.json"? Yes
Purged cache item clusters/superfly/config.json
```

## Persistent configuration

It is also possible to set up your clusters in the `d2` configuration
file, e.g. `~/.config/d2/config.js`:

```js
module.exports = {
    cluster: {
        channel: 'stable',
        clusters: {
            superfly: {
                channel: 'dev',
                dbVersion: '2.31',
                dhis2Version: 'master',
                customContext: true,
                image: 'dhis2/core{channel}:{version}',
                port: 9999,
            },
        },
    },
}
```

```bash
d2 cluster up superfly

# saves the configuration to `config.json`
cat ~/.cache/d2/cache/cluster/superfly/config.json
{
    "channel": "dev",
    "dbVersion": "2.31",
    "dhis2Version": "master",
    "customContext": true,
    "image": "dhis2/core{channel}:{version}",
    "port": 9999
}
```

From here it's possible to override the configuration file properties
for a cluster as well:

```
# port is 9999 in ~/.config/d2/config.js:clusters.superfly.port
d2 cluster up superfly --port 8888

# port is saved as 8888 in ~/.cache/d2/cache/cluster/superfly/config.json:port
```

Now for each subsequence `down` and `up` command, the cached config will
take priority over the persistent configuration. When you clear the
cache, the persistent configuration will come into effect again.
