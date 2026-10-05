import React from 'react';
import { render } from '@testing-library/react-native';
import Main from '../js/Main';
import { AppContext } from '../js/AppContext';
import useAppConfig from '../js/useAppConfig';

const mockBottomNavigation = jest.fn(() => null);

jest.mock('../js/TimelineContext', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: {
      Provider: ({ children }: any) => React.createElement(React.Fragment, null, children),
    },
    useTimelineContext: () => ({ setShouldRenderTimeline: jest.fn() }),
  };
});

jest.mock('react-native-paper', () => {
  const React = require('react');
  return {
    BottomNavigation: Object.assign(
      (props: any) => {
        mockBottomNavigation(props);
        return React.createElement('BottomNavigation', null);
      },
      {
        SceneMap: (scenes: any) => scenes,
      },
    ),
    useTheme: () => ({ colors: { primaryContainer: '#ffffff' } }),
  };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('../js/plugin/clientStats', () => ({
  addStatReading: jest.fn(),
}));

jest.mock('../js/plugin/ErrorBoundary', () => ({
  withErrorBoundary: (Component: any) => Component,
}));

jest.mock('../js/diary/LabelTab', () => () => null);
jest.mock('../js/metrics/MetricsTab', () => () => null);
jest.mock('../js/control/ProfileSettings', () => () => null);
jest.mock('../js/library/LibraryTab', () => () => null);

jest.mock('../js/useAppConfig', () => jest.fn());

describe('Main routesOverride', () => {
  const appContextValue = {
    appConfig: {},
    handleJoinTokenOrUrl: jest.fn(),
    onboardingState: null,
    setOnboardingState: jest.fn(),
    refreshOnboardingState: jest.fn(),
    permissionStatus: {},
    permissionsPopupVis: false,
    setPermissionsPopupVis: jest.fn(),
    userProfile: null,
    updateUserProfile: jest.fn(),
    customLabelMap: {},
    setCustomLabelMap: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    (useAppConfig as jest.Mock).mockReturnValue({});
    mockBottomNavigation.mockClear();
  });

  it('uses the override routes instead of the default tab set when provided', () => {
    const profileOnlyRoutes = [
      {
        key: 'control',
        title: 'Profile',
        focusedIcon: 'account',
        unfocusedIcon: 'account-outline',
        accessibilityLabel: 'control.profile-tab',
      },
    ];

    render(
      <AppContext.Provider value={appContextValue}>
        <Main defaultTab="control" routesOverride={profileOnlyRoutes} />
      </AppContext.Provider>,
    );

    const navProps = mockBottomNavigation.mock.calls.at(-1)?.[0];
    expect(navProps.navigationState.routes).toEqual(profileOnlyRoutes);
    expect(navProps.navigationState.index).toBe(0);
  });

  it('still respects the requested defaultTab when the override routes are present', () => {
    const profileOnlyRoutes = [
      {
        key: 'control',
        title: 'Profile',
        focusedIcon: 'account',
        unfocusedIcon: 'account-outline',
        accessibilityLabel: 'control.profile-tab',
      },
    ];

    render(
      <AppContext.Provider value={appContextValue}>
        <Main defaultTab="control" routesOverride={profileOnlyRoutes} />
      </AppContext.Provider>,
    );

    const navProps = mockBottomNavigation.mock.calls.at(-1)?.[0];
    expect(navProps.navigationState.index).toBe(0);
    expect(navProps.navigationState.routes[0].key).toBe('control');
  });

  it('defaults to the first visible tab when no defaultTab is specified', () => {
    render(
      <AppContext.Provider value={{ ...appContextValue, appConfig: { vehicle_library: {} } }}>
        <Main />
      </AppContext.Provider>,
    );

    const navProps = mockBottomNavigation.mock.calls.at(-1)?.[0];
    expect(navProps.navigationState.routes[0].key).toBe('library');
    expect(navProps.navigationState.index).toBe(0);
  });
});
