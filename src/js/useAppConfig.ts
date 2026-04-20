import { useEffect, useState } from 'react';
import { configChanged, getConfig, setConfigChanged } from './config/dynamicConfig';
import { logDebug } from './plugin/logger';
import { DeploymentConfig } from 'op-deployment-configs';

const useAppConfig = () => {
  const [appConfig, setAppConfig] = useState<DeploymentConfig>(null as any);

  useEffect(() => {
    updateConfig();
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
