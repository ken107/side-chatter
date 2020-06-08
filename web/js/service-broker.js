
function ServiceBroker(url, logger) {
  var pending = {};
  var pendingIdGen = 0;
  var providers = {};
  var ws;
  var connectListeners = [];
  connect();

  function connect() {
    var conn = new WebSocket(url);
    conn.onopen = onOpen.bind(null, conn);
    conn.onerror = function() {
      logger.error("Failed to connect to service broker, retrying in 15");
      setTimeout(connect, 15000);
    };
  }

  function onOpen(conn) {
    ws = conn;
    ws.onerror = logger.error;
    ws.onclose = onClose;
    ws.onmessage = onMessage;
    for (var i=0; i<connectListeners.length; i++) connectListeners[i]();
  }

  function onClose() {
    ws = null;
    logger.error("Lost connection to service broker, reconnecting");
    setTimeout(connect, 0);
  }

  function onMessage(e) {
    var msg = messageFromString(e.data);
    logger.trace("RECV", msg.header, msg.payload);
    if (msg.header.type == "ServiceResponse") onServiceResponse(msg);
    else if (msg.header.type == "ServiceRequest") onServiceRequest(msg);
    else if (msg.header.type == "SbStatusResponse") onServiceResponse(msg);
    else if (msg.header.error) onServiceResponse(msg);
    else logger.error("Unhandled", msg.header);
  }

  function messageFromString(text) {
    var index = text.indexOf('\n');
    if (index == -1) return {header: JSON.parse(text)};
    else return {header: JSON.parse(text.substr(0,index)), payload: text.substr(index+1)};
  }

  function onServiceResponse(msg) {
    if (pending[msg.header.id]) {
      if (msg.header.error) pending[msg.header.id].reject(new Error(msg.header.error));
      else pending[msg.header.id].fulfill(msg);
      delete pending[msg.header.id];
    }
    else logger.error("Response received but no pending request", msg.header);
  }

  function onServiceRequest(msg) {
    if (providers[msg.header.service.name]) {
      Promise.resolve(providers[msg.header.service.name].handler(msg))
        .then(function(res) {
          if (!res) res = {};
          if (msg.header.id) {
            var header = {
              to: msg.header.from,
              id: msg.header.id,
              type: "ServiceResponse"
            };
            send(Object.assign({}, res.header, header), res.payload);
          }
        })
        .catch(function(err) {
          if (msg.header.id) {
            send({
              to: msg.header.from,
              id: msg.header.id,
              type: "ServiceResponse",
              error: err.message
            })
          }
          else logger.error(err.message, msg.header);
        })
    }
    else logger.error("No handler for service " + msg.header.service.name);
  }



  this.request = function(service, req) {
    return this.requestTo(null, service, req);
  }

  this.requestTo = function(endpointId, service, req) {
    var id = ++pendingIdGen;
    var promise = new Promise(function(fulfill, reject) {
      pending[id] = {fulfill: fulfill, reject: reject};
    })
    var header = {
      id: id,
      type: "ServiceRequest",
      service: service
    };
    if (endpointId) header.to = endpointId;
    send(Object.assign({}, req.header, header), req.payload);
    return promise;
  }

  function send(header, payload) {
      if (!ws) throw new Error("Not connected");
      logger.trace("SEND", header, payload);
      ws.send(JSON.stringify(header) + (payload ? "\n"+payload : ""));
  }



  this.advertise = function(service, handler) {
    if (providers[service.name]) throw new Error(service.name + " provider already exists");
    providers[service.name] = {
      advertisedService: service,
      handler: handler
    }
    return send({
      type: "SbAdvertiseRequest",
      services: Object.keys(providers)
        .map(function(x) {return providers[x].advertisedService})
        .filter(function(x) {return x})
    })
  }

  this.unadvertise = function(serviceName) {
    if (!providers[serviceName]) throw new Error(serviceName + " provider not exists");
    delete providers[serviceName];
    return send({
      type: "SbAdvertiseRequest",
      services: Object.keys(providers)
        .map(function(x) {return providers[x].advertisedService})
        .filter(function(x) {return x})
    })
  }

  this.setHandler = function(serviceName, handler) {
    if (providers[serviceName]) throw new Error("Handler already exists");
    providers[serviceName] = {
      handler: handler
    }
  }



  this.publish = function(topic, text) {
    return send({
      type: "ServiceRequest",
      service: {name: "#"+topic}
    },
    text);
  }

  this.subscribe = function(topic, handler) {
    return this.advertise({name: "#"+topic}, function(msg) {
      handler(msg.payload);
      return null;
    })
  }

  this.unsubscribe = function(topic) {
    return this.unadvertise("#"+topic);
  }

  this.isConnected = function() {
    return ws != null;
  }

  this.addConnectListener = function(listener) {
    connectListeners.push(listener);
    if (this.isConnected()) listener();
  }
}
