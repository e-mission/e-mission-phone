/*
 * We think that a common pattern is to generate a prompt to notify the user
 * about something and then to re-route them to the appropriate tab. An
 * existing example is the notification prompt. So let's write a standard
 * factory to make that easier.
 */

import angular from 'angular';

angular.module('emission.splash.localnotify', ['emission.plugin.logger',
                                              'emission.splash.startprefs',
                                              'ionic-toast'])
.factory('LocalNotify', function($window, $ionicPlatform, $ionicPopup,
    $state, $rootScope, ionicToast, Logger) {
  var localNotify = {};

  /*
   * Return the state to redirect to, undefined otherwise
   */
  localNotify.getRedirectState = function(data) {
    // TODO: Think whether this should be in data or in category
    if (angular.isDefined(data)) {
      return [data.redirectTo, data.redirectParams];
    }
    return undefined;
  }

  localNotify.handleLaunch = function(targetState, targetParams) {
    $rootScope.redirectTo = targetState;
    $rootScope.redirectParams = targetParams;
    $state.go(targetState, targetParams, { reload : true });
  }

  localNotify.handlePrompt = function(notification, targetState, targetParams) {
    Logger.log("Prompting for notification "+notification.title+" and text "+notification.text);
    var promptPromise = $ionicPopup.show({title: notification.title,
        template: notification.text,
        buttons: [{
          text: 'Handle',
          type: 'button-positive',
          onTap: function(e) {
            // e.preventDefault() will stop the popup from closing when tapped.
            return true;
          }
        }, {
          text: 'Ignore',
          type: 'button-positive',
          onTap: function(e) {
            return false;
          }
        }]
    });
    promptPromise.then(function(handle) {
      if (handle == true) {
        localNotify.handleLaunch(targetState, targetParams);
      } else {
        Logger.log("Ignoring notification "+notification.title+" and text "+notification.text);
      }
    });
  }

  localNotify.handleNotification = function(notification,state,data) {
    // Comment this out for ease of testing. But in the real world, we do in fact want to 
    // cancel the notification to avoid "hey! I just fixed this, why is the notification still around!"
    // issues
    // $window.cordova.plugins.notification.local.cancel(notification.id);
    let redirectData = notification;
    if (state.event == 'action') {
      redirectData = notification.data.action;
    }
    var [targetState, targetParams] = localNotify.getRedirectState(redirectData);
    Logger.log("targetState = "+targetState);
    if (angular.isDefined(targetState)) {
      if (state.foreground == true) {
        localNotify.handlePrompt(notification, targetState, targetParams);
      } else {
        localNotify.handleLaunch(targetState, targetParams);
      }
    }
  }

  localNotify.registerRedirectHandler = function() {
    Logger.log( "registerUserResponse received!" );
    $window.cordova.plugins.notification.local.on('action', function (notification, state, data) {
      localNotify.handleNotification(notification, state, data);
    });
    $window.cordova.plugins.notification.local.on('clear', function (notification, state, data) {
        // alert("notification cleared, no report");
    });
    $window.cordova.plugins.notification.local.on('cancel', function (notification, state, data) {
        // alert("notification cancelled, no report");
    });
    $window.cordova.plugins.notification.local.on('trigger', function (notification, state, data) {
      ionicToast.show(`Notification: ${notification.title}\n${notification.text}`, 'bottom', false, 250000);
      localNotify.handleNotification(notification, state, data);
    });
    $window.cordova.plugins.notification.local.on('click', function (notification, state, data) {
      localNotify.handleNotification(notification, state, data);
    });
  }

  $ionicPlatform.ready().then(function() {
    localNotify.registerRedirectHandler();
    Logger.log("finished registering handlers, about to fire queued events");
    $window.cordova.plugins.notification.local.fireQueuedEvents();
  });

  return localNotify;    
});
