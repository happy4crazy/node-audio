module.exports = (function() {
  var public = {}
    , clients = {}
    , socket
    , io
    , rooms
    ;

  public.start = function(_socket, _httpServer, _rooms) {
    io = _socket.listen(_httpServer);
    rooms = _rooms;
    rooms.setSockets(io.sockets);

    io.on('connection', function(client) {
      client.emit('authorized', { text: 'Connected.  Welcome to Jam-r.'
                                , clientID: client.id
                                });

      createClientRecord(client);
      setupClientEvents(client);
    });

    return public;
  };

  var createClientRecord = function(client) {
    clients[client.id] = { instrument: ''
                         , room: ''
                         };
  };

  var sendClientToRoom = function(client, room) {
    var clientRecord = clients[client.id];
    if (clientRecord.room !== '') {
      client.leave('/' + clientRecord.room);
    }

    client.join(room.name);
    clientRecord.room = room.name;
    client.emit('join-room', { text: "You have joined room: " + room.name
                             , room: room.name
                             });

    notifyClientOfHistory(client);
  };

  var broadcastToClientRoom = function(client, type, msg) {
    var roomName = clients[client.id].room;
    io.sockets.in(roomName).emit(type, msg);
  };

  var notifyClientOfHistory = function(client) {
    var instruments = []
      , roomName = clients[client.id].room
      , clientsForRoom = io.sockets.clients(roomName)
      ;

    for (var i = 0; i < clientsForRoom.length; i++) {
      var curID = clientsForRoom[i].id;
      if (curID !== client.id) {
        instruments.push( { ident: curID
                          , name:  clients[curID].instrument });
      }
    }
    if (instruments.length === 0) { return; }

    client.emit('add-instruments', { instruments: instruments });
    broadcastToClientRoom(client, 'message', { text: 'Someone just connected to the room.'
                                             , originator: client.id });
  };

  var broadcastSynthEvent = function(client, e) {
    broadcastToClientRoom(client, 'synth-event', e);

    if (e.type === "addInstrument") {
      clients[client.id].instrument = e.instrumentName;
    } else if (e.type === "removeInstrument") {
      delete clients[e.clientID].instrument;
    }
  };

  var removeClient = function(client) {
    var roomName = clients[client.id].room;
    broadcastToClientRoom(client, 'synth-event', { type: "removeInstrument"
                                                 , instrumentName: client.id
                                                 });
    delete clients[client.id];
  };

  var setupClientEvents = function(client) {
    client.on('synth-event', function(e) {
      broadcastSynthEvent(client, e);
    });

    client.on('disconnect', function(e) {
      removeClient(client);
    });

    client.on('request-room', function(e) {
      if (typeof e.room !== 'undefined') {
        sendClientToRoom(client, rooms.getRoom(e.room));
      } else {
        sendClientToRoom(client, rooms.firstAvailable());
      }
    });
  }

  return public;
})();
