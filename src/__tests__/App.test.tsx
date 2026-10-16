import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';
import i18next from 'i18next';
import App from '../js/App';
import { joinWithTokenOrUrl } from '../js/config/dynamicConfig';
import { OnboardingRoute, getPendingOnboardingState } from '../js/onboarding/onboardingHelper';
import { registerUrlHandler } from '../js/urlHandler';
import useAppConfig from '../js/useAppConfig';
import usePermissionStatus from '../js/usePermissionStatus';
import FeedbackModal from '../js/control/FeedbackModal';
import { Alerts } from '../js/components/alerts';

jest.mock('react-native-paper', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  const Container = ({ children, ...props }: any) => React.createElement(View, props, children);
  const Dialog = Object.assign(Container, {
    Content: Container,
    Actions: Container,
  });
  return {
    ActivityIndicator: ({ children, ...props }: any) =>
      React.createElement('ActivityIndicator', props, children),
    PaperProvider: ({ children }: any) => React.createElement(React.Fragment, null, children),
    Dialog,
    Text,
    Button: Container,
    IconButton: Container,
    Checkbox: Container,
    useTheme: () => ({
      colors: { primary: '#0080b9', onSurface: '#111111', elevation: { level3: '#ffffff' } },
    }),
  };
});

jest.mock('../js/control/ProfileSettings', () => ({
  settingStyles: { dialog: () => ({}) },
}));

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

const mockOnboardingStack = jest.fn(() => null);

jest.mock('../js/onboarding/onboardingHelper', () => {
  const actual = jest.requireActual('../js/onboarding/onboardingHelper');
  return {
    ...actual,
    getPendingOnboardingState: jest.fn(),
  };
});

jest.mock('../js/Main', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../js/onboarding/OnboardingStack', () => ({
  __esModule: true,
  default: () => {
    mockOnboardingStack();
    return null;
  },
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
    mockOnboardingStack.mockClear();
    (useAppConfig as jest.Mock).mockReturnValue({
      version: 1,
      intro: { translated_text: { en: { deployment_name: 'Test' } } },
    });
    (usePermissionStatus as jest.Mock).mockReturnValue({});
    (getPendingOnboardingState as jest.Mock).mockResolvedValue({
      opcode: '',
      subgroup: undefined,
      route: OnboardingRoute.WELCOME,
    });
    (joinWithTokenOrUrl as jest.Mock).mockResolvedValue(true);
    (registerUrlHandler as jest.Mock).mockImplementation((handler) => {
      (global as any).__capturedUrlHandler = handler;
      return jest.fn();
    });
  });

  it('continues with a QR join even when onboarding state is unresolved', async () => {
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

  it('returns the onboarding stack when onboarding has failed', async () => {
    (getPendingOnboardingState as jest.Mock).mockResolvedValue({
      opcode: 'test-opcode',
      subgroup: 'test-subgroup',
      route: OnboardingRoute.FAILED,
    });

    render(<App appState="active" />);

    await waitFor(() => {
      expect(mockOnboardingStack).toHaveBeenCalled();
    });
  });

  it('opens FeedbackModal with config and onboarding context from the app', async () => {
    const { getByText } = render(<App appState="active" />);
    await waitFor(() => expect(mockOnboardingStack).toHaveBeenCalled());

    act(() => Alerts.showPopup(FeedbackModal));

    expect(
      getByText(
        i18next.t('control.feedback-modal.experience-question', {
          appName: i18next.t('join.app-name'),
        }),
      ),
    ).toBeTruthy();
  });
});
