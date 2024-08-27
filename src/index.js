import React from 'react';
import { createRoot } from 'react-dom/client';

import AppRoot from './js/AppRoot';
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
    <AppRoot />
  );
});
