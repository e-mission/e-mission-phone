angular.module('emission.splash.pushnotify', ['emission.plugin.logger',
                                              'emission.services',
                                              'emission.splash.startprefs',
                                              'angularLocalStorage'])
.factory('PushNotify', function($window, $state, $rootScope, $ionicPlatform,
    $ionicPopup, storage, Logger, CommHelper, StartPrefs) {

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
          "senderID": "1096592179912",
          "iconColor": "#54DCC1",
          "icon": "ic_question_answer",
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
               if(angular.isDefined(data.additionalData.data)) {
                  data.additionalData.data = JSON.parse(data.additionalData.data);
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
             CommHelper.updateUser({
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
         var display_msg = error.message + "\n" + error.stack;
         $ionicPopup.alert({title: "Error in registering push notifications",
            template: display_msg});
         Logger.log("Error in registering push notifications "+display_msg);
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
            $ionicPopup.alert({title: "Error while handling silent push notifications",
                template: JSON.stringify(error)});
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
      StartPrefs.readConsentState()
        .then(StartPrefs.isConsented)
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

    $rootScope.$on(StartPrefs.CONSENTED_EVENT, function(event, data) {
      console.log("got consented event "+JSON.stringify(event.name)
                      +" with data "+ JSON.stringify(data));
      if (StartPrefs.isIntroDone()) {
          console.log("intro is done -> reconsent situation, we already have a token -> register");
          pushnotify.registerPush();
      }
    });

    $rootScope.$on(StartPrefs.INTRO_DONE_EVENT, function(event, data) {
          console.log("intro is done -> original consent situation, we should have a token by now -> register");
       pushnotify.registerPush();
    });

    return pushnotify;
});
