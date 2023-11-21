import React from 'react';
import { createRoot } from 'react-dom/client';

import 'moment';
import 'moment-timezone';
import 'chartjs-adapter-luxon';

import initializedI18next from './i18nextInit';
window.i18next = initializedI18next;
import 'ng-i18next';

import { Provider as PaperProvider } from 'react-native-paper';
import App from './App';
import { getTheme } from './appTheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { logDebug } from './plugin/logger';

export const deviceReady = new Promise((resolve) => {
  document.addEventListener('deviceready', resolve);
});

/* ensure that plugin events are not delivered before Cordova is ready:
  https://github.com/katzer/cordova-plugin-local-notifications#launch-details */
window.skipLocalNotificationReady = true;

deviceReady.then(() => {
  logDebug('deviceReady');
  /* give status bar dark text because we have a light background
   https://cordova.apache.org/docs/en/10.x/reference/cordova-plugin-statusbar/#statusbarstyledefault */
  if (window['StatusBar']) window['StatusBar'].styleDefault();
  cordova.plugin.http.setDataSerializer('json');
  const rootEl = document.getElementById('appRoot');
  const reactRoot = createRoot(rootEl);

  const theme = getTheme();

  reactRoot.render(
    <PaperProvider theme={theme}>
      <style type="text/css">
        {`
    @font-face {
      font-family: 'MaterialCommunityIcons';
      src: url(${require('react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf')}) format('truetype');
    }`}
      </style>
      <SafeAreaView style={{ flex: 1 }}>
        <App />
      </SafeAreaView>
    </PaperProvider>,
  );
});
