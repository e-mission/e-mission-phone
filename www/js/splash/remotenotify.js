/*
 * This module deals with handling specific push messages that open web pages
 * or popups. It does not interface with the push plugin directly. Instead, it
 * assumes that another module (currently `pushnotify`) deals with the plugin
 * interface and emits a CLOUD_NOTIFICATION_EVENT when a push notification is
 * received.
 *
 * This allows us to decouple the push handling logic from push notification
 * interface. Note that the local notification is not currently decoupled since
 * it only supports redirection to a specific app page. If the local
 * notification handling gets more complex, we should consider decoupling it as well.
 */
'use strict';

angular.module('emission.splash.remotenotify', ['emission.plugin.logger',
                    'emission.splash.startprefs',
                    'emission.stats.clientstats'])

.factory('RemoteNotify', function($http, $window, $ionicPopup, $rootScope, ClientStats,
    CommHelper, Logger) {

    var remoteNotify = {};
    remoteNotify.options = "location=yes,clearcache=no,toolbar=yes,hideurlbar=yes";

    /*
     TODO: Potentially unify with the survey URL loading
     */
    remoteNotify.launchWebpage = function(url) {
      // THIS LINE FOR inAppBrowser
      let iab = $window.cordova.InAppBrowser.open(url, '_blank', remoteNotify.options);
    }

    remoteNotify.launchPopup = function(title, text) {
      // THIS LINE FOR inAppBrowser
      let alertPopup = $ionicPopup.alert({
        title: title,
        template: text
      });
    }

    remoteNotify.init = function() {
      $rootScope.$on('cloud:push:notification', function(event, data) {
        ClientStats.addEvent(ClientStats.getStatKeys().NOTIFICATION_OPEN).then(
            function() {
                console.log("Added "+ClientStats.getStatKeys().NOTIFICATION_OPEN+" event. Data = " + JSON.stringify(data));
              });
        Logger.log("data = "+JSON.stringify(data));
        if (angular.isDefined(data.additionalData) &&
            angular.isDefined(data.additionalData.payload) &&
            angular.isDefined(data.additionalData.payload.alert_type)) {
            if(data.additionalData.payload.alert_type == "website") {
                var webpage_spec = data.additionalData.payload.spec;
                if (angular.isDefined(webpage_spec) &&
                    angular.isDefined(webpage_spec.url) &&
                    webpage_spec.url.startsWith("https://")) {
                    remoteNotify.launchWebpage(webpage_spec.url);
                } else {
                    $ionicPopup.alert("webpage was not specified correctly. spec is "+JSON.stringify(webpage_spec));
                }
            }
            if(data.additionalData.payload.alert_type == "popup") {
                var popup_spec = data.additionalData.payload.spec;
                if (angular.isDefined(popup_spec) &&
                    angular.isDefined(popup_spec.title) &&
                    angular.isDefined(popup_spec.text)) {
                    remoteNotify.launchPopup(popup_spec.title, popup_spec.text);
                } else {
                    $ionicPopup.alert("webpage was not specified correctly. spec is "+JSON.stringify(popup_spec));
                }
            }
        }
      });
    }

    remoteNotify.init();
    return remoteNotify;
});
