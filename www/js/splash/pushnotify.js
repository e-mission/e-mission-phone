angular.module('emission.splash.pushnotify', ['ionic.cloud', 'emission.plugin.logger',
                                              'angularLocalStorage'])
.factory('PushNotify', function($window, $state, $rootScope, $ionicPush, $ionicPlatform,        $ionicPopup, storage, Logger) {

    var pushnotify = {};
    var nativeNotifyNames = {
        "ios": "TRANSITION_NOTIFY_NAME",
        "android": "TRANSITION_NOTIFY_NAME"
    }

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

    $ionicPlatform.ready().then(function() {
      $ionicPush.register().then(function(t) {
         alert("Token = "+JSON.stringify(t));
         console.log("Token = "+JSON.stringify(t));
         return $ionicPush.saveToken(t);
      }).then(function(t) {
         alert("Finished saving token = "+JSON.stringify(t.token));
         console.log("Finished saving token = "+JSON.stringify(t.token));
      }).catch(function(error) {
         $ionicPopup.alert({template: JSON.stringify(error)});
      });;
      var notifyEventName = nativeNotifyNames[ionic.Platform.platform()];
      $rootScope.$on('cloud:push:notification', function(event, data) {
        var msg = data.message;
        console.log("data = "+JSON.stringify(data));
        
        if (data.raw.additionalData["content-available"] == 1) {
          console.log("Found silent push notification, for platform "+ionic.Platform.platform());
          $window.cordova.plugins.BEMDataCollection.handleSilentPush()
            .then(function() {
               $ionicPush.plugin.finish(function(result) {
                 console.log("Finish successful with result " + result);
               }, function(error) {
                 console.log("Finish unsuccessful with result "+error);
               });
            });
        };
     });
      $window.broadcaster.addEventListener(notifyEventName, function(e) {
          console.log("Event = "+JSON.stringify(e));
          /*
          push.finish(function() {
              console.log("processing of push data is finished");
          }, function() {
              console.log("something went wrong with push.finish for ID = " + data.additionalData.notId)
          }, data.additionalData.notId);
          */
      });

      Logger.log("pushnotify startup done");
    });

    return pushnotify;
});
