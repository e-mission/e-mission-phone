import angular from 'angular';
import { updateUser } from '../commHelper';
import { isConsented, readConsentState, startPrefs } from "./startprefs";
import { readIntroDone } from '../onboarding/onboardingHelper';

angular.module('emission.splash.storedevicesettings', ['emission.plugin.logger',
                                             'emission.services'])
.factory('StoreDeviceSettings', function($window, $state, $rootScope, $ionicPlatform,
    $ionicPopup, Logger ) {

    var storedevicesettings = {};

    storedevicesettings.storeDeviceSettings = function() {
      var lang = i18next.resolvedLanguage;
      var manufacturer = $window.device.manufacturer;
      var osver = $window.device.version;
      return $window.cordova.getAppVersion.getVersionNumber().then(function(appver) {
        var updateJSON = {
          phone_lang: lang,
          curr_platform: ionic.Platform.platform(),
          manufacturer: manufacturer,
          client_os_version: osver,
          client_app_version: appver
        };
        Logger.log("About to update profile with settings = "+JSON.stringify(updateJSON));
        return updateUser(updateJSON);
      }).then(function(updateJSON) {
         // alert("Finished saving token = "+JSON.stringify(t.token));
      }).catch(function(error) {
        Logger.displayError("Error in updating profile to store device settings", error);
      });
    }

    $ionicPlatform.ready().then(function() {
      storedevicesettings.datacollect = $window.cordova.plugins.BEMDataCollection;
      readConsentState()
        .then(isConsented)
        .then(function(consentState) {
          if (consentState == true) {
              storedevicesettings.storeDeviceSettings();
          } else {
            Logger.log("no consent yet, waiting to store device settings in profile");
          }
        });
      Logger.log("storedevicesettings startup done");
    });

    return storedevicesettings;
});
