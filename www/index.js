import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider as PaperProvider } from 'react-native-paper';

import './css/style.scss';
import 'chartjs-adapter-luxon';

import initializedI18next from './js/i18nextInit';
window.i18next = initializedI18next;

import App from './js/App';
import { getTheme } from './js/appTheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { logDebug } from './js/plugin/logger';

export const deviceReady = new Promise((resolve) => {
  document.addEventListener('deviceready', resolve);
});

/* ensure that plugin events are not delivered before Cordova is ready:
  https://github.com/katzer/cordova-plugin-local-notifications#launch-details */
window.skipLocalNotificationReady = true;

deviceReady.then(() => {
  logDebug('deviceReady');
  cordova.plugin.http.setDataSerializer('json');
  const rootEl = document.getElementById('appRoot');
  const reactRoot = createRoot(rootEl);

  const theme = getTheme();
  /* Set Cordova StatusBar color to match the "elevated" AppBar
   https://cordova.apache.org/docs/en/10.x/reference/cordova-plugin-statusbar/#statusbarbackgroundcolorbyhexstring
   https://callstack.github.io/react-native-paper/docs/components/Appbar/#theme-colors */
  if (window['StatusBar']) {
    window['StatusBar'].backgroundColorByHexString(theme.colors.elevation.level2);
  }

  reactRoot.render(
    <PaperProvider theme={theme}>
      <style type="text/css">
        {`
          @font-face {
            font-family: 'MaterialCommunityIcons';
            src: url(${require('react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf')}) format('truetype');
          }
        `}
      </style>
      <SafeAreaView style={{ flex: 1 }}>
        <App />
      </SafeAreaView>
    </PaperProvider>,
  );
});
