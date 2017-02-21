'use strict';
const ajvIn = require('ajv')({
    v5: true,
    coerceTypes: true,
    removeAdditional: "all",
    useDefaults: true,
    format: 'full',
    formats: {
        "zipcode": /^\d{5}(-\d{4})?$/,
    },
});
const ajvOut = require('ajv')({
    v5: true,
    removeAdditional: "all",
    useDefaults: true,
    format: 'full',
    formats: {
        "zipcode": /^\d{5}(-\d{4})?$/,
    },
});
let _ = require('lodash');
let Promise = require('bluebird');
let logger = require('./logger');

function validator (ajv, schema, params) {
    let valid = null;
    try {
        valid = ajv.validate(schema, params);
    } finally {
        return !valid ? ajv.errorsText() : null;
    }
};

function formatError (error) {
    return {
        error: {
            code: error.httpCode,
            type: error.type,
            internalCode: error.internalCode,
            message: error.message,
            details: error.details,
        },
    };
}

function redactValues (dict, schema) {
    const redactList = _.chain(dict).transform((result, val, key) => {
        if (_.get(schema, `properties.${key}.private`, false)) {
            result.push(key);
        };
    }, []).flatten([ 'password' ]).value();

    return _.transform(_.keys(dict), function (result, n) {
        result[n] = _.indexOf(redactList, n) !== -1 ? 'REDACTED' : dict[n];
    }, {});
}

function cleanParamsAndCallModelFn (name, schema, params, fn, errors, req) {
    logger.info(name + " called with params:", redactValues(params, schema));

    const validationErrors = validator(ajvIn, schema, params);
    if (validationErrors) {
        logger.info(name + ' called with invalid params: ' + validationErrors);
        return Promise.reject(errors.addDetails(errors.invalidParams, validationErrors));
    }

    logger.info(name + " cleaned params:", redactValues(params, schema));

    let dataToReturn = null;
    // TODO write middleware and figure out what to pass through them
    return Promise.each(_.get(schema, 'middleware.before', []), (fn) => { return fn(params, req); })
    .then(() => Promise.try(() => fn(params, req)))
    .then((data) => {
        dataToReturn = data;
        return Promise.each(_.get(schema, 'middleware.after', []), (fn) => { return fn(params, req); });
    }).then(() => {
        const validationErrors = validator(ajvOut, schema.response, dataToReturn);
        if (validationErrors) {
            logger.info(name + ' response params are invalid: ' + validationErrors, dataToReturn);
            return Promise.reject(errors.addDetails(errors.server, validationErrors));
        }

        return dataToReturn
    });
}

module.exports = (context) => {
    const errors = context.errors;

    return {
        handler: (name, schema, fn) => {
            return (req, res) => {
                let params = _.extend(req.body, req.files, req.query, req.params);

                return cleanParamsAndCallModelFn(name, schema, params, fn, errors, req).then((result) => {
                    const meta = _.get(schema, 'response.meta');

                    return res.status(meta.code).json({
                        meta: meta,
                        response: result,
                    });
        		}).catch(function (err) {
                    if (_.get(err, 'code', _.get(err, 'httpCode', 500)) >= 500) {
                        logger.error(`SERVER ERROR => ${req.originalUrl}:`, _.get(err, 'stack', err));
                    } else {
                        logger.info(`CLIENT ERROR => ${req.originalUrl}:`, _.get(err, 'message', err));
                    }

                    return res.status(err.httpCode).json(formatError(_.get(err, 'internalCode') ? err : errors.server));
        		});
        	};
        },
        formatError: formatError,
    };
}
