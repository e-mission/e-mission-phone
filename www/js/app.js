// Ionic E-Mission App

'use strict';

import angular from 'angular';
import 'angular-animate';
import 'angular-sanitize';
import 'angular-translate';
import '../manual_lib/angular-ui-router/angular-ui-router.js';
import 'angular-local-storage';
import 'angular-translate-loader-static-files';

import 'moment';
import 'moment-timezone';
import 'chartjs-adapter-luxon';

import 'ionic-toast';
import 'ionic-datepicker';
import 'angular-simple-logger';

import '../manual_lib/ionic/js/ionic.js';
import '../manual_lib/ionic/js/ionic-angular.js';

import initializedI18next from './i18nextInit';
window.i18next = initializedI18next;
import 'ng-i18next';

angular.module('emission', ['ionic', 'jm.i18next',
    'emission.controllers','emission.services', 'emission.plugin.logger',
    'emission.splash.customURLScheme', 'emission.splash.referral',
    'emission.services.email',
    'emission.intro', 'emission.main', 'emission.config.dynamic',
    'emission.config.server_conn', 'emission.join.ctrl',
    'pascalprecht.translate', 'LocalStorageModule'])

.run(function($ionicPlatform, $rootScope, $http, Logger,
    CustomURLScheme, ReferralHandler, DynamicConfig, localStorageService, ServerConnConfig) {
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
    } else if (urlComponents.route == 'login_token') {
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
    // backwards compat hack to be consistent with
    // https://github.com/e-mission/e-mission-data-collection/commit/92f41145e58c49e3145a9222a78d1ccacd16d2a7#diff-962320754eba07107ecd413954411f725c98fd31cddbb5defd4a542d1607e5a3R160
    // remove during migration to react native
    localStorageService.remove("OP_GEOFENCE_CFG");
    cordova.plugins.BEMUserCache.removeLocalStorage("OP_GEOFENCE_CFG");
  });
  console.log("Ending run");
})

.config(function($stateProvider, $urlRouterProvider, $compileProvider) {
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
  
  console.log("Ending config");
});
