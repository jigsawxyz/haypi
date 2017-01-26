'use strict';
let fs = require('fs');
let path = require('path');
let _ = require('lodash');
let addDetails = require('./errors').addDetails;
const baseErrors = require('./errors').baseErrors;

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

/* This is my current standard for the format of data on a GET for a list.
Make it whatever you like/let me know what you think is missing, so that we can make it better <3 */
module.exports.getListSchema = (schema) => {
    return {
        type: 'object',
        properties: _.merge({
            limit: { type: 'integer', minimum: 0, default: 100 },
            offset: { type: 'integer', minimum: 0, default: 0 },
        }, schema),
    };
}
/* I don't put the id of the resource in interfaces, so when I need the idea in conjunction with the
`in` model, i wrap it in this function and pass in the id value (e.g. 'personId') */
module.exports.buildIdSchema = (fieldName) => {
    let obj = {
        type: 'object',
        properties: {},
        required: [ fieldName ],
    };
    obj.properties[fieldName] = { type: 'string', format: 'uuid' };

    return obj;
}
/* same idea, but opposite functionality with this function  */
module.exports.formatForCreate = (params) => {
    let data = _.cloneDeep(params);

    _.unset(data.in.properties, 'id');
    _.pull(data.in.required, 'id');

    return data;
}
/* fn for making interfaces for routes consistent and easy
it takes args in this format {
    params: { route defn },
    headers: { your headers in json schema format },
    interface: { in: `data defn coming in`, out: `data defn coming out` } <- this matches very will with defining interfaces in the way i did
    response: the uncalled fn from responses below. it gets called with the out schema from interface
    errors: a list of errors for documentation
}
*/
module.exports.makeInterface = (params) => {
    return _.assign(
        params.params,
        { headers: params.headers },
        _.get(params.interface, 'in', { type: 'object', properties: {} }),
        { response: _.assign({ errors: params.errors }, params.response(params.interface.out)) }
    );
}
/* omits properties from both the properties: {} and required: [] */
module.exports.omitProps = (params, propsToOmit) => {
    /* use this to remove the prop from both `properties` and `required`. NOTE does not go deep */
    let obj = _.cloneDeep(params);

    for (let prop of propsToOmit) {
        const key = `properties.${prop}`;

        if (_.get(obj, key)) {
            _.unset(obj, key);
            _.pull(obj.required, prop);
        }
    }

    return obj;
}
