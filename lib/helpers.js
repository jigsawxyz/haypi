'use strict';
let fs = require('fs');
let path = require('path');
let _ = require('lodash');

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

            if (filename.substring(filename.length-3) !== '.js') { // if a folder, recurse
                fns[filename] = requireFiles(fullDir, {}, filename)
            } else if (filename === 'index.js' && currentDir) {
                _.merge(fns, require(filePath));
            } else if (filename !== 'index.js') {
                subResources.push({ filePath: filePath, filename: filename });
            }
        }
        /* doing this after the first loop so that subresources are included after the first level resources */
        for (let i=0; i < subResources.length; i++) {
            const subResource = subResources[i];
            fns[subResource.filename.replace('.js', '')] = require(subResource.filePath);
        }
        return fns;
    }
};

let readDirDeep = module.exports.readDirDeep = (dir, files, recursed) => {
    const contents = fs.readdirSync(dir);

    for (let filename of contents) {
        if (filename.substring(filename.length-3, filename.length) !== '.js') {
            readDirDeep(path.join(dir, filename), files, true);
        } else if (recursed || filename !== 'index.js') {
            files.push(path.join(dir, filename));
        }
    }

    return files;
};

let injectParamIntoAllDirFiles = module.exports.injectParamIntoAllDirFiles = (dir, param, objToExport, recursed) => {
    const contents = fs.readdirSync(dir);

    for (let filename of contents) {
        const fullPath = path.join(dir, filename);

        if (filename.substring(filename.length-3, filename.length) !== '.js') {
            injectParamIntoAllDirFiles(fullPath, param, objToExport, true);
        } else if (recursed || filename !== 'index.js') {
            objToExport[filename.substring(0, filename.length-3)] = require(fullPath)(param);
        }
    }

    return objToExport;
};
