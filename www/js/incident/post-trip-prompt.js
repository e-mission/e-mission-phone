'use strict';

angular.module('emission.incident.posttrip.prompt', ['emission.plugin.logger'])
.factory("PostTripAutoPrompt", function($window, $ionicPlatform, Logger) {
  var ptap = {};
  var REPORT = 737678; // REPORT on the phone keypad

  var showTripEndNotification = function() {
    var actions = [{
       identifier: 'MUTE',
       title: 'Mute',
       icon: 'res://ic_moreoptions',
       activationMode: 'foreground',
       destructive: false,
       authenticationRequired: false
    }, {
        identifier: 'REPORT',
        title: 'Yes',
        icon: 'res://ic_signin',
        activationMode: 'foreground',
        destructive: false,
        authenticationRequired: false
    }];

    console.log("About to show notification");
    $window.cordova.plugins.notification.local.schedule({
      id: REPORT,
      title: "Trip just ended",
      text: "Incident to report?",
      actions: [actions[0], actions[1]],
      category: 'REPORT_INCIDENT'
    });
  }

  ptap.registerTripEnd = function() {
    console.log( "registertripEnd received!" );
    // Android
    $window.broadcaster.addEventListener("local.transition.stopped_moving", function( e ) {
      showTripEndNotification();
    });

    // iOS
    $window.broadcaster.addEventListener("TRANSITION_NAME", function(e) {
      console.log("Received TRANSITION_NAME event"+JSON.stringify(e));
      showTripEndNotification();
    });
  }

  ptap.registerUserResponse = function() {
    console.log( "registerUserResponse received!" );
    $window.cordova.plugins.notification.local.on('action', function (notification, state, data) {
      if (data.identifier === 'REPORT') {
          alert("About to report");
      } else if (data.identifier === 'MUTE') {
          alert('About to mute');
      }
    });
    $window.cordova.plugins.notification.local.on('click', function (notification, state, data) {
      alert("swiped, no action");
    });
  }

  $ionicPlatform.ready().then(function() {
    ptap.registerTripEnd();
    ptap.registerUserResponse();
  });

  return ptap;

});

// UIMutableUserNotificationAction
