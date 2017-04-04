'use strict';
let _ = require('lodash');

function makeErrorDeep (errorData, key) {
    const fields = _.keys(errorData);
    let deepErrors = {};
    for (let field of fields) {
        let val = errorData[field];
        if (_.isPlainObject(val)) {
            deepErrors[field] = makeErrorDeep(val, field);
        } else {
           return buildErrorPrototype(key, errorData)
        }
    }
    return deepErrors;
}

const baseErrorsDict = {
    invalidParams: {
        type: 'Invalid Params',
        message: 'Invalid params.',
        httpCode: 400,
        internalCode: 20,
    },
    notFound: {
        type: 'Not Found',
        message: 'Route not found.',
        httpCode: 404,
        internalCode: 50,
    },
    server: {
        type: 'Server Error',
        message: "Server Error.",
        httpCode: 500,
        internalCode: 1,
    },
    unauthorized: {
        type: 'Unauthorized',
        message: 'Token is invalid or expired',
        httpCode: 401,
        internalCode: 90,
    },
};

function addDetails (error, details) {
    error.details = details;
    return error;
}

function buildErrorPrototype(key, value) {

    let customError = new Function(`
        function ${key}(message, details) {
            this.name = '${key}';
            this.type = '${value.type}';
            this.message = message || '${value.message}';
            this.httpCode = '${value.httpCode}';
            this.internalCode = '${value.internalCode}';
            this.details = details || {};
        };
        ${key}.prototype = Object.create(Error.prototype);
        ${key}.prototype.constructor = ${key};
        return ${key};`);
    return customError();
}

let baseErrors = makeErrorDeep(baseErrorsDict);

module.exports = (context) => {
    var errors = _.merge({}, baseErrors, makeErrorDeep(context.errors()));
    return errors;
}

module.exports.baseErrors = baseErrors;
module.exports.addDetails = addDetails;
