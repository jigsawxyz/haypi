'use strict';
let fs = require('fs');
let path = require('path');
let _ = require('lodash');

let requireFiles = module.exports.requireFiles = (rootDirectory, fns, currentDirectory) => {
    fns = fns || {};
    const fullDirectory = path.join(rootDirectory, currentDirectory || '');
    const filesToRequire = fs.readdirSync(fullDirectory);

    let subResources = [];

    for (let i=0; i < filesToRequire.length; i++) {
        const filename = filesToRequire[i];
        const filePath = path.join(fullDirectory, filename);

        if (filename.substring(filename.length-3) !== '.js') { // if a folder, recurse
            fns[filename] = requireFiles(fullDirectory, {}, filename)
        } else if (filename === 'index.js' && currentDirectory) {
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
