'use strict';
let _ = require('lodash');

function makeError (errorData) {
    let err = new Error(errorData.message);
    err.httpCode = errorData.httpCode;
    err.internalCode = errorData.internalCode;

    return err;
}

module.exports = _.transform({
    invalidParams: {
        message: 'Invalid params.',
        httpCode: 400,
        internalCode: 20,
    },
    notFound: {
        message: 'Route not found.',
        httpCode: 404,
        internalCode: 50,
    },
    server: {
        message: "Server Error.",
        httpCode: 500,
        internalCode: 1,
    },
    unauthorized: {
        message: 'Token is invalid or expired',
        httpCode: 401,
        internalCode: 90,
    },
}, (result, value, key) => {
    result[key] = makeError(value);
}, {});

module.exports.addDetails = (error, details) => {
    error.details = details;
    return error;
};
