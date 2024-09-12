import React from 'react';
import { createRoot } from 'react-dom/client';
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
  /* give status bar dark text because we have a light background
   https://cordova.apache.org/docs/en/10.x/reference/cordova-plugin-statusbar/#statusbarstyledefault */
  if (window['StatusBar']) window['StatusBar'].styleDefault();
  cordova.plugin.http.setDataSerializer('json');
  const rootEl = document.getElementById('appRoot');
  const reactRoot = createRoot(rootEl);

  reactRoot.render(
    <>
      <style type="text/css">
        {`
          @font-face {
            font-family: 'MaterialCommunityIcons';
            src: url(${require('react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf')}) format('truetype');
          }
        `}
      </style>
      <App />
    </>,
  );
});
