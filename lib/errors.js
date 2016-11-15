'use strict';
let _ = require('lodash');

function makeError (errorData) {
    let err = new Error(errorData.message);
    err.type = errorData.type;
    err.httpCode = errorData.httpCode;
    err.internalCode = errorData.internalCode;

    return err;
}

const baseErrors = {
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
module.exports = (context) => {
    const errors = _.merge({}, baseErrors, context.errors);

    return _.transform(errors, (result, value, key) => {
        result[key] = makeError(value);
    }, {});
}

module.exports.addDetails = (error, details) => {
    error.details = details;
    return error;
};
