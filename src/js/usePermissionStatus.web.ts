import { AppStateStatus } from 'react-native';
import { logDebug } from './plugin/logger';
import DeploymentConfig from 'op-deployment-configs';

/* On Expo web there are no native permissions to check, so everything reports as permitted. */
const usePermissionStatus = (appState: AppStateStatus, appConfig: DeploymentConfig) => {
  logDebug('On Expo web, skipping permission checks');

  async function refreshAllChecks(checkList?: any[]) {}

  return {
    checkList: [],
    overallStatus: true,
    refreshAllChecks,
    explanationList: [],
  };
};

export default usePermissionStatus;
