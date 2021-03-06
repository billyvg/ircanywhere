var _ = require('lodash'),
	events = require('events'),
	util = require('util'),
	helper = require('../lib/helpers').Helpers,
	hooks = require('hooks');

/**
 * Wrapper for sock.js sockets
 *
 * @class 	WebSocket
 * @method 	WebSocket
 * @param	{Object} socket
 * @extend	false
 * @return 	void
 */
function WebSocket(socket) {
	this._socket = socket;

	this.bindEvents();
}

util.inherits(WebSocket, events.EventEmitter);

/**
 * Binds our sock.js events to _socket
 *
 * @method 	bindEvents
 * @param 	{Object} raw
 * @extend	true
 * @return 	void
 */
WebSocket.prototype.bindEvents = function() {
	this._socket.on('data', this.onMessage.bind(this));
	this._socket.on('close', this.onClose.bind(this));
}

/**
 * Checks if an incoming message object is valid
 *
 * @method 	isValid
 * @param 	{Object} parsed
 * @extend	true
 * @return 	{Boolean}
 */
WebSocket.prototype.isValid = function(parsed) {
	return (parsed.event !== undefined || parsed.data !== undefined);
}

/**
 * Handles an incoming message
 *
 * @method 	onMessage
 * @param 	{Object} raw
 * @extend	true
 * @return 	void
 */
WebSocket.prototype.onMessage = function(raw) {
	var parsed,
		event,
		data;

	try {
		parsed = JSON.parse(raw);
	} catch (e) {
		return;
	}
	// parse json otherwise we'll crash if someone sends invalid packets in

	if (this.isValid(parsed)) {
		event = parsed.event;
		data = parsed.data;

		this.emit(event, data);
	}
	// is the event valid? try emitting
}

/**
 * Handles closing the connection
 *
 * @method 	onClose
 * @extend	true
 * @return 	void
 */
WebSocket.prototype.onClose = function() {
	this._socket.removeAllListeners();

	if (this._user) {
		delete Users[this._user._id];	
	}
	
	delete Sockets[this._socket.id];
	// delete our references
}

/**
 * Sends outgoing packets
 *
 * @method 	send
 * @param 	{String} event
 * @param	{Object} data
 * @param	{Boolean} close
 * @extend	true
 * @return 	void
 */
WebSocket.prototype.send = function(event, data, close) {
	var close = close || false;

	if (!this._socket) {
		return false;
	}

	this._socket.write(JSON.stringify({event: event, data: data}));
	// write to the socket
	
	if (close) {
		this._socket.close();
	}
}

/**
 * Compiles a temporary GET route and sends it to a socket
 *
 * @method 	sendBurst
 * @param	{Object} data
 * @extend	true
 * @return 	void
 */
WebSocket.prototype.sendBurst = function(data) {
	var self = this,
		path = '/api/burst/' +  helper.generateSalt(25);

	application.app.get(path, function(req, res) {
		var user = userManager.isAuthenticated(req.headers.cookie);

		if (user._id.toString() === self._user._id.toString()) {
			res.header('Content-Type', 'application/json');
			res.end(JSON.stringify(data));
		} else {
			res.header('Content-Type', 'application/json');
			res.end(JSON.stringify({'error': 'unauthenticated'}));
		}
	});
	// generate a temporary route

	this.send('burst', {url: path, timeout: 10000});
	// compile a load of data to send to the frontend

	setTimeout(function() {
		for (var index in application.app.routes.get) {
			if (application.app.routes.get[index].path === path) {
				application.app.routes.get.splice(index, 1);
				break;
			}
		}
	}, 10000);
	// trash the route
}

exports.WebSocket = _.extend(WebSocket, hooks);