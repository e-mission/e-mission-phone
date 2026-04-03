/*
Wrapper around App component to handle app state changes

If in the background for more than BACKGROUND_TIMEOUT_MS, we unmount the App component
to prevent stale state and avoid wasting resources.

On resume, if we had been in the background for more than BACKGROUND_TIMEOUT_MS, we reload the App component
by changing its key, which forces it to unmount and remount with a fresh state.

Also, while in the background, if the UI thread is still running (which happens on iOS while we are getting
location updates), we keep track of how long it has been in the background. Once it exceeds BACKGROUND_TIMEOUT_MS,
we render null (blank screen) instead of <App>.
*/

import React, { useEffect } from 'react';
import App from './App';
import useAppState from './useAppState';
import { logDebug } from './plugin/logger';
import { resetPromisedConfig } from './config/dynamicConfig';

const BACKGROUND_TIMEOUT_MS = 5 * 60 * 1000;

const AppRoot = () => {
  const [currMs, setCurrMs] = React.useState(Date.now());
  const [reloadMs, setReloadMs] = React.useState(Date.now());
  const { appState, lastNotActiveMs } = useAppState({
    onActive: (msNotActive) => {
      if (msNotActive >= BACKGROUND_TIMEOUT_MS) {
        logDebug(`App resumed after ${msNotActive} ms, reloading app`);
        // reset the cached dynamic config to ensure we retrieve the config on resume,
        // which could have been updated in the background by the native code
        // TODO a better long-term strategy is to not cache the config at the module level,
        // only keep it in React state
        resetPromisedConfig();
        setReloadMs(Date.now());
      }
    },
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrMs(Date.now());
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (appState == 'active' || currMs - lastNotActiveMs < BACKGROUND_TIMEOUT_MS) {
    return <App key={reloadMs} appState={appState} />;
  } else {
    return null;
  }
};

export default AppRoot;
