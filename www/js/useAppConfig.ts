import { useEffect, useState } from 'react';
import { configChanged, getConfig, setConfigChanged } from './config/dynamicConfig';
import { logDebug } from './plugin/logger';
import { AppConfig } from './types/appConfigTypes';

/* For Cordova, 'deviceready' means that Cordova plugins are loaded and ready to access.
    https://cordova.apache.org/docs/en/5.0.0/cordova/events/events.deviceready.html
  We wrap this event in a promise and await it before attempting to update the config,
  since loading the config requires accessing native storage through plugins. */
const deviceReady = new Promise((resolve) => {
  document.addEventListener('deviceready', resolve);
});

const useAppConfig = () => {
  const [appConfig, setAppConfig] = useState<AppConfig>(null as any);

  useEffect(() => {
    deviceReady.then(updateConfig);
  }, []);

  function updateConfig() {
    return getConfig().then((config) => {
      if (config && Object.keys(config).length) {
        setAppConfig(config);
      } else {
        logDebug('Config was empty, treating as null');
        setAppConfig(null as any);
      }
    });
  }

  if (configChanged) {
    updateConfig().then(() => setConfigChanged(false));
  }
  return appConfig;
};

export default useAppConfig;
