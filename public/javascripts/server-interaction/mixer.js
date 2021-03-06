define(['mixer'], function(mixer) {
  var public = {}
    , userSoundInputController
    , clientID
    , room
    ;

  public.setUserSoundInputController = function(_userSoundInputController) {
    userSoundInputController = _userSoundInputController;
  }

  public.newRoom = function(_room) {
    room = _room;

    setUpSocketListeners(room.getSocket());
    userSoundInputController.activate(public);
  };

  public.disconnection = function() {
    userSoundInputController.deactivate();
  };

  public.emitSynthEvent = function(type, instrumentName, noteName) {
    var e = { type:           type
            , instrumentName: instrumentName
            , noteName:       noteName };

    room.emit('synth-event', e);
  };


  var setUpSocketListeners = function(socket) {
    socket.on('synth-event', function(e) {
      // This play-area crap needs to be moved out of this
      // otherwise non-dom interacting class
      if (e.type === 'start') {
        $('#play-area').removeClass('beat-pulse-run');
        setTimeout(function() {
          $('#play-area').addClass('beat-pulse-run');
        }, 10);
      }

      if (e.type === 'addInstrument') {
        mixer[e.type](e.clientID, e.instrumentName);
      } else {
        mixer[e.type](e.clientID, e.noteName);
      }
    });

    socket.on('add-instruments', function(e) {
      mixer.addInstruments(e.instruments);
    });
  };

  return public;
});
