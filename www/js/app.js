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
        // not displaying the error here since we have a backup
        Logger.log("error "+JSON.stringify(err)+" while reading connection config, reverting to defaults");
        window.cordova.plugins.BEMConnectionSettings.getDefaultSettings().then(function(defaultConfig) {
            Logger.log("defaultConfig = "+JSON.stringify(defaultConfig));
            window.cordova.plugins.BEMConnectionSettings.setSettings(defaultConfig);
        }).catch(function(err) {
            // displaying the error here since we don't have a backup
            Logger.displayError("Error reading or setting connection defaults", err);
        });
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
