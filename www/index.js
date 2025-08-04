import React from 'react';
import { createRoot } from 'react-dom/client';
import mdiFont from '../node_modules/@react-native-vector-icons/material-design-icons/fonts/MaterialDesignIcons.ttf';
export const MDI_FONT_FAMILY = 'MaterialDesignIcons';

import './css/style.scss';

import initializedI18next from './js/i18nextInit';
window.i18next = initializedI18next;

import App from './js/App';
import { logDebug } from './js/plugin/logger';

export const deviceReady = new Promise((resolve) => {
  document.addEventListener('deviceready', resolve);
});

/* ensure that plugin events are not delivered before Cordova is ready:
  https://github.com/katzer/cordova-plugin-local-notifications#launch-details */
window.skipLocalNotificationReady = true;

deviceReady.then(() => {
  logDebug('deviceReady');
  // On init, use 'default' status bar (black text)
  // window['StatusBar']?.styleDefault();
  cordova.plugin.http.setDataSerializer('json');
  const rootEl = document.getElementById('appRoot');
  const reactRoot = createRoot(rootEl);

  reactRoot.render(
    <>
      <style type="text/css">
        {`
          @font-face {
            font-family: ${MDI_FONT_FAMILY};
            src: url(${mdiFont}) format('truetype');
          }
          @font-face {
            font-family: MaterialCommunityIcons;
            src: url(${mdiFont}) format('truetype');
          }
        `}
      </style>
      {/* The background color of this SafeAreaView effectively controls the status bar background color.
        Set to theme.colors.elevation.level2 to match the background of the elevated AppBars present on each tab. */}
      <App />
    </>,
  );
});
