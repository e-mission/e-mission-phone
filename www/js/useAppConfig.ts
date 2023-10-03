import { useEffect, useState } from "react";
import { getAngularService } from "./angular-react-helper"
import { configChanged, getConfig, setConfigChanged } from "./config/dynamicConfig";
import { logDebug } from "./plugin/logger";

const useAppConfig = () => {

  const [appConfig, setAppConfig] = useState<any>(null);
  const $ionicPlatform = getAngularService('$ionicPlatform');

  useEffect(() => {
    $ionicPlatform.ready().then(updateConfig);
  }, []);

  function updateConfig() {
    return getConfig().then((config) => {
      if (Object.keys(config).length) {
        setAppConfig(config);
      } else {
        logDebug('Config was empty, treating as null');
        setAppConfig(null);
      }
    });
  }

  if (configChanged) {
    updateConfig().then(() => setConfigChanged(false));
  }
  return appConfig;
}

export default useAppConfig;
