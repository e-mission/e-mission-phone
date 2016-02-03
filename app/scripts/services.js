'use strict';

angular.module('emission.services', [])

.factory('CommHelper', function() {
    return {
        registerUser: function(successCallback, errorCallback) {
            window.cordova.plugins.BEMServerComm.getUserPersonalData("/profile/create", successCallback, errorCallback);
        }
    };
})

.factory('Chats', function() {
  // Might use a resource here that returns a JSON array

  // Some fake testing data
  var chats = [{
    id: 0,
    name: 'Ben Sparrow',
    lastText: 'You on your way?',
    face: 'images/ben.png'
  }, {
    id: 1,
    name: 'Max Lynx',
    lastText: 'Hey, it\'s me',
    face: 'images/max.png'
  }, {
    id: 2,
    name: 'Adam Bradleyson',
    lastText: 'I should buy a boat',
    face: 'images/adam.jpg'
  }, {
    id: 3,
    name: 'Perry Governor',
    lastText: 'Look at my mukluks!',
    face: 'images/perry.png'
  }, {
    id: 4,
    name: 'Mike Harrington',
    lastText: 'This is wicked good ice cream.',
    face: 'images/mike.png'
  }, {
    id: 5,
    name: 'Ben Sparrow',
    lastText: 'You on your way again?',
    face: 'images/ben.png'
  }, {
    id: 6,
    name: 'Max Lynx',
    lastText: 'Hey, it\'s me again',
    face: 'images/max.png'
  }, {
    id: 7,
    name: 'Adam Bradleyson',
    lastText: 'I should buy a boat again',
    face: 'images/adam.jpg'
  }, {
    id: 8,
    name: 'Perry Governor',
    lastText: 'Look at my mukluks again!',
    face: 'images/perry.png'
  }, {
    id: 9,
    name: 'Mike Harrington',
    lastText: 'This is wicked good ice cream again.',
    face: 'images/mike.png'
  }];

  return {
    all: function() {
      return chats;
    },
    remove: function(chat) {
      chats.splice(chats.indexOf(chat), 1);
    },
    get: function(chatId) {
      for (var i = 0; i < chats.length; i++) {
        if (chats[i].id === parseInt(chatId)) {
          return chats[i];
        }
      }
      return null;
    }
  };
});
