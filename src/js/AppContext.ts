import React, { createContext } from 'react';
import DeploymentConfig from 'op-deployment-configs';
import { OnboardingState } from './onboarding/onboardingHelper';
import usePermissionStatus from './usePermissionStatus';
import { UserProfile } from './splash/userProfile';

export type OnboardingJoinMethod = 'scan' | 'paste' | 'textbox' | 'external';

export type CustomLabelMap = {
  [k: string]: string[];
};

export type AppContextProps = {
  appConfig: DeploymentConfig | null;
  handleTokenOrUrl: (tokenOrUrl: string, joinMethod: OnboardingJoinMethod) => Promise<boolean>;
  onboardingState: OnboardingState | null;
  setOnboardingState: React.Dispatch<React.SetStateAction<OnboardingState | null>>;
  refreshOnboardingState: () => Promise<OnboardingState>;
  permissionStatus: ReturnType<typeof usePermissionStatus>;
  permissionsPopupVis: boolean;
  setPermissionsPopupVis: React.Dispatch<React.SetStateAction<boolean>>;
  userProfile: UserProfile | null;
  updateUserProfile: (profileUpdate: Partial<UserProfile>) => Promise<void>;
  customLabelMap: CustomLabelMap;
  setCustomLabelMap: React.Dispatch<React.SetStateAction<CustomLabelMap>>;
};

export const AppContext = createContext<AppContextProps>({} as AppContextProps);
