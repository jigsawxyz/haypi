'use strict';
let _ = require('lodash');
let path = require('path');
let logger = require('./logger');
let Router = require('express').Router;

module.exports = (context) => {
    let requestHandler = require('./requestHandler')(context);

    let schemaHelpers = {
        formatSchemaForDocs: (schema) => {
            const propsToInject = _.get(schema, 'properties');
            _.unset(schema, 'properties');

            _.forEach(_.keys(schema), function (key) {
                let val = schema[key];

                if (propsToInject && _.get(val, 'properties')) {
                    _.assign(val.properties, propsToInject);
                    val.required = _.uniq(_.concat(val.required || [], _.keys(propsToInject)));
                }

                const roles = _.get(val, 'roles');
                if (roles) {
                    let headers = {
                        type: "object",
                        properties: {
                            Authorization: { type: "string" },
                        },
                    };

                    if (_.indexOf(roles, 'unauthorized') === -1) {
                        headers.properties.Authorization.description = roles.length ? 'Allowed roles: ' + roles.join(', ') : 'Any authenticated user';
                        headers.properties.Authorization.required = true;
                        val.headers = headers;

                    } else if (_.indexOf(roles, 'unauthorized') !== -1 && roles.length > 1) {
                        headers.properties.Authorization.description = 'Any user, authenticated or not.';
                        val.headers = headers;
                    }
                }
                const routeErrors = _.get(val, 'response.errors');
                if (routeErrors) {
                    val.response = val.response || {};
                    val.response.examples = val.response.examples || [];

                    _.forEach(routeErrors, (err) => {
                        if (_.difference([ 'type', 'message', 'httpCode', 'internalCode' ], _.keys(err)).length > 0) {
                            throw new Error(`Invalid response error in schema ${schema.resource}/${val.name}, error => ${_.get(err, 'message', err)}`)
                        }
                        val.response.examples.push({
                            status: {
                                type: err.type,
                                code: err.httpCode,
                            },
                            properties: requestHandler.formatError(err),
                        });
                    });
                }
                if (_.get(val, 'rootUri')) { // if sub schema exists, go deeper!
                    schemaHelpers.formatSchemaForDocs(val);
                }
            });

            return schema;
        },
        buildRouterFromSchema: (parentRouter, schema, model, parentSchema) => {
            let router = Router({ mergeParams: true });

            const schemaKeys = _.keys(_.omit(schema, [ 'resource', 'description', 'rootUri', 'properties', 'required' ]));

            _.forEach(schemaKeys, (key) => {
                const route = _.get(schema, key, {});

                if (route.rootUri) {
                    schemaHelpers.buildRouterFromSchema(router, schema[key], model[key], schema);
                }

                if (route.uri && route.method) {
                    const routeSchema = _.get(schema, key);
                    const routeModel = _.get(model, key);

                    if (!routeSchema || !routeModel) {
                        throw new Error(`Schema and model keys must match route name for ${key}!`);
                    }

                    const resourceName = `${schema.resource}/${key}`;
                    let uri = path.join(_.get(schema, 'rootUri', ''), route.uri);

                    if (parentSchema) {
                        uri = path.join(_.get(parentSchema, 'rootUri', ''), uri);
                    }

                    let currentSchema = schema[key];

                    if (schema.properties) {
                        currentSchema.properties = _.merge(currentSchema.properties || {}, schema.properties);
                        currentSchema.required = _.uniq(_.concat(currentSchema.required || [], _.keys(schema.properties)));
                    }

                    if (!currentSchema.type) {
                        currentSchema.type = 'object';
                    }

                    //TODO add middleware after route.uri
                    router[route.method.toLowerCase()](route.uri, requestHandler.handler(`${resourceName}`, routeSchema, routeModel));
                }
            });

            if (schema.rootUri) {
                parentRouter.use(schema.rootUri, router);
            }

            return router;
        },
    };

    return schemaHelpers;
};
