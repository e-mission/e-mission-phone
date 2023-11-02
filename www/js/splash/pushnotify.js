//naming of this file can be a little confusing - "pushnotifysettings" for rewritten file
//https://github.com/e-mission/e-mission-phone/pull/1072#discussion_r1375360832


/*
 * This module deals with the interaction with the push plugin, the redirection
 * of silent push notifications and the re-parsing of iOS pushes. It then
 * re-emits a CLOUD_NOTIFICATION_EVENT that other modules can listen to.
 *
 * Other modules, such as the survey code, and the remotenotify module, listen
 * to these CLOUD_NOTIFICATION_EVENTs and handle them through launching
 * surveys, displaying popups, etc.
 *
 * This allows us to decouple the push handling logic from push notification
 * interface. Note that the local notification is not currently decoupled since
 * it only supports redirection to a specific app page. If the local
 * notification handling gets more complex, we should consider decoupling it as well.
 */

import angular from 'angular';
import { updateUser } from '../commHelper';
import { readConsentState, isConsented } from './startprefs';

angular.module('emission.splash.pushnotify', ['emission.plugin.logger',
                                              'emission.services'])
.factory('PushNotify', function($window, $state, $rootScope, $ionicPlatform,
    $ionicPopup, Logger) {

    var pushnotify = {};
    var push = null;
    pushnotify.CLOUD_NOTIFICATION_EVENT = 'cloud:push:notification';

    pushnotify.startupInit = function() {
      push = $window.PushNotification.init({
        "ios": {
          "badge": true,
          "sound": true,
          "vibration": true,
          "clearBadge": true
        },
        "android": {
          "iconColor": "#008acf",
          "icon": "ic_mood_question",
          "clearNotifications": true
        }
      });
      push.on('notification', function(data) {
        if ($ionicPlatform.is('ios')) {
            // Parse the iOS values that are returned as strings
            if(angular.isDefined(data) &&
               angular.isDefined(data.additionalData)) {
               if(angular.isDefined(data.additionalData.payload)) {
                  data.additionalData.payload = JSON.parse(data.additionalData.payload);
               }
               if(angular.isDefined(data.additionalData.data) && typeof(data.additionalData.data) == "string") {
                  data.additionalData.data = JSON.parse(data.additionalData.data);
               } else {
                  console.log("additionalData is already an object, no need to parse it");
               }
            } else {
                Logger.log("No additional data defined, nothing to parse");
            }
        }
        $rootScope.$emit(pushnotify.CLOUD_NOTIFICATION_EVENT, data);
      });
    }

    pushnotify.registerPromise = function() {
        return new Promise(function(resolve, reject) {
            pushnotify.startupInit();
            push.on("registration", function(data) {
                console.log("Got registration " + data);
                resolve({token: data.registrationId,
                         type: data.registrationType});
            });
            push.on("error", function(error) {
                console.log("Got push error " + error);
                reject(error);
            });
            console.log("push notify = "+push);
        });
    }

    pushnotify.registerPush = function() {
      pushnotify.registerPromise().then(function(t) {
         // alert("Token = "+JSON.stringify(t));
         Logger.log("Token = "+JSON.stringify(t));
         return $window.cordova.plugins.BEMServerSync.getConfig().then(function(config) {
            return config.sync_interval;
         }, function(error) {
            console.log("Got error "+error+" while reading config, returning default = 3600");
            return 3600;
         }).then(function(sync_interval) {
             updateUser({
                device_token: t.token,
                curr_platform: ionic.Platform.platform(),
                curr_sync_interval: sync_interval
             });
             return t;
         });
      }).then(function(t) {
         // alert("Finished saving token = "+JSON.stringify(t.token));
         Logger.log("Finished saving token = "+JSON.stringify(t.token));
      }).catch(function(error) {
        Logger.displayError("Error in registering push notifications", error);
      });
    }

    var redirectSilentPush = function(event, data) {
        Logger.log("Found silent push notification, for platform "+ionic.Platform.platform());
        if (!$ionicPlatform.is('ios')) {
          Logger.log("Platform is not ios, handleSilentPush is not implemented or needed");
          // doesn't matter if we finish or not because platforms other than ios don't care
          return;
        }
        Logger.log("Platform is ios, calling handleSilentPush on DataCollection");
        var notId = data.additionalData.payload.notId;
        var finishErrFn = function(error) {
            Logger.log("in push.finish, error = "+error);
        };

        pushnotify.datacollect.getConfig().then(function(config) {
          if(config.ios_use_remote_push_for_sync) {
            pushnotify.datacollect.handleSilentPush()
            .then(function() {
               Logger.log("silent push finished successfully, calling push.finish");
               showDebugLocalNotification("silent push finished, calling push.finish"); 
               push.finish(function(){}, finishErrFn, notId);
            })
          } else {
            Logger.log("Using background fetch for sync, no need to redirect push");
            push.finish(function(){}, finishErrFn, notId);
          };
        })
        .catch(function(error) {
            push.finish(function(){}, finishErrFn, notId);
            Logger.displayError("Error while redirecting silent push", error);
        });
    }

    var showDebugLocalNotification = function(message) {
        pushnotify.datacollect.getConfig().then(function(config) {
            if(config.simulate_user_interaction) {
              cordova.plugins.notification.local.schedule({
                  id: 1,
                  title: "Debug javascript notification",
                  text: message,
                  actions: [],
                  category: 'SIGN_IN_TO_CLASS'
              });
            }
        });
    }

    pushnotify.registerNotificationHandler = function() {
      $rootScope.$on(pushnotify.CLOUD_NOTIFICATION_EVENT, function(event, data) {
        Logger.log("data = "+JSON.stringify(data));
        if (data.additionalData["content-available"] == 1) {
           redirectSilentPush(event, data);
        }; // else no need to call finish
      });
    };

    $ionicPlatform.ready().then(function() {
      pushnotify.datacollect = $window.cordova.plugins.BEMDataCollection;
      readConsentState()
        .then(isConsented)
        .then(function(consentState) {
          if (consentState == true) {
              pushnotify.registerPush();
          } else {
            Logger.log("no consent yet, waiting to sign up for remote push");
          }
        });
      pushnotify.registerNotificationHandler();
      Logger.log("pushnotify startup done");
    });

    return pushnotify;
});
