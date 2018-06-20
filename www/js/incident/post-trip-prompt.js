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
      "ios": "Desliza a la derecha para informar el motivo y medio de transporte de tu viaje. ¿Ocupado? Pausar 30 min. ¿Molesto? Silenciar.",
     "android": "Seleccionar para informar motivo y medio de transporte de tu viaje. ¿Ocupado? Pausar 30 minutos. ¿Molesto? Silenciar"
    };
    var selMessage = platformSpecificMessage[platform];
    if (!angular.isDefined(selMessage)) {
      selMessage = "Seleccionar para informar motivo y medio de transporte de tu viaje. ¿Ocupado? Pausar 30 minutos. ¿Molesto? Silenciar.";
    }
    return selMessage;
  };

  var getTripEndReportNotification = function() {
    var actions = [{
       identifier: 'MUTE',
       title: 'Silenciar',
       icon: 'res://ic_moreoptions',
       activationMode: 'background',
       destructive: false,
       authenticationRequired: false
    }, {
       identifier: 'SNOOZE',
       title: 'Pausar',
       icon: 'res://ic_moreoptions',
       activationMode: 'background',
       destructive: false,
       authenticationRequired: false
    }, {
        identifier: 'REPORT',
        title: 'Sí',
        icon: 'res://ic_signin',
        activationMode: 'foreground',
        destructive: false,
        authenticationRequired: false
    }];

    var reportNotifyConfig = {
      id: REPORT,
      title: "¿Informar sobre el viaje?",
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
            Logger.log(JSON.stringify(error));
            $ionicPopup.alert({
                title: "No se pudo registrar la notificación de fin de viaje.",
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
    return $ionicPopup.show({title: "Reportar incidente",
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

    $state.go("root.main.incident", notification.data);
    /*Logger.log("About to go to diary, which now displays draft information");
    $rootScope.displayingIncident = true;
    $state.go("root.main.diary");*/
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
              title: "Recordatorio",
              template: "Las notificaciones se activarán e 30 min."
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
                    title: "Desactivar notificiones",
                    text: "Las notificciones de finalización de vije se han desactivado.",
                    at: _1_min_from_now,
                    data: {redirectTo: "root.main.control"}
                }]);
            } else if ($ionicPlatform.is('android')) {
                $ionicPopup.show({
                    title: "Desactivar notificiones",
                    template: "Las notificciones de finalización de vije se han desactivado.",
                    buttons: [{
                      text: 'Activar',
                      type: 'button-positive',
                      onTap: function(e) {
                        return true;
                      }
                    }, {
                      text: 'Dejar desactivado',
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
            $ionicPopup.alert({
                title: "Error mientras se desactivaban las notificaciones. Intenta de nuevo más tarde.",
                template: JSON.stringify(error)
            });
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
