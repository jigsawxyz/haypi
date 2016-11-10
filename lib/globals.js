var _ = require("lodash");

var globals = {};

module.exports = {
    set: function(obj){
        globals = _.merge(globals, obj);
        return globals;
    },
    get: function(key){
        if(key){
            return _.get(globals, key, null);
        }
        
        return globals;
    }
}