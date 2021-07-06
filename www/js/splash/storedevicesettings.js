angular.module('emission.splash.storedevicesettings', ['emission.plugin.logger',
                                             'emission.services',
                                             'emission.splash.startprefs'])
.factory('StoreDeviceSettings', function($window, $state, $rootScope, $ionicPlatform,
    $ionicPopup, $translate, Logger, CommHelper, StartPrefs) {

    var storedevicesettings = {};

    storedevicesettings.storeDeviceSettings = function() {
      var lang = $translate.use();
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
        return CommHelper.updateUser(updateJSON);
      }).then(function(updateJSON) {
         // alert("Finished saving token = "+JSON.stringify(t.token));
      }).catch(function(error) {
        Logger.displayError("Error in updating profile to store device settings", error);
      });
    }

    $ionicPlatform.ready().then(function() {
      storedevicesettings.datacollect = $window.cordova.plugins.BEMDataCollection;
      StartPrefs.readConsentState()
        .then(StartPrefs.isConsented)
        .then(function(consentState) {
          if (consentState == true) {
              storedevicesettings.storeDeviceSettings();
          } else {
            Logger.log("no consent yet, waiting to store device settings in profile");
          }
        });
      Logger.log("storedevicesettings startup done");
    });

    $rootScope.$on(StartPrefs.CONSENTED_EVENT, function(event, data) {
      console.log("got consented event "+JSON.stringify(event.name)
                      +" with data "+ JSON.stringify(data));
      if (StartPrefs.isIntroDone()) {
          console.log("intro is done -> reconsent situation, we already have a token -> register");
          storedevicesettings.storeDeviceSettings();
      }
    });

    $rootScope.$on(StartPrefs.INTRO_DONE_EVENT, function(event, data) {
          console.log("intro is done -> original consent situation, we should have a token by now -> register");
       storedevicesettings.storeDeviceSettings();
    });

    return storedevicesettings;
});
