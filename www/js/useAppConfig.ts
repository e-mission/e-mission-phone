import { useEffect, useState } from "react";
import { getAngularService } from "./angular-react-helper"

const useAppConfig = () => {

  const [appConfig, setAppConfig] = useState<any>({});
  const [loading, setLoading] = useState<boolean>(true);

  const DynamicConfig = getAngularService('DynamicConfig');
  const $ionicPlatform = getAngularService('$ionicPlatform');

  useEffect(() => {
    setLoading(true);
    const promises = [$ionicPlatform.ready(), DynamicConfig.configReady()]
    Promise.all(promises).then(([_, config]) => {
      setAppConfig(config);
      setLoading(false);
    });
  }, []);

  return {appConfig, loading};
}

export default useAppConfig;
