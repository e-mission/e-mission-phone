// Ionic E-Mission App

'use strict';

import angular from 'angular';
import React from 'react';
import { createRoot } from 'react-dom/client';
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

import { Provider as PaperProvider } from 'react-native-paper';
import App from './App';
import { getTheme } from './appTheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { initByUser } from './config/dynamicConfig';

angular.module('emission', ['ionic', 'jm.i18next',
    'emission.controllers','emission.services', 'emission.plugin.logger',
    'emission.splash.customURLScheme', 'emission.splash.referral',
    'emission.services.email',
    'emission.main', 'pascalprecht.translate', 'LocalStorageModule'])

.run(function($ionicPlatform, $rootScope, $http, Logger,
    CustomURLScheme, ReferralHandler, localStorageService) {
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
    } else if (urlComponents.route == 'login_token') {
      initByUser(urlComponents);
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

    const rootEl = document.getElementById('appRoot');
    const reactRoot = createRoot(rootEl);

    const theme = getTheme();

    reactRoot.render(
      <PaperProvider theme={theme}>
        <style type="text/css">{`
        @font-face {
          font-family: 'MaterialCommunityIcons';
          src: url(${require('react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf')}) format('truetype');
        }`}
        </style>
        <SafeAreaView style={{flex: 1}}>
          <App />
        </SafeAreaView>
      </PaperProvider>
    );
  });
  console.log("Ending run");
});
