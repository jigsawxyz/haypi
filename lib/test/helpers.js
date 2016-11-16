'use strict';
let request = require('superagent-bluebird-promise');
let path = require('path');
let ajv = require('ajv')({
    v5: true,
    format: 'full',
    formats: {},
});
let url = require('url');
let _ = require('lodash');
let assert = require('chai').assert;
let generateData = require('./dataGenerator');

module.exports = (context) => {
    const apiRoot = context.env.get('api:url');
    let logger = context.logger;

    function buildUrls (schema, rootUrl) {
        if (schema.rootUri) {
            rootUrl = path.join(rootUrl, schema.rootUri);
        }
        _.forEach(_.keys(schema), (key) => {
            const subSchema = schema[key];

            _.forEach(_.keys(subSchema), (subSchemaKey) => {
                if (subSchemaKey === 'uri') {
                    subSchema[subSchemaKey] = rootUrl + subSchema[subSchemaKey];
                }
            });

            if (subSchema.resource) {
                buildUrls(subSchema, rootUrl);
            }
        });

        return schema;
    }

    function errorIfNotEqDeep (input, output) {
        const keys = _.keys(input);
        for (var i=0; i < keys.length; i++) {
            const key = keys[i];
            const inputVal = input[key];
            const outputVal = _.get(output, key);
            if (_.isObject(inputVal)) {
                errorIfNotEqDeep(inputVal, outputVal);
            } else {
                if (!_.eq(inputVal, outputVal)) {
                    return `${inputVal} does not equal ${outputVal}`;
                }
            }
        }
        return;
    }

    function checkEquality (inputData, outputData, eq) {
        if (eq === true) {
            /* setting eq to `true` checks that the output data matches the input data */
            const err = errorIfNotEqDeep(inputData, outputData);
            if (err) {
                throw err;
            }
        } else if (_.isArray(eq)) {
            /* setting eq to an array lets you pass it a list of keys to see that output matches input */
            for (var i=0; i < eq.length; i++) {
                const key = eq[i];
                const inputVal = inputData[key];

                if (_.isUndefined(inputVal)) {
                    throw new Error(`${key} is not defined. you probably misspelled it`);
                }

                assert.equal(inputVal, _.get(outputData, key));
            }
        } else if (_.isObject(eq)) {
            /* setting eq to an object lets you give each key a value that will be compared */
            _.forEach(_.keys(eq), (key) => {
                let inputVal = eq[key];
                let outputVal = _.get(outputData, key);

                if (_.isArray(inputVal)) {
                    inputVal = _.sortBy(inputVal);
                    outputVal = _.sortBy(outputVal);

                    if(!_.isEmpty(_.differenceBy(inputVal, outputVal, _.isEqual))) {
                        logger.debug('input:', inputVal);
                        logger.debug('output:', outputVal);
                        throw new Error('input and output arrays not equal. check test logs');
                    }
                } else {
                    assert.equal(inputVal, outputVal);
                }
            });
        }
    }

    /*
    this fn requires a schema with a valid request schema, and a valid response schema nested inside.
    it follows a superset of JSON schema with some things for validating the response code, etc
    it takes the input schema and generates random values using the json jaker library. you can specify the type of
    data it generates in the schema. check the library out, if you feel the need.
    NOTE i have not added our custom types to faker, so you will have to omit them, unless you want to add them
    params takes 4 args =>
    headers -> any headers you want to specify outside of the app key
    omit -> params you want to omit. you can specify nested attributes using ptr syntax -> 'my.nested.attr'
    params -> parameters you want to specify. these will override any params made by faker
    eq => parameters that you want to check that the output is the same as input. this also takes the ptr syntax -> 'my.nested.attr'.
    you can also specify it as `true`, which will check equality for all input params to their equivalents in output
    NOTE do NOT use `=>` in the `then` block of tests if you want to have access to the input data.
    i binded the input data passed to the api to `this` in the promise. lexical scope does not pass `this` into the `then` block
    */
    function testRoute (params) {
        const schema = params.schema;

        const fakerData = generateData(params);
        let inputData = _.clone(fakerData);

        const uriParams = schema.uri.match(/:\w+/g);
        let uri = _.clone(schema.uri);

        _.forEach(uriParams, (uriParam) => {
            const key = uriParam.replace(':', '');
            uri = uri.replace(uriParam, inputData[key]);

            _.unset(inputData, key);
        });

        const method = schema.method.toLowerCase();

        logger.info(`${method.toUpperCase()} ${uri}`);
        logger.info(`Data:`, inputData);

        return request[method](url.resolve(apiRoot, uri))
        .set(_.merge({
            'Content-Type': 'application/json',
            'clientid': 'b6cee31ce64c711f693dc2590683970e2af96755bc1bf00c71866b3b1931936d',
        }, params.headers))
        [method === 'get' ? 'query' : 'send'](inputData) // if it's a get, send as a query string, if it's not send in the body
        .promise().bind({ inputData: inputData }).then(function (res) {
            if (params.error) {
                throw new Error('Request should not have succeeded');
            }

            const response = res.body.response;
            /* if ajv throws an error here (before printing the response), the response schema is invalid */
            const isValid = ajv.validate(schema.response, response);
            /* save to a var, because the errors in the ajv obj get overwritten when ajv runs again.
            the proper error msg printing is subject to a race condition otherwise */
            const errorsText = ajv.errorsText();

            if (!isValid) {
                logger.error('Response body:', response);
                throw new Error(errorsText);
            }

            checkEquality(inputData, response, params.eq);

            return response;
        }).catch((err) => {
            const errorResBody = _.get(err, 'res.body');
            if (errorResBody) {
                /* it is a response obj coming from superagent */
                if (params.error) {
                    const error = _.get(params, 'error', {});

                    if (error.internalCode && errorResBody.error.internalCode !== error.internalCode) {
                        throw new Error(`internal code ${errorResBody.error.internalCode} should equal ${error.internalCode}`);
                    } else if (error.statusCode && errorResBody.error.code !== error.statusCode) {
                        throw new Error(`status code ${errorResBody.error.code} should equal ${error.statusCode}`);
                    } else {
                        return true;
                    }
                }
                logger.debug(errorResBody.error);
                let error = new Error(errorResBody.error.message);

                error.statusCode = errorResBody.error.code;
                error.internalCode = errorResBody.error.internalCode;
                throw error;
            } else {
                throw new Error(err.message);
            }
        });
    };

    function testFn (params) {
        let inputData = generateData(params);
        return params.fn(inputData).then(function (outputData) {
            if (_.get(params, 'schema.response')) {
                /* if ajv throws an error here (before printing the response), the response schema is invalid */
                const isValid = ajv.validate(params.response, outputData);
                /* save to a var, because the errors in the ajv obj get overwritten when ajv runs again.
                the proper error msg printing is subject to a race condition otherwise */
                const errorsText = ajv.errorsText();

                if (!isValid) {
                    logger.error('Fn data:', outputData);
                    throw new Error(errorsText);
                }
            }

            checkEquality(inputData, outputData, params.eq);
            return outputData;
        });
    };

    return {
        schemas: buildUrls(_.cloneDeep(context.schemas), context.rootUri),
        testRoute: testRoute,
        testFn: testFn,
    };
}
