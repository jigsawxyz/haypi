'use strict';
let _ = require('lodash');
/* NOTE some general helpers here to help build consistent interfaces */
function buildResponseIfSchema (params) {
    return (schema) => {
        if (!schema) {
            return {
                meta: {
                    code: params.code,
                },
                type: 'boolean',
                constant: true,
            };
        } else {
            return _.merge({
                meta: {
                    code: params.code,
                },
            }, schema);
        }
    };
}

module.exports = {
    created: buildResponseIfSchema({ code: 201 }),
    success: buildResponseIfSchema({ code: 200 }),
    getList: (schema) => {
        return {
            meta: {
                code: 200,
            },
            type: 'object',
            properties: {
                totalCount: { type: 'integer', minimum: 0 },
                items: { type: 'array', items: schema },
            },
            required: [ 'items' ],
        };
    },

};
