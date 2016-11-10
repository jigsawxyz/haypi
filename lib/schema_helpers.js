'use strict';
let _ = require('lodash');
let path = require('path');
let logger = require('./logger');
let Router = require('express').Router;
let requestHandler = require('./request-handler');

let buildHeadersFromRoles = module.exports.buildHeadersFromRoles = (schema) => {
    _.forEach(_.keys(schema), function (key) {
        const roles = _.get(schema[key], 'roles');
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
                schema[key].headers = headers;

            } else if (_.indexOf(roles, 'unauthorized') !== -1 && roles.length > 1) {
                headers.properties.Authorization.description = 'Any user, authenticated or not.';
                schema[key].headers = headers;
            }
        }

        if (_.get(schema[key], 'rootUri')) { // if sub schema exists, go deeper!
            buildHeadersFromRoles(schema[key]);
        }
    });

    return schema;
};

let buildRouterFromSchema = module.exports.buildRouterFromSchema = (parentRouter, schema, model, parentSchema) => {
    let router = Router({ mergeParams: true });

    const schemaKeys = _.keys(_.omit(schema, [ 'resource', 'description', 'rootUri', 'properties', 'required' ]));

    _.forEach(schemaKeys, (key) => {
        let route = _.get(schema, key, {});

        if (route.rootUri) {
            buildRouterFromSchema(router, schema[key], model[key], schema);
        }
        // logger.debug(router)
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
                currentSchema.properties = _.merge(currentSchema.properties || { }, schema.properties);
                currentSchema.required = _.uniq(_.concat(currentSchema.required || [ ], _.keys(schema.properties)));
            }

            if (!currentSchema.type) {
                currentSchema.type = 'object';
            }

            logger.debug(`${route.method} ${uri} (${resourceName})`);
            //TODO add middleware after route.uri
            router[route.method.toLowerCase()](route.uri, requestHandler(`${resourceName}`, routeSchema, routeModel));
        }
    });

    if (schema.rootUri) {
        parentRouter.use(schema.rootUri, router);
    }

    return router;
}
