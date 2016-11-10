var path = require('path');
var fs = require('fs');
var _ = require('lodash');

function init(moduleName, directory){
    console.log("INITIALIZING " + moduleName);
    var context = this;

    var data = buildFileData(moduleName, directory, context);
    context.globals.set(data);
    return data;
}

var buildFileData = function(pointer, directory, context, data){
    if(!data){
        data = {};
    }

    var files = fs.readdirSync(directory);
    files.forEach(function(filename, index){
        var file = directory + "/" + filename;
        if(fs.statSync(file).isFile()){
            var name = filename.split(".")[0];
            var fileData = require(file);

            if(typeof fileData === "object"){
                for(var i in fileData){
                    if(typeof fileData[i] === "function"){
                        fileData[i] = fileData[i].bind(context);
                    }
                }
            } else if(typeof fileData === "function"){
                fileData = fileData.bind(context);
            }
            _.set(data, pointer + "." + name, fileData);

        } else if(fs.statSync(file).isDirectory()){
            var name = filename;
            _.merge(data, buildFileData(pointer + "." + name, directory + "/" + name, context, data))
        }
    })
    return data;
}

module.exports = init;