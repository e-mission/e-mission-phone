// Ionic E-Mission App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'emission' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'emission.services' is found in services.js
// 'emission.controllers' is found in controllers.js
'use strict';

angular.module('emission', ['ionic',
    'emission.controllers','emission.services', 'emission.plugin.logger',
    'emission.splash.customURLScheme', 'emission.splash.referral',
    'emission.splash.updatecheck',
    'emission.intro', 'emission.main'])

.run(function($ionicPlatform, $rootScope, $http, Logger,
    CustomURLScheme, ReferralHandler, UpdateCheck) {
  console.log("Starting run");
  // alert("Starting run");
  // BEGIN: Global listeners, no need to wait for the platform
  // TODO: Although the onLaunch call doesn't need to wait for the platform the
  // handlers do. Can we rely on the fact that the event is generated from
  // native code, so will only be launched after the platform is ready?
  CustomURLScheme.onLaunch(function(event, url, urlComponents){
    console.log("GOT URL:"+url);
    // alert("GOT URL:"+url);

    if (urlComponents.route == 'join') {
      ReferralHandler.setupGroupReferral(urlComponents);
      StartPrefs.loadWithPrefs();
    } else if (urlComponents.route == 'change_client') {
      UpdateCheck.handleClientChangeURL(urlComponents);
    }
  });
  // END: Global listeners
  $ionicPlatform.ready(function() {
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    Logger.log("ionicPlatform is ready");
    if (window.cordova && window.cordova.plugins && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
      cordova.plugins.Keyboard.disableScroll(true);

    }
    if (window.StatusBar) {
      // org.apache.cordova.statusbar required
      StatusBar.styleDefault();
    }

    // Configure the connection settings
    Logger.log("about to get connection config");
    $http.get("json/connectionConfig.json").then(function(connectionConfig) {
        if(connectionConfig.data.length == 0) {
            throw "blank string instead of missing file on dynamically served app";
        }
        Logger.log("connectionConfigString = "+JSON.stringify(connectionConfig.data));
        window.cordova.plugins.BEMConnectionSettings.setSettings(connectionConfig.data);
    }).catch(function(err) {
        Logger.log("error "+JSON.stringify(err)+" while reading connection config, reverting to defaults");
        window.cordova.plugins.BEMConnectionSettings.getDefaultSettings().then(function(defaultConfig) {
            Logger.log("defaultConfig = "+JSON.stringify(defaultConfig));
            window.cordova.plugins.BEMConnectionSettings.setSettings(defaultConfig);
        }).catch(function(err) {
            Logger.log("error "+JSON.stringify(err)+" reading or setting defaults, giving up");
        });
    });

    Logger.log("Setting collection settings to default");
    var androidDefaultCollectionConfig = {
      is_duty_cycling: true,
      simulate_user_interaction: false,
      accuracy: 100,
      accuracy_threshold: 200,
      filter_distance: -1,
      filter_time: 30 * 1000,
      geofence_radius: 100,
      trip_end_stationary_mins: 5,
      ios_use_visit_notifications_for_detection: false,
      ios_use_remote_push_for_sync: false,
      android_geofence_responsiveness: 5 * 1000
    };
    var iosDefaultCollectionConfig = {
      is_duty_cycling: true,
      simulate_user_interaction: false,
      accuracy: -1,
      accuracy_threshold: 200,
      filter_distance: 50,
      filter_time: -1,
      geofence_radius: 100,
      trip_end_stationary_mins: 10,
      ios_use_visit_notifications_for_detection: true,
      ios_use_remote_push_for_sync: true,
      android_geofence_responsiveness: -1
    };
    window.cordova.plugins.BEMDataCollection.getConfig().then(function(currConfig) {
      Logger.log("for collection, currConfig = "+JSON.stringify(currConfig));
      if (ionic.Platform.isAndroid()) {
        if (!angular.equals(currConfig,androidDefaultCollectionConfig)) {
          /*
          Re-enable to confirm that the default hardcoded settings here are
          correct.
          See: https://github.com/e-mission/cordova-connection-settings/issues/12#issuecomment-325814049
             alert("mismatch in config at startup, check logs!");
          */
          Logger.log("currConfig = "+JSON.stringify(currConfig)+
            "defaultConfig = "+JSON.stringify(androidDefaultCollectionConfig));
        }
        window.cordova.plugins.BEMDataCollection.setConfig(androidDefaultCollectionConfig);
      };
      if (ionic.Platform.isIOS()) {
        if (!angular.equals(currConfig,iosDefaultCollectionConfig)) {
          /*
           Re-enable to confirm that the default hardcoded settings here are
           correct.
              alert("mismatch in config at startup, check logs!");
           */
          Logger.log("currConfig = "+JSON.stringify(currConfig)+
            "defaultConfig = "+JSON.stringify(iosDefaultCollectionConfig));
        }
        window.cordova.plugins.BEMDataCollection.setConfig(iosDefaultCollectionConfig);
      };
    }).catch(function(err) {
      alert("Error setting collection defaults "+JSON.stringify(err));
    });

    Logger.log("Setting sync settings to default");
    var defaultSyncConfig = {
      sync_interval: 60 * 60,
      ios_use_remote_push: ionic.Platform.isIOS() // true for ios, false for android
    };

    window.cordova.plugins.BEMServerSync.getConfig().then(function(currConfig) {
      Logger.log("for sync, currConfig = "+JSON.stringify(currConfig));
      if (!angular.equals(currConfig, defaultSyncConfig)) {
        /*
         Re-enable to confirm that the default hardcoded settings here are
         correct.
         See: https://github.com/e-mission/cordova-connection-settings/issues/12#issuecomment-325814049
        alert("mismatch in config at startup, check logs!");
        */
        Logger.log("currConfig = "+JSON.stringify(currConfig)+
          "defaultConfig = "+JSON.stringify(defaultSyncConfig));
      }
      window.cordova.plugins.BEMServerSync.setConfig(defaultSyncConfig);
    }).catch(function(err) {
      alert("Error setting sync defaults "+JSON.stringify(err));
    });
  });

  console.log("Ending run");
})

.config(function($stateProvider, $urlRouterProvider) {
  console.log("Starting config");
  // alert("config");

  // Ionic uses AngularUI Router which uses the concept of states
  // Learn more here: https://github.com/angular-ui/ui-router
  // Set a few states which the app can be in.
  // The 'intro' and 'diary' states are found in their respective modules
  // Each state's controller can be found in controllers.js
  $stateProvider
  // set up a state for the splash screen. This has no parents and no children
  // because it is basically just used to load the user's preferred screen.
  // This cannot directly use plugins - has to check for them first.
  .state('splash', {
        url: '/splash',
        templateUrl: 'templates/splash/splash.html',
        controller: 'SplashCtrl'
  })

  // setup an abstract state for the root. Only children of this can be loaded
  // as preferred screens, and all children of this can assume that the device
  // is ready.
  .state('root', {
    url: '/root',
    abstract: true,
    template: '<ion-nav-view/>',
    controller: 'RootCtrl'
  });

  // alert("about to fall back to otherwise");
  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/splash');
  console.log("Ending config");
});
