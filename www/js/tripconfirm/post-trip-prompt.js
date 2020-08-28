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
       id: 'MUTE',
       type: 'button',
       title: $translate.instant('post-trip-prompt.notification-option-mute'),
       icon: 'res://ic_moreoptions',
       launch: true,
       destructive: false,
       authenticationRequired: false
    }, {
       id: 'SNOOZE',
       type: 'button',
       title: $translate.instant('post-trip-prompt.notification-option-snooze'),
       icon: 'res://ic_moreoptions',
       launch: true,
       destructive: false,
       authenticationRequired: false
    }, {
        id: 'CHOOSE',
        type: 'button',
        title: $translate.instant('post-trip-prompt.notification-option-choose'),
        icon: 'res://ic_signin',
        launch: true,
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
      actionGroupId: TRIP_CONFIRM_TEXT,
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

  var cleanDataIfNecessary = function(notification, eventOpts) {
    // as of version 0.9.0-beta.4, cleaning data is not necessary, since iOS also returns
    // pre-parsed notification data. Let's leave this here for a bit in case we need it
    // later, but we can also remove it if we don't need it for a year or so
  };

  var displayCompletedTrip = function(notification, eventOpts) {
    /*
    $rootScope.tripConfirmParams = notification.data;
      Logger.log("About to display completed trip from notification "+
        JSON.stringify(notification.data));
      $state.go("root.main.tripconfirm", notification.data);
    */
    Logger.log("About to go to diary, which now displays draft information");
    $rootScope.displayingIncident = true;
    $state.go("root.main.diary");
  };

  var checkCategory = function(notification) {
    if (notification.actionGroupId == TRIP_CONFIRM_TEXT) {
        return true;
    } else {
        return false;
    }
  }

  ptap.registerUserResponse = function() {
    Logger.log( "registerUserResponse received!" );
    $window.cordova.plugins.notification.local.on('CHOOSE', function (notification, eventOpts) {
      if (!checkCategory(notification)) {
          Logger.log("notification "+notification+" is not an mode choice, returning...");
          return;
      }
      Logger.log("Notification, action event");
      cleanDataIfNecessary(notification, eventOpts);
      displayCompletedTrip(notification, eventOpts);
    });
    $window.cordova.plugins.notification.local.on('SNOOZE', function (notification, eventOpts) {
      if (!checkCategory(notification)) {
          Logger.log("notification "+notification+" is not an mode choice, returning...");
          return;
      }
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
    });
    $window.cordova.plugins.notification.local.on('MUTE', function (notification, eventOpts) {
      if (!checkCategory(notification)) {
          Logger.log("notification "+notification+" is not an mode choice, returning...");
          return;
      }
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
    });
    $window.cordova.plugins.notification.local.on('clear', function (notification, eventOpts) {
        // alert("notification cleared, no report");
    });
    $window.cordova.plugins.notification.local.on('cancel', function (notification, eventOpts) {
        // alert("notification cancelled, no report");
    });
    $window.cordova.plugins.notification.local.on('trigger', function (notification, eventOpts) {
        // alert("triggered, no action");
        Logger.log("Notification triggered");
        if (!checkCategory(notification)) {
            Logger.log("notification "+notification+" is not an mode choice, returning...");
            return;
        }
        cleanDataIfNecessary(notification, eventOpts);
        if($ionicPlatform.is('ios')) {
            promptReport(notification, eventOpts).then(function(res) {
              if (res == true) {
                  Logger.log("About to go to prompt page");
                displayCompletedTrip(notification, eventOpts);
              } else {
                Logger.log("Skipped confirmation reporting");
              }
            });
        } else {
          Logger.log("About to go to prompt page");
          displayCompletedTrip(notification, eventOpts);
        }
    });
    $window.cordova.plugins.notification.local.on('click', function (notification, eventOpts) {
      // alert("clicked, no action");
      Logger.log("Notification, click event");
      if (!checkCategory(notification)) {
          Logger.log("notification "+notification+" is not an mode choice, returning...");
          return;
      }
      cleanDataIfNecessary(notification, eventOpts);
      displayCompletedTrip(notification, eventOpts);
    });
  };

  $ionicPlatform.ready().then(function() {
    ptap.registerTripEnd();
    ptap.registerUserResponse();
  });

  return ptap;

});
