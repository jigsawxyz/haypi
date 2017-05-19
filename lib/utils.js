'use strict';
let fs = require('fs');
let path = require('path');
let _ = require('lodash');
let addDetails = require('./errors').addDetails;
const errors = require('./errors');
const baseErrors = require('./errors').baseErrors;
const Promise = require('bluebird');

module.exports.requireFiles = (dir) => {
    return function requireFiles (rootDir, fns, currentDir) {
        rootDir = rootDir || dir;
        fns = fns || {};
        const fullDir = path.join(rootDir, currentDir || '');
        const filesToRequire = fs.readdirSync(fullDir);

        let subResources = [];

        for (let i=0; i < filesToRequire.length; i++) {
            const filename = filesToRequire[i];
            const filePath = path.join(fullDir, filename);

            try {
                if (filename.substring(filename.length-3) !== '.js') { // if a folder, recurse
                    fns[filename] = requireFiles(fullDir, {}, filename)
                } else if (filename === 'index.js' && currentDir) {
                    _.merge(fns, require(filePath));
                } else if (filename !== 'index.js') {
                    subResources.push({ filePath: filePath, filename: filename });
                }
                /* doing this after the first loop so that subresources are included after the first level resources */
                for (let i=0; i < subResources.length; i++) {
                    const subResource = subResources[i];
                    fns[subResource.filename.replace('.js', '')] = require(subResource.filePath);
                }
            } catch (err) {
                err.message = `${filePath}: ${err.message}`;
                throw err;
            }
        }
        return fns;
    }
};

let readDirDeep = module.exports.readDirDeep = (dir, files, recursed) => {
    const contents = fs.readdirSync(dir);

    for (let filename of contents) {
        const filePath = path.join(dir, filename);

        if (filename.substring(filename.length-3, filename.length) !== '.js') {
            try {
                readDirDeep(filePath, files, true);
            } catch(err) {
                err.message = `${filePath}: ${err.message}`;
                throw err;
            }
        } else if (recursed || filename !== 'index.js') {
            files.push(filePath);
        }
    }

    return files;
};

let injectParamIntoAllDirFiles = module.exports.injectParamIntoAllDirFiles = (dir, param, objToExport, recursed) => {
    const contents = fs.readdirSync(dir);

    for (let filename of contents) {
        const fullPath = path.join(dir, filename);

        try {
            if (filename.substring(filename.length-3, filename.length) !== '.js') {
                injectParamIntoAllDirFiles(fullPath, param, objToExport, true);
            } else if (recursed || filename !== 'index.js') {
                objToExport[filename.substring(0, filename.length-3)] = require(fullPath)(param);
            }
        } catch(err) {
            err.message = `${fullPath}: ${err.message}`;
            throw err
        }
    }

    return objToExport;
};

module.exports.makeInterface = (params) => {
    return _.assign(
        params.params,
        {middleware: _.get(params, "middleware", {before: [], after: []})},
        _.get(params.interface, 'in', { type: 'object', properties: {} }),
        { response: _.assign({ errors: params.errors }, params.response(params.interface.out)) }
    );
}

module.exports.registerTasks = (taskPromiseArr, fns) => {
    return function taskRunner(){
        return taskPromiseArr.reduce((acc, val) => {
            return acc.then(function(){
                if(!val.precheck || typeof val.precheck != "function"){
                    val.precheck = function(){ return Promise.resolve(false) };
                }
                if(!val.complete || typeof val.complete != "function"){
                    val.complete = function(){ return Promise.resolve(false) };
                }
                let taskName = val.name || val.task.name;
                return val.precheck()
                .catch(err => {
                    throw new baseErrors.taskPrecheckError(err.message, err)
                })
                .then(alreadyPerformed => {
                    if(alreadyPerformed == true){
                        console.log(`Task ${taskName} already performed, skipping...`)
                        return Promise.resolve(true);
                    } else {
                        console.log(`Running task ${taskName}...`)
                        return val.task()
                        .catch(err => {
                            throw new baseErrors.taskRunError(err.message, err)
                        })
                    }
                })
                .then(() => {
                    return val.complete()
                    .catch(err => {
                        throw new baseErrors.taskCompleteError(err.message, err)
                    })
                })
                .catch(baseErrors.taskPrecheckError, err => {
                    console.log("Error on task precheck");
                    console.log(err)
                })
                .catch(baseErrors.taskRunError, err => {
                    console.log("Error on task run");
                    console.log(err)
                })
                .catch(baseErrors.taskCompleteError, err => {
                    console.log("Error on task complete");
                    console.log(err)
                })
                .catch(err => {
                    console.log(err)
                })

            })
        }, Promise.resolve(true))
        .then(function(){
            console.log("All tasks complete.")
        })
    }
}