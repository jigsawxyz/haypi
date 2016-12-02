'use strict';
let ajv = require('ajv')({
    v5: true,
    coerceTypes: true,
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

function validator (schema, params) {
    var valid = ajv.validate(schema, params);
    return !valid ? ajv.errorsText() : null;
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

function errorResponse (res, error) {
    return res.status(error.httpCode).json(formatError(error));
}

function removeUnauthorizedProperties (data, schemaProps, userRoles) {
    const keys = _.keys(data);
    for (let i=0; i < keys.length; i++) {
        const key = keys[i];
        const val = schemaProps[key];
        if (_.get(val, 'roles') && _.intersection(userRoles, _.invokeMap(val.roles, String.prototype.toLowerCase)).length === 0) {
            _.unset(data, key);
        } else if (_.get(val, 'properties')) {
            removeUnauthorizedProperties(data[key], val.properties, userRoles);
        }
    }
}

function redactValues (dict, redactList) {
    redactList = redactList ? redactList : sensitiveParams;

    return _.transform(_.keys(dict), function (result, n) {
        result[n] = _.indexOf(redactList, n) !== -1 ? 'REDACTED' : dict[n];
    }, {});
}

const sensitiveParams = [ 'password' ];
function cleanParamsAndCallModelFn (name, schema, params, user, fn, options, errors, req) {
    logger.info(name + " called with params:", redactValues(params));

    let data = params;
    let validationErrors = validator(schema, data);

    if (validationErrors) {
        logger.info(name + ' called with invalid params: ' + validationErrors);
        return Promise.reject(errors.addDetails(errors.invalidParams, validationErrors));
    }

    removeUnauthorizedProperties(params, schema.properties, options.userRolesLowerCased);

    logger.info(name + " cleaned params:", redactValues(params));

    let dataToReturn = null;

    return Promise.each(_.get(schema, 'middleware.before', []), (fn) => { return fn; })
    .then(() => Promise.try(() => fn(params, req)))
    .then((data) => {
        dataToReturn = data;
        return Promise.each(_.get(schema, 'middleware.after', []), (fn) => { return fn; });
    }).then(() => dataToReturn);
}

function validateAndCleanResponse (params) {
    let response = params.response;
    const responseSchema = params.responseSchema;

    if (responseSchema.type) {
        const schemaErrors = validator(responseSchema, response);

        if (schemaErrors) {
            logger.error(`Response data:`, response);
            throw new Error(schemaErrors);
        }

        if (_.isArray(response)) {
            const arrayProperties = _.get(responseSchema, 'items.properties', null);
            if (arrayProperties) {
                _.forEach(response, (item) => {
                    removeUnauthorizedProperties(item, arrayProperties, params.userRoles);
                });
            }

        } else if (responseSchema.properties) {
            removeUnauthorizedProperties(response, responseSchema.properties, params.userRoles);
        }
    }

    return {
        meta: params.meta,
        response: response,
    };
}

module.exports = (context) => {
    const errors = context.errors;

    return {
        handler: (name, schema, fn) => {
            let options = {};
            return function (req, res) {
                let params = _.extend(req.body, req.files, req.query, req.params);
                let user = req.user;

                let userRolesLowerCased = _.invokeMap(_.get(user, 'roles', []), String.prototype.toLowerCase);
                options.userRolesLowerCased = userRolesLowerCased;

                const schemaRolesLowerCased = _.invokeMap(_.get(schema, 'roles', []), String.prototype.toLowerCase);

                if (!user) {
                    /* when all schemas have roles, the first check can be changed out with a throw above this, to enforce defining roles */
                    if (schema.roles && _.indexOf(schema.roles, 'unauthorized') === -1) {
                        return errorResponse(res, newErrors.unauthorized);
                    }
                } else {
                    user.isAdmin = _.indexOf(userRolesLowerCased, 'admin') !== -1;
                    user.isCurrentUserOrAdmin = user.isAdmin;

                    if (_.get(req, 'params.userId') === user.id) {
                        user.roles.push('currentuser');
                        userRolesLowerCased.push('currentuser');
                        user.isCurrentUser = true;
                        user.isCurrentUserOrAdmin = true;
                    }

                    if (schemaRolesLowerCased.length && _.indexOf(schemaRolesLowerCased, 'unauthorized') === -1 && _.intersection(schemaRolesLowerCased, userRolesLowerCased).length === 0) {
                        return errorResponse(res, newErrors.unauthorized);
                    }
                }

                return cleanParamsAndCallModelFn(name, schema, params, user, fn, options, errors, req).then((result) => {
                    let meta = _.get(options, 'meta', { code: 200 });

                    meta.code = _.get(schema, 'response.status.code', meta.code);
                    if (context.env.get('frontend')) {
                        return res.status(meta.code).json({
                            meta: meta,
                            response: result,
                        });
                    } else {
                        return res.status(meta.code).json(validateAndCleanResponse({
                            response: result,
                            responseSchema: _.get(schema, 'response', {}),
                            userRoles: userRolesLowerCased,
                            meta: meta,
                        }));
                    }
        		}).catch(function (err) {
                    if (_.get(err, 'code', _.get(err, 'httpCode', 500)) >= 500) {
                        logger.error(`SERVER ERROR => ${req.originalUrl}:`, _.get(err, 'stack', err));
                    } else {
                        logger.info(`CLIENT ERROR => ${req.originalUrl}:`, _.get(err, 'message', err));
                    }

                    return errorResponse(res, _.get(err, 'internalCode') ? err : errors.server);
        		});
        	};
        },
        formatError: formatError,
    };
}
