'use strict';

angular.module('emission.services', [])

.service('CommHelper', function($http) {
    var getConnectURL = function(successCallback, errorCallback) {
        window.cordova.plugins.BEMConnectionSettings.getSettings(
            function(settings) {
                successCallback(settings.connectURL);
            }, errorCallback);
    };

    this.registerUser = function(successCallback, errorCallback) {
            window.cordova.plugins.BEMServerComm.getUserPersonalData("/profile/create", successCallback, errorCallback);
    };

    this.getTimelineForDay = function(date, successCallback, errorCallback) {
        var dateString = date.startOf('day').format('YYYY-MM-DD');
        window.cordova.plugins.BEMServerComm.getUserPersonalData("/timeline/getTrips/"+dateString, successCallback, errorCallback);
    };
})

// common configuration methods across all screens
// e.g. maps
// for consistent L&F

.factory('Config', function() {
    var config = {};

    config.getMapTiles = function() {
      return {
          tileLayer: 'http://tile.stamen.com/toner/{z}/{x}/{y}.png',
          tileLayerOptions: {
              attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, under <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>. Data by <a href="http://openstreetmap.org">OpenStreetMap</a>, under <a href="http://www.openstreetmap.org/copyright">ODbL</a>.',
              opacity: 0.9,
              detectRetina: true,
              reuseTiles: true,
          }
      };
    };
    return config;
})

.factory('Chats', function() {
  // Might use a resource here that returns a JSON array

  // Some fake testing data
  var chats = [{
    id: 0,
    name: 'Ben Sparrow',
    lastText: 'You on your way?',
    face: 'img/ben.png'
  }, {
    id: 1,
    name: 'Max Lynx',
    lastText: 'Hey, it\'s me',
    face: 'img/max.png'
  }, {
    id: 2,
    name: 'Adam Bradleyson',
    lastText: 'I should buy a boat',
    face: 'img/adam.jpg'
  }, {
    id: 3,
    name: 'Perry Governor',
    lastText: 'Look at my mukluks!',
    face: 'img/perry.png'
  }, {
    id: 4,
    name: 'Mike Harrington',
    lastText: 'This is wicked good ice cream.',
    face: 'img/mike.png'
  }, {
    id: 5,
    name: 'Ben Sparrow',
    lastText: 'You on your way again?',
    face: 'img/ben.png'
  }, {
    id: 6,
    name: 'Max Lynx',
    lastText: 'Hey, it\'s me again',
    face: 'img/max.png'
  }, {
    id: 7,
    name: 'Adam Bradleyson',
    lastText: 'I should buy a boat again',
    face: 'img/adam.jpg'
  }, {
    id: 8,
    name: 'Perry Governor',
    lastText: 'Look at my mukluks again!',
    face: 'img/perry.png'
  }, {
    id: 9,
    name: 'Mike Harrington',
    lastText: 'This is wicked good ice cream again.',
    face: 'img/mike.png'
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
