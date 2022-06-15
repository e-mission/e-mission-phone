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
    'emission.splash.updatecheck', 'emission.services.email',
    'emission.intro', 'emission.main', 'emission.config.dynamic',
    'emission.config.server_conn', 'emission.join.ctrl',
    'pascalprecht.translate'])

.run(function($ionicPlatform, $rootScope, $http, Logger,
    CustomURLScheme, ReferralHandler, UpdateCheck, DynamicConfig, ServerConnConfig) {
  console.log("Starting run");
  // ensure that plugin events are delivered after the ionicPlatform is ready
  // https://github.com/katzer/cordova-plugin-local-notifications#launch-details
  window.skipLocalNotificationReady = true;
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
    } else if (urlComponents.route == 'join_study') {
      DynamicConfig.initByUser(urlComponents);
    }
  });
  // END: Global listeners
  $ionicPlatform.ready(function() {
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    Logger.log("ionicPlatform is ready");

    if (window.StatusBar) {
      // org.apache.cordova.statusbar required
      StatusBar.styleDefault();
    }
    cordova.plugin.http.setDataSerializer('json');
  });
  console.log("Ending run");
})

.config(function($stateProvider, $urlRouterProvider, $translateProvider, $compileProvider) {
  console.log("Starting config");
  // alert("config");

  // Ionic uses AngularUI Router which uses the concept of states
  // Learn more here: https://github.com/angular-ui/ui-router
  // Set a few states which the app can be in.
  // The 'intro' and 'diary' states are found in their respective modules
  // Each state's controller can be found in controllers.js
  $compileProvider.imgSrcSanitizationWhitelist(/^\s*(https?|ftp|file|blob|ionic):|data:image/);  
  $stateProvider
  // set up a state for the splash screen. This has no parents and no children
  // because it is basically just used to load the user's preferred screen.
  // This cannot directly use plugins - has to check for them first.
  .state('splash', {
        url: '/splash',
        templateUrl: 'templates/splash/splash.html',
        controller: 'SplashCtrl'
  })

  // add the join screen to the list of initially defined states
  // we can't put it in intro since it comes before it
  // we can't put it in main because it is also a temporary screen that only
  // shows up when we have no config.
  // so we put it in here
  .state('root.join', {
    url: '/join',
    templateUrl: 'templates/join/request_join.html',
    controller: 'JoinCtrl'
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

  // Allow the use of MessageForm interpolation for Gender and Plural.
  $translateProvider.addInterpolation('$translateMessageFormatInterpolation')
                    .useSanitizeValueStrategy('escape');


  // Define where we can find the .json and the fallback language
  $translateProvider
    .fallbackLanguage('en')
    .registerAvailableLanguageKeys(['en', 'fr', 'it', 'es'], {
      'en_*': 'en',
      'fr_*': 'fr',
      'it_*': 'it',
      'es_*': 'es',
      '*': 'en'
    })
    .determinePreferredLanguage()
    .useStaticFilesLoader({
      prefix: 'i18n/',
      suffix: '.json'
    });
  
  console.log("Ending config");
});
