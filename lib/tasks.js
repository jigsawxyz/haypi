"use strict";
const Promise = require('bluebird');
const _ = require('lodash');

module.exports = function setup(taskObj){
    var context = this;
    var tasks = getDeep(taskObj);
    var taskRunnerArray = [];

    for(var i in tasks){
        if(tasks[i][context.mode]){
            taskRunnerArray.push(runner(`${i}-${context.mode}`, tasks[i][context.mode]).bind(context));
        }
        if(tasks[i].all){
            taskRunnerArray.push(runner(`${i}-all`, tasks[i].all).bind(context));
        }
    }

    if(taskRunnerArray.length > 0){
        return function taskRunner(){
            return taskRunnerArray.reduce((acc, func) => {
                return acc.then(() => {
                    return func()
                })
            }, Promise.resolve(true))
        }
    } else {
        return function(){ console.log(`No Tasks Registered for ${context.mode} mode.`); return Promise.resolve(false) }
    }
}

function runner(name, taskPromiseArr){
    return function(){
        var context = this;
        var errorCount = 0;
        console.log(`Running ${name} tasks...`)
        return taskPromiseArr.reduce((acc, val) => {
            return acc.then(function(){
                if(!val.precheck || typeof val.precheck != "function"){
                    val.precheck = function(){ return Promise.resolve(false) };
                }
                if(!val.complete || typeof val.complete != "function"){
                    val.complete = function(taskValue){ return Promise.resolve(false) };
                }
                let taskName = val.name || val.task.name || "task";
                return Promise.try(function(){
                    return val.precheck()
                })
                .catch(err => {
                    throw new context.errors.taskPrecheckError(err.message, err)
                })
                .then(alreadyPerformed => {
                    if(alreadyPerformed == true){
                        console.log(`${taskName} already performed, skipping...`)
                        return Promise.resolve();
                    } else {
                        console.log(`Running ${taskName}...`)
                        return Promise.try(function(){
                            return val.task()
                        })
                        .catch(err => {
                            throw new context.errors.taskRunError(err.message, err)
                        })
                    }
                })
                .then(taskValue => {
                    return Promise.try(function(){
                        return val.complete(taskValue)
                    })
                    .catch(err => {
                        throw new context.errors.taskCompleteError(err.message, err)
                    })
                })
                .catch(context.errors.taskPrecheckError, err => {
                    console.log("Error on task precheck...");
                    console.log(err)
                    errorCount += 1;
                })
                .catch(context.errors.taskRunError, err => {
                    console.log("Error on task run...");
                    console.log(err)
                    errorCount += 1;
                })
                .catch(context.errors.taskCompleteError, err => {
                    console.log("Error on task complete...");
                    console.log(err)
                    errorCount += 1;
                })
                .catch(err => {
                    console.log("Uncaught Error...")
                    console.log(err)
                    errorCount += 1;
                })

            })
        }, Promise.resolve(true))
        .then(function(){
            console.log(`${name} tasks completed with ${errorCount} errors.`)
        })
    }
}

function getDeep(taskObj, key){
    if(!key){
        key = "all";
    }
    var tasks = {};
    for(var i in taskObj){
        if(taskObj[i] instanceof Array){
            var taskSet = {};
            taskSet[i] = taskObj[i];
            tasks[key] = _.merge(tasks[key], taskSet)
            continue;
        }
        if(typeof taskObj[i] == "object"){
            var item = getDeep(taskObj[i], i);
            var key = Object.keys(item)[0];
            tasks[key] = _.merge(tasks[key], item[key]);
            continue;
        }
    }
    return tasks;
}