'use strict';
let jsf = require('json-schema-faker');
let _ = require('lodash');

jsf.format('uuid', function (gen) {
    return gen.chance.guid();
});

function unsetDeep (schema, dict) {
    _.forEach(_.keys(dict), (key) => {
        if (_.isObject(dict[key])) {
            unsetDeep(_.get(schema, `${key}.properties`), dict[key]);
        } else {
            _.unset(schema, key);
        }
    });
}

module.exports = (params) => {
    params = params || {};

    if (params.omit === true) {
        return params.data;
    }
    if (params.schema) {
        /* don't generate data for omitted params */
        _.forEach(params.omit, (param) => {
            _.unset(params.schema.properties, param);
        });

        /* i made this fn so that faker can still fill in props that we don't specify in nested objects */
        unsetDeep(params.schema.properties, params.data);

        return _.assign(jsf(params.schema), params.data);
    } else {
        return params.data;
    }
};
