var request = require('request');
var _ = require('lodash');
var Promise = require('bluebird');

module.exports = function(serviceName){
	var discovery = this;
	var services = discovery.services();
	
	var httpRequest = Promise.promisify(function(method, path, options, cb){
		if(typeof options === "function"){
			cb = options;
			options = {};
		}

		if(!(serviceName in services) || _.isEmpty(services[serviceName])){
			return cb({
				error: "Service " + serviceName + " not connected.",
			}, null, {
				sender: services.self,
				statusCode: 500,
			})
		}

		var service = getRandomService(serviceName, services);

		var protocol = service.info.protocol;
		var url = service.info.host;
		var port = service.info.port;

		if(!options.headers){
			options.headers = {};
		}
		
		options.headers["content-type"] = "application/json";
		options.headers["accept"] = "application/json";
		options.headers["haypi-service"] = services.self.name;
		options.json = true;
		options.url = protocol + "://" + url + ":" + port + path

		request[method](options, function(err, res, body) {
			if(err){
				return cb(err, null, {
					statusCode: _.get(res, "statusCode", 500),
					sender: services.self,
					receiver: service
				})
			}
			if(res.statusCode >= 400){
				return cb(body, null, {
					statusCode: res.statusCode,
					sender: services.self,
					receiver: service
				})
			}
			cb(null, body, {
				statusCode: res.statusCode,
				sender: services.self,
				receiver: service
			})
		})
	})

	var methods = ["get", "post", "put", "patch", "options"]

	var requestFuncs = {};

	for(var i in methods){
		requestFuncs[methods[i]] = httpRequest.bind({}, methods[i])
	}

	requestFuncs["del"] = httpRequest.bind({}, "delete");
	requestFuncs["send"] = httpRequest;

	return requestFuncs;
}

var getRandomService = function(serviceName, services){
	var serviceIds = Object.keys(services[serviceName]);
	return services[serviceName][serviceIds[Math.floor(Math.random() * serviceIds.length)]]
}