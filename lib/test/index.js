'use strict';
let Promise = require('bluebird');
let request = require('request-promise');
let Mocha = require('mocha');
let fs = require('fs');
let url = require('url');
let _ = require('lodash');
let path = require('path');

module.exports = (context) => {
    let testSuites = [];
    return {
        addToSuite: (testSuite) => {
            testSuites = _.flattenDeep([testSuites, testSuite]);
        },
        init: (testConfig) => {
            const config = _.merge({
                timeout: 5000,
                ui: 'exports',
                statusUrl: '',
            }, testConfig);

            console.log(config)

            let checkStatusOrNoop = config.statusUrl ? request.get : Promise.resolve;
            return checkStatusOrNoop(url.resolve(context.env.get('api:url'), config.statusUrl)).catch((res) => {
                context.logger.error(res.response.body);
                process.exit(9);
            }).then(() => {

                let mocha = new Mocha({
                    timeout: config.timeout,
                    ui: config.ui,
                });

                if (config.file) {
                    /* if filename is passed, only run on that tests on that file */
                    mocha.addFile(path.join(config.rootDirectory, config.file));
                } else {
                    for (let suite of testSuites) {
                        mocha.addFile(suite);
                    }

                    if (config.directories) {
                        for (var i=0; i < config.directories.length; i++) {
                            const testDir = path.join(config.rootDirectory, config.directories[i]);
                            fs.readdirSync(testDir).filter(function(file){
                                // Only keep the .js files
                                return file.substr(-3) === '.js';
                            }).forEach(function(file){ // jshint ignore:line
                                mocha.addFile(path.join(testDir, file));
                            });
                        }
                    }

                    if (config.files) {
                        for (var i=0; i < config.files.length; i++) {
                            mocha.addFile(path.join(config.rootDirectory, config.files[i]));
                        }
                    }
                }

                // Run the tests.
                mocha.run(function (failures) {
                    process.on('exit', function () {
                        console.error(failures)
                        process.exit(failures);  // exit with non-zero status if there were failures
                    });
                    process.exit(0);
                });
            }).catch(err => {
                 console.error(err)
                process.exit(9);
            });
        },
        helpers: require('./helpers')(context),
    }
}
