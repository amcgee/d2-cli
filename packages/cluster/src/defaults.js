module.exports = {
    image: 'dhis2/core:{version}-latest-alpine',
    port: 8080,
    dockerComposeRepository:
        'https://github.com/amcgee/dhis2-backend/archive/master.tar.gz',
    demoDatabaseURL:
        'https://github.com/dhis2/dhis2-demo-db/blob/master/sierra-leone/{version}/dhis2-db-sierra-leone.sql.gz?raw=true',
}