'use strict';

angular.module('emission.incident.posttrip.prompt', ['emission.plugin.logger'])
.factory("PostTripAutoPrompt", function($window, $ionicPlatform, $rootScope, $state,
    $ionicPopup, Logger) {
  var ptap = {};
  var REPORT = 737678; // REPORT on the phone keypad

  var getTripEndReportNotification = function() {
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

    var reportNotifyConfig = {
      id: REPORT,
      title: "Trip just ended",
      text: "Incident to report?",
      actions: [actions[0], actions[1]],
      category: 'REPORT_INCIDENT',
      autoClear: true
    };
    Logger.log("Returning notification config "+JSON.stringify(reportNotifyConfig));
    return reportNotifyConfig;
  }

  ptap.registerTripEnd = function() {
    console.log( "registertripEnd received!" );
    // iOS
    var notifyPlugin = $window.cordova.plugins.BEMTransitionNotification;
    notifyPlugin.TRIP_END = "trip_ended";
    notifyPlugin.addEventListener(notifyPlugin.TRIP_END, getTripEndReportNotification())
        .then(function(result) {
            // $window.broadcaster.addEventListener("TRANSITION_NAME",  function(result) {
            Logger.log("Finished registering "+notifyPlugin.TRIP_END+" with result "+JSON.stringify(result));
        })
        .catch(function(error) {
            Logger.log(JSON.stringify(error));
            $ionicPopup.alert({
                title: "Unable to register notifications for trip end",
                template: JSON.stringify(error)
            });
        });;
  }

  var displayCompletedTrip = function(notification, state, data) {
    console.log("About to display completed trip");
    var newScope = $rootScope.$new();
    if ($ionicPlatform.is('ios')) {
      console.log("About to parse "+notification.data);
      notification.data = JSON.parse(notification.data);
    }
    angular.extend(newScope, notification.data);
    console.log("notification = "+JSON.stringify(notification));
    console.log("state = "+JSON.stringify(state));
    console.log("data = "+JSON.stringify(data));
    $ionicPopup.show({title: "Report incident for trip",
        scope: newScope,
        template: "{{start_ts}} -> {{end_ts}}",
        buttons: [{
          text: 'OK',
          type: 'button-positive'
        }]
    }).then(function() {
      console.log("About to go to incident map page");
      $state.go("root.main.incident", notification.data);
    });
  }

  ptap.registerUserResponse = function() {
    console.log( "registerUserResponse received!" );
    $window.cordova.plugins.notification.local.on('action', function (notification, state, data) {
      if (data.identifier === 'REPORT') {
          alert("About to report");
          displayCompletedTrip(notification, state, data);
      } else if (data.identifier === 'MUTE') {
          alert('About to mute');
      }
    });
    $window.cordova.plugins.notification.local.on('clear', function (notification, state, data) {
        alert("notification cleared, no report");
    });
    $window.cordova.plugins.notification.local.on('click', function (notification, state, data) {
      alert("clicked, no action");
      displayCompletedTrip(notification, state, data);
    });
  }

  $ionicPlatform.ready().then(function() {
    ptap.registerTripEnd();
    ptap.registerUserResponse();
  });

  return ptap;

});
