'use strict';
var util = require('util');

const options = { colors: true, depth: 10 };

function logLocal (type) {
    let log = console[type];

    return (msg, obj) => {
        if (typeof msg !== 'string') {
            msg = util.inspect(msg, options);
        }

        if (typeof obj === 'string') {
            log(msg, obj);
        } else if (typeof obj !== 'undefined') {
            log(msg, util.inspect(obj, options));
        } else {
            log(msg);
        }
    };
}

/* shim for allowing a different logger in production while keeping the same interface for the app.
you can use an if/else based on env, if you want to use something other than just console for logs  */
module.exports = {
    debug: logLocal('log'),
    info: logLocal('info'),
    error: logLocal('error'),
    warn: logLocal('warn'),
};
