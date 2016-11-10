module.exports = function(interface, config){
	var context = this;
	var actions = interface.call(context, config);

	context.events.on("up", function(info){
		actions.announce(info);
	})

	context.events.on("shutdown", function(){
		actions.remove();
	})

	context.globals.set({serviceRequest: require(__dirname + "/serviceRequest.js").bind(actions) })

	//services list getter and setter
	//service connected event
	//service disconnected event
	//announce self function
	//remove self function
	return actions;
}