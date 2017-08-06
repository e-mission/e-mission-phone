'use strict';

angular.module('emission.incident.potentialincident.prompt', ['emission.plugin.logger'])
.factory("PotentialIncidentAutoPrompt", function($window, $ionicPlatform, $rootScope, $state,
    $ionicPopup, Logger) {
  var piap = {};
  var REPORT = 74253; //Shake on the phone keypad
  var REPORT_INCIDENT_TEXT = 'REPORT_INCIDENT';
  var POTENTIAL_INCIDENT_EVENT = "potential_incident";
  var SHAKE_INCIDENT = "shake/incident";

  var reportMessage = function(platform) {
    var platformSpecificMessage = {
      "ios": "Swipe right to report any positive or negative experiences. Select 'Neither' for an unintended incident report. Swipe left for more.",
      "android": "Touch to report any positive or negative experiences. Select 'Neither' for an unintended incident report."
    };
    var selMessage = platformSpecificMessage[platform];
    if (!angular.isDefined(selMessage)) {
      selMessage = "Select to report any positive or negative experiences on this trip.";
    }
    return selMessage;
  };

  var getPotentialIncidentReportNotification = function() {
    Logger.log("getPotentialIncidentReportNotification start");

    var actions = [{
       identifier: 'FALSE_POSITIVE',
       title: 'Neither',
       icon: 'res://ic_moreoptions',
       activationMode: 'background',
       destructive: false,
       authenticationRequired: false
    }, {
       identifier: 'NEGATIVE_INCIDENT',
       title: 'Negative',
       icon: 'res://ic_moreoptions',
       activationMode: 'background',
       destructive: false,
       authenticationRequired: false
    }, {
        identifier: 'POSITIVE_INCIDENT',
        title: 'Positive',
        icon: 'res://ic_moreoptions',
        activationMode: 'background',
        destructive: false,
        authenticationRequired: false
    }];

    Logger.log("reportNotifyConfig start");

    var reportNotifyConfig = {
      id: REPORT,
      title: "Incident Detected",
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

  piap.registerPotentialIncident = function() {
    Logger.log( "registerPotentialIncident received!" );
    // iOS

    var notifyPlugin = $window.cordova.plugins.BEMShakeNotification;
    notifyPlugin.addEventListener(notifyPlugin.POTENTIAL_INCIDENT, getPotentialIncidentReportNotification())
        .then(function(result) {
            // $window.broadcaster.addEventListener("TRANSITION_NAME",  function(result) {
            Logger.log("Finished registering "+notifyPlugin.POTENTIAL_INCIDENT+" with result "+JSON.stringify(result));
        })
        .catch(function(error) {
            Logger.log(JSON.stringify(error));
            $ionicPopup.alert({
                title: "Unable to register notifications for potential incident",
                template: JSON.stringify(error)
            });
        });;
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


  var checkCategory = function(notification) {
    if (notification.category == REPORT_INCIDENT_TEXT) {
        return true;
    } else {
        return false;
    }
  }

  piap.registerUserResponse = function() {
    Logger.log( "registerUserResponse received!" );
    $window.cordova.plugins.notification.local.on('action', function (notification, state, data) {
      if (!checkCategory(notification)) {
          Logger.log("notification "+notification+" is not an incident report, returning...");
          return;
      }

      Logger.log("notification = "+JSON.stringify(notification));

      if (data.identifier == 'POSITIVE_INCIDENT') {
          Logger.log("Positive incident detected");

          var value = {
            latitude: notification.inc_latitude,
            longitude: notification.inc_longitude,
            altitude: notification.inc_altitude,
            bearing: notification.inc_bearing,
            xAccel: notification.inc_xAccel,
            yAccel: notification.inc_yAccel,
            zAccel: notification.inc_zAccel,
            combAccel: notification.inc_combAccel,
            accuracy: notification.inc_accuracy,
            speed: notification.inc_speed,
            ts: notification.inc_ts,
            incidentType: "POSITIVE_INCIDENT"
          }

          $window.cordova.plugins.BEMUserCache.putMessage(SHAKE_INCIDENT, value)


      } else if (data.identifier == 'NEGATIVE_INCIDENT') {
          Logger.log("Negative incident detected");  
           var value = {
             latitude: notification.inc_latitude,
             longitude: notification.inc_longitude,
             altitude: notification.inc_altitude,
             bearing: notification.inc_bearing,
             xAccel: notification.inc_xAccel,
             yAccel: notification.inc_yAccel,
             zAccel: notification.inc_zAccel,
             combAccel: notification.inc_combAccel,
             accuracy: notification.inc_accuracy,
             speed: notification.inc_speed,
             ts: notification.inc_ts,
             incidentType: "NEGATIVE_INCIDENT"
           }

           $window.cordova.plugins.BEMUserCache.putMessage(SHAKE_INCIDENT, value)
      } else if (data.identifier == 'FALSE_POSITIVE') {
          Logger.log("false positive detected");
           var value = {
             latitude: notification.inc_latitude,
             longitude: notification.inc_longitude,
             altitude: notification.inc_altitude,
             bearing: notification.inc_bearing,
             xAccel: notification.inc_xAccel,
             yAccel: notification.inc_yAccel,
             zAccel: notification.inc_zAccel,
             combAccel: notification.inc_combAccel,
             accuracy: notification.inc_accuracy,
             speed: notification.inc_speed,
             ts: notification.inc_ts,
             incidentType: "FALSE_POSITIVE"
           }

           $window.cordova.plugins.BEMUserCache.putMessage(SHAKE_INCIDENT, value)
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
            Logger.log("About to go to incident map page? deleted map call");
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
    });
  }

  $ionicPlatform.ready().then(function() {
    piap.registerPotentialIncident();
    piap.registerUserResponse();
  });

  return piap;

});
