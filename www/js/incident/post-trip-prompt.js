'use strict';

angular.module('emission.incident.posttrip.prompt', ['emission.plugin.logger'])
.factory("PostTripAutoPrompt", function($window, $ionicPlatform, $rootScope, $state,
    $ionicPopup, Logger) {
  var ptap = {};
  var REPORT = 737678; // REPORT on the phone keypad
  var REPORT_INCIDENT_TEXT = 'REPORT_INCIDENT';
  var TRIP_END_EVENT = "trip_ended";

  var reportMessage = function(platform) {
    var platformSpecificMessage = {
      "ios": "Swipe right to report any positive or negative experiences on this trip. Swipe left for more - Busy? Snooze 30 mins. Annoyed? Mute.",
      "android": "Touch to report any positive or negative experiences on this trip. See options for more - Busy? Snooze 30 mins. Annoyed? Mute."
    };
    var selMessage = platformSpecificMessage[platform];
    if (!angular.isDefined(selMessage)) {
      selMessage = "Select to report any positive or negative experiences on this trip. More options - Busy? Snooze 30 mins. Annoyed? Mute.";
    }
    return selMessage;
  };

  var getTripEndReportNotification = function() {
    var actions = [{
       identifier: 'MUTE',
       title: 'Mute',
       icon: 'res://ic_moreoptions',
       activationMode: 'background',
       destructive: false,
       authenticationRequired: false
    }, {
       identifier: 'SNOOZE',
       title: 'Snooze',
       icon: 'res://ic_moreoptions',
       activationMode: 'background',
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
      title: "Incident to report?",
      text: reportMessage(ionic.Platform.platform()),
      icon: 'file://img/icon.png',
      smallIcon: 'res://ic_mood_question.png',
      sound: null,
      actions: actions,
      category: REPORT_INCIDENT_TEXT,
      autoClear: true
    };
    Logger.log("Returning notification config "+JSON.stringify(reportNotifyConfig));
    return reportNotifyConfig;
  }

  ptap.registerTripEnd = function() {
    Logger.log( "registertripEnd received!" );
    // iOS
    var notifyPlugin = $window.cordova.plugins.BEMTransitionNotification;
    notifyPlugin.addEventListener(notifyPlugin.TRIP_END, getTripEndReportNotification())
        .then(function(result) {
            // $window.broadcaster.addEventListener("TRANSITION_NAME",  function(result) {
            Logger.log("Finished registering "+notifyPlugin.TRIP_END+" with result "+JSON.stringify(result));
        })
        .catch(function(error) {
            Logger.displayError("Unable to register notifications for trip end", error);
        });
  }

  var getFormattedTime = function(ts_in_secs) {
    if (angular.isDefined(ts_in_secs)) {
      return moment(ts_in_secs * 1000).format('LT');
    } else {
      return "---";
    }
  };

  var promptReport = function(notification, state, data) {
    Logger.log("About to prompt whether to report a trip");
    var newScope = $rootScope.$new();
    angular.extend(newScope, notification.data);
    newScope.getFormattedTime = getFormattedTime;
    Logger.log("notification = "+JSON.stringify(notification));
    Logger.log("state = "+JSON.stringify(state));
    Logger.log("data = "+JSON.stringify(data));
    return $ionicPopup.show({title: "Report incident for trip",
        scope: newScope,
        template: "{{getFormattedTime(start_ts)}} -> {{getFormattedTime(end_ts)}}",
        buttons: [{
          text: 'Report',
          type: 'button-positive',
          onTap: function(e) {
            // e.preventDefault() will stop the popup from closing when tapped.
            return true;
          }
        }, {
          text: 'Skip',
          type: 'button-positive',
          onTap: function(e) {
            return false;
          }
        }]
    })
  }

  var cleanDataIfNecessary = function(notification, state, data) {
    if ($ionicPlatform.is('ios') && angular.isDefined(notification.data)) {
      Logger.log("About to parse "+notification.data);
      notification.data = JSON.parse(notification.data);
    }
  };

  var displayCompletedTrip = function(notification, state, data) {
    Logger.log("About to display completed trip");

    /*
    promptReport(notification, state, data).then(function(res) {
      if (res == true) {
        console.log("About to go to incident map page");
        $state.go("root.main.incident", notification.data);
      } else {
        console.log("Skipped incident reporting");
      }
    });
    */

    Logger.log("About to go to diary, which now displays draft information");
    $rootScope.displayingIncident = true;
    $state.go("root.main.diary");
  };

  var checkCategory = function(notification) {
    if (notification.category == REPORT_INCIDENT_TEXT) {
        return true;
    } else {
        return false;
    }
  }

  ptap.registerUserResponse = function() {
    Logger.log( "registerUserResponse received!" );
    $window.cordova.plugins.notification.local.on('action', function (notification, state, data) {
      if (!checkCategory(notification)) {
          Logger.log("notification "+notification+" is not an incident report, returning...");
          return;
      }
      if (data.identifier === 'REPORT') {
          // alert("About to report");
          cleanDataIfNecessary(notification, state, data);
          displayCompletedTrip(notification, state, data);
      } else if (data.identifier == 'SNOOZE') {
        var now = new Date().getTime(),
            _30_mins_from_now = new Date(now + 30 * 60 * 1000);
        var after_30_mins_prompt = getTripEndReportNotification();
        after_30_mins_prompt.at = _30_mins_from_now;
        $window.cordova.plugins.notification.local.schedule([after_30_mins_prompt]);
        if ($ionicPlatform.is('android')) {
            $ionicPopup.alert({
                title: "Snoozed reminder",
                template: "Will reappear in 30 mins"
            });
        }
      } else if (data.identifier === 'MUTE') {
        var now = new Date().getTime(),
            _1_min_from_now = new Date(now + 60 * 1000);
        var notifyPlugin = $window.cordova.plugins.BEMTransitionNotification;
        notifyPlugin.disableEventListener(notifyPlugin.TRIP_END, notification).then(function() {
            if ($ionicPlatform.is('ios')) {
                $window.cordova.plugins.notification.local.schedule([{
                    id: REPORT,
                    title: "Notifications for TRIP_END incident report muted",
                    text: "Can be re-enabled from the Profile -> Developer Zone screen. Select to re-enable now, clear to ignore",
                    at: _1_min_from_now,
                    data: {redirectTo: "root.main.control"}
                }]);
            } else if ($ionicPlatform.is('android')) {
                $ionicPopup.show({
                    title: "Muted",
                    template: "Notifications for TRIP_END incident report muted",
                    buttons: [{
                      text: 'Unmute',
                      type: 'button-positive',
                      onTap: function(e) {
                        return true;
                      }
                    }, {
                      text: 'Keep muted',
                      type: 'button-positive',
                      onTap: function(e) {
                        return false;
                      }
                    }]
                }).then(function(res) {
                    if(res == true) {
                        notifyPlugin.enableEventListener(notifyPlugin.TRIP_END, notification);
                    } else {
                        Logger.log("User chose to keep the transition muted");
                    }
                });
            }
        }).catch(function(error) {
            Logger.displayError(
                "Error while muting notifications for trip end. Try again later.",
                error);
        });
      }
    });
    $window.cordova.plugins.notification.local.on('clear', function (notification, state, data) {
        // alert("notification cleared, no report");
    });
    $window.cordova.plugins.notification.local.on('cancel', function (notification, state, data) {
        // alert("notification cancelled, no report");
    });
    $window.cordova.plugins.notification.local.on('trigger', function (notification, state, data) {
        // alert("triggered, no action");
        Logger.log("triggered, no action");
        if (!$ionicPlatform.is('ios')) {
            Logger.log("notification is displayed even when app is in foreground, ignoring trigger");
            return;
        }
        if (!checkCategory(notification)) {
            Logger.log("notification "+notification+" is not an incident report, returning...");
            return;
        }
        cleanDataIfNecessary(notification, state, data);
        promptReport(notification, state, data).then(function(res) {
          if (res == true) {
            Logger.log("About to go to incident map page");
            displayCompletedTrip(notification, state, data);
          } else {
            Logger.log("Skipped incident reporting");
          }
        });
    });
    $window.cordova.plugins.notification.local.on('click', function (notification, state, data) {
      // alert("clicked, no action");
      if (!checkCategory(notification)) {
          Logger.log("notification "+notification+" is not an incident report, returning...");
          return;
      }
      cleanDataIfNecessary(notification, state, data);
      displayCompletedTrip(notification, state, data);
    });
  }

  $ionicPlatform.ready().then(function() {
    ptap.registerTripEnd();
    ptap.registerUserResponse();
  });

  return ptap;

});
