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

const BACKGROUND_TIMEOUT_MS = 5 * 60 * 1000;

const AppRoot = () => {
  const [currMs, setCurrMs] = React.useState(Date.now());
  const [reloadMs, setReloadMs] = React.useState(Date.now());
  const { appState, lastNonActiveChangeMs } = useAppState({
    onResume: (msNotActive) => {
      if (msNotActive >= BACKGROUND_TIMEOUT_MS) {
        logDebug(`App resumed after ${msNotActive} ms, reloading app`);
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

  console.debug(
    `appState = ${appState}, lastNonActiveChangeMs = ${lastNonActiveChangeMs}, ${
      currMs - lastNonActiveChangeMs
    } ms since non-active`,
  );
  if (appState == 'active' || currMs - lastNonActiveChangeMs < BACKGROUND_TIMEOUT_MS) {
    console.log(`showing app`);
    return <App key={reloadMs} />;
  } else {
    console.log(`showing blank screen`);
    return null;
  }
};

export default AppRoot;
