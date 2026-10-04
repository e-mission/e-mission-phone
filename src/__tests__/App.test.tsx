import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import App from '../js/App';
import { joinWithTokenOrUrl } from '../js/config/dynamicConfig';
import { resolveOnboardingStateWithRetry } from '../js/onboarding/onboardingHelper';
import { registerUrlHandler } from '../js/urlHandler';
import useAppConfig from '../js/useAppConfig';
import usePermissionStatus from '../js/usePermissionStatus';

jest.mock('react-native-paper', () => {
  const React = require('react');
  return {
    ActivityIndicator: ({ children, ...props }: any) =>
      React.createElement('ActivityIndicator', props, children),
    PaperProvider: ({ children }: any) => React.createElement(React.Fragment, null, children),
  };
});

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  return {
    SafeAreaView: ({ children }: any) => React.createElement('View', null, children),
  };
});

jest.mock('../js/appTheme', () => ({
  getTheme: () => ({
    colors: {
      elevation: { level2: '#ffffff' },
    },
  }),
}));

jest.mock('../js/useAppConfig', () => jest.fn());
jest.mock('../js/usePermissionStatus', () => jest.fn());

jest.mock('../js/config/dynamicConfig', () => ({
  joinWithTokenOrUrl: jest.fn(),
  setServerConnSettings: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../js/urlHandler', () => ({
  handleUrl: jest.fn(),
  registerUrlHandler: jest.fn(),
}));

jest.mock('../js/onboarding/onboardingHelper', () => {
  const actual = jest.requireActual('../js/onboarding/onboardingHelper');
  return {
    ...actual,
    resolveOnboardingStateWithRetry: jest.fn(),
  };
});

jest.mock('../js/Main', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('../js/onboarding/OnboardingStack', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('../js/AppStatusModal', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('../js/components/AlertArea', () => ({
  __esModule: true,
  default: () => null,
}));

describe('App QR onboarding flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAppConfig as jest.Mock).mockReturnValue({ version: 1, intro: { translated_text: { en: { deployment_name: 'Test' } } } });
    (usePermissionStatus as jest.Mock).mockReturnValue({});
    (resolveOnboardingStateWithRetry as jest.Mock).mockResolvedValue(null);
    (joinWithTokenOrUrl as jest.Mock).mockResolvedValue(true);
    (registerUrlHandler as jest.Mock).mockImplementation((handler) => {
      (global as any).__capturedUrlHandler = handler;
      return jest.fn();
    });
  });

  it('continues with a QR join even when onboarding state is temporarily unresolved', async () => {
    render(<App appState="active" />);

    await waitFor(() => {
      expect(registerUrlHandler).toHaveBeenCalled();
    });

    const handler = (global as any).__capturedUrlHandler as (url: string) => Promise<boolean>;
    await expect(handler('https://example.com/join')).resolves.toBe(true);

    await waitFor(() => {
      expect(joinWithTokenOrUrl).toHaveBeenCalledWith('https://example.com/join');
    });
  });
});
