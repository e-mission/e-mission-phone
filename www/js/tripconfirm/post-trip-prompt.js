'use strict';

angular.module('emission.tripconfirm.posttrip.prompt', ['emission.plugin.logger'])
.factory("PostTripAutoPrompt", function($window, $ionicPlatform, $rootScope, $state,
    $ionicPopup, Logger, $translate) {
  var ptap = {};
  var REPORT = 737678; // REPORT on the phone keypad
  var TRIP_CONFIRM_TEXT = 'TRIP_CONFIRM';
  var TRIP_END_EVENT = "trip_ended";

  var reportMessage = function(platform) {
    var platformSpecificMessage = {
      "ios": $translate.instant('post-trip-prompt.platform-specific-message-ios'),
      "android": $translate.instant('post-trip-prompt.platform-specific-message-android')
    };
    var selMessage = platformSpecificMessage[platform];
    if (!angular.isDefined(selMessage)) {
      selMessage = $translate.instant('post-trip-prompt.platform-specific-message-other');
    }
    return selMessage;
  };

  var getTripEndReportNotification = function() {
    var actions = [{
       identifier: 'MUTE',
       title: $translate.instant('post-trip-prompt.notification-option-mute'),
       icon: 'res://ic_moreoptions',
       activationMode: 'background',
       destructive: false,
       authenticationRequired: false
    }, {
       identifier: 'SNOOZE',
       title: $translate.instant('post-trip-prompt.notification-option-snooze'),
       icon: 'res://ic_moreoptions',
       activationMode: 'background',
       destructive: false,
       authenticationRequired: false
    }, {
        identifier: 'CHOOSE',
        title: $translate.instant('post-trip-prompt.notification-option-choose'),
        icon: 'res://ic_signin',
        activationMode: 'foreground',
        destructive: false,
        authenticationRequired: false
    }];

    var reportNotifyConfig = {
      id: REPORT,
      title: $translate.instant('post-trip-prompt.notification-title'),
      text: reportMessage(ionic.Platform.platform()),
      icon: 'file://img/icon.png',
      smallIcon: 'res://ic_mood_question.png',
      sound: null,
      actions: actions,
      category: TRIP_CONFIRM_TEXT,
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
    Logger.log("About to prompt choose the mode for the trip");
    var newScope = $rootScope.$new();
    angular.extend(newScope, notification.data);
    newScope.getFormattedTime = getFormattedTime;
    Logger.log("notification = "+JSON.stringify(notification));
    Logger.log("state = "+JSON.stringify(state));
    Logger.log("data = "+JSON.stringify(data));
    return $ionicPopup.show({title: "Choose the travel mode and purpose of this trip",
        scope: newScope,
        template: "{{getFormattedTime(start_ts)}} -> {{getFormattedTime(end_ts)}}",
        buttons: [{
          text: $translate.instant('post-trip-prompt.choose-mode'),
          type: 'button-positive',
          onTap: function(e) {
            // e.preventDefault() will stop the popup from closing when tapped.
            return true;
          }
        }, {
          text: $translate.instant('post-trip-prompt.skip'),
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
    $rootScope.tripConfirmParams = notification.data;
      Logger.log("About to display completed trip from notification "+
        JSON.stringify(notification.data));
      $state.go("root.main.tripconfirm", notification.data);
  };

  var checkCategory = function(notification) {
    if (notification.category == TRIP_CONFIRM_TEXT) {
        return true;
    } else {
        return false;
    }
  }

  ptap.registerUserResponse = function() {
    Logger.log( "registerUserResponse received!" );
    $window.cordova.plugins.notification.local.on('action', function (notification, state, data) {
      if (!checkCategory(notification)) {
          Logger.log("notification "+notification+" is not an mode choice, returning...");
          return;
      }
      if (data.identifier === 'CHOOSE') {
          Logger.log("Notification, action event");
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
              title: $translate.instant('post-trip-prompt.snoozed-reminder'),
              template: $translate.instant('post-trip-prompt.snoozed-reapper-message')
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
                    title: $translate.instant('post-trip-prompt.notifications-muted'),
                    text: $translate.instant('post-trip-prompt.notifications-reenabled'),
                    at: _1_min_from_now,
                    data: {redirectTo: "root.main.control"}
                }]);
            } else if ($ionicPlatform.is('android')) {
                $ionicPopup.show({
                    title: $translate.instant('post-trip-prompt.muted'),
                    template: $translate.instant('post-trip-prompt.notifications-muted'),
                    buttons: [{
                      text: $translate.instant('post-trip-prompt.unmute'),
                      type: 'button-positive',
                      onTap: function(e) {
                        return true;
                      }
                    }, {
                      text: $translate.instant('post-trip-prompt.keep-muted'),
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
            Logger.displayError("Error while muting notifications for trip end. Try again later.", error);
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
        Logger.log("Notification triggered");
        if (!checkCategory(notification)) {
            Logger.log("notification "+notification+" is not an mode choice, returning...");
            return;
        }
        cleanDataIfNecessary(notification, state, data);
        if($ionicPlatform.is('ios')) {
            promptReport(notification, state, data).then(function(res) {
              if (res == true) {
                  Logger.log("About to go to prompt page");
                displayCompletedTrip(notification, state, data);
              } else {
                Logger.log("Skipped confirmation reporting");
              }
            });
        } else {
          Logger.log("About to go to prompt page");
          displayCompletedTrip(notification, state, data);
        }
    });
    $window.cordova.plugins.notification.local.on('click', function (notification, state, data) {
      // alert("clicked, no action");
      Logger.log("Notification, click event");
      if (!checkCategory(notification)) {
          Logger.log("notification "+notification+" is not an mode choice, returning...");
          return;
      }
      cleanDataIfNecessary(notification, state, data);
      displayCompletedTrip(notification, state, data);
    });
  };

  $ionicPlatform.ready().then(function() {
    ptap.registerTripEnd();
    ptap.registerUserResponse();
  });

  return ptap;

});
