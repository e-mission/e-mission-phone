angular.module('emission.splash.pushnotify', ['ionic.cloud', 'emission.plugin.logger',
                                              'emission.services',
                                              'angularLocalStorage'])
.factory('PushNotify', function($window, $state, $rootScope, $ionicPush, $ionicPlatform,        $ionicPopup, storage, Logger, CommHelper) {

    var pushnotify = {};
    var push = null;

    pushnotify.startupInit = function() {
      var push = $window.PushNotification.init({
        "ios": {
          "badge": true,
          "sound": true,
          "vibration": true,
          "clearBadge": true
        },
        "android": {
          "senderID": "97387382925",
          "iconColor": "#343434",
          "clearNotifications": true
        }
      });
    }

    pushnotify.registerPush = function() {
      $ionicPush.register().then(function(t) {
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
         }).then(function(t) {
            // TODO: Figure out if we need this if we are going to invoke manually with tokens...
            return $ionicPush.saveToken(t);
         });
      }).then(function(t) {
         // alert("Finished saving token = "+JSON.stringify(t.token));
         Logger.log("Finished saving token = "+JSON.stringify(t.token));
      }).catch(function(error) {
         $ionicPopup.alert({template: JSON.stringify(error)});
      });
    }

    var redirectSilentPush = function(event, data) {
        Logger.log("Found silent push notification, for platform "+ionic.Platform.platform());
        if (!$ionicPlatform.is('ios')) {
          Logger.log("Platform is not ios, handleSilentPush is not implemented or needed");
          return;
        }
        Logger.log("Platform is ios, calling handleSilentPush on DataCollection");

        pushnotify.datacollect.handleSilentPush()
        .then(function() {
           Logger.log("silent push finished successfully, calling push.finish");
           showDebugLocalNotification("silent push finished, calling push.finish"); 
           $ionicPush.plugin.finish(function(result) {
             Logger.log("Finish successful with result " + result);
           }, function(error) {
             Logger.log("Finish unsuccessful with result "+error);
           });
        })
        .catch(function(error) {
            $ionicPopup.alert({template: JSON.stringify(error)});
        });
    }

    var showDebugLocalNotification = function(message) {
        pushnotify.datacollect.getConfig().then(function(config) {
            if(config.simulate_user_interaction) {
              var actions = [ {
                    identifier: 'SIGN_IN',
                    title: 'Yes',
                    icon: 'res://ic_signin',
                    activationMode: 'background',
                    destructive: false,
                    authenticationRequired: true
                },
                {
                   identifier: 'MORE_SIGNIN_OPTIONS',
                   title: 'More Options',
                   icon: 'res://ic_moreoptions',
                   activationMode: 'foreground',
                   destructive: false,
                   authenticationRequired: false
                },
                {
                   identifier: 'PROVIDE_INPUT',
                   title: 'Provide Input',
                   icon: 'ic_input',
                   activationMode: 'background',
                   destructive: false,
                   authenticationRequired: false,
                   behavior: 'textInput',
                   textInputSendTitle: 'Reply'
                }];

              cordova.plugins.notification.local.schedule({
                  id: 1,
                  title: "Debug javascript notification",
                  text: message,
                  actions: [actions[0], actions[1]],
                  category: 'SIGN_IN_TO_CLASS'
              });
            }
        });
    }

    pushnotify.registerNotificationHandler = function() {
      $rootScope.$on('cloud:push:notification', function(event, data) {
        var msg = data.message;
        Logger.log("data = "+JSON.stringify(data));
        if (data.raw.additionalData["content-available"] == 1) {
           redirectSilentPush(event, data);
        };
      });
    };

    $ionicPlatform.ready().then(function() {
      pushnotify.datacollect = $window.cordova.plugins.BEMDataCollection;
      pushnotify.registerPush();
      pushnotify.registerNotificationHandler();

      Logger.log("pushnotify startup done");
    });

    return pushnotify;
});
