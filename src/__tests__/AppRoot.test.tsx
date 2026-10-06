import React from 'react';
import renderer from 'react-test-renderer';

const mockDisplayError = jest.fn();
const mockLogDebug = jest.fn();
const mockRegisterRootComponent = jest.fn();
const mockResetPromisedConfig = jest.fn();
const mockApp = jest.fn(() => null);
const mockUseAppState = jest.fn(() => ({ appState: 'active', lastNotActiveMs: 0 }));

jest.mock('../js/plugin/logger', () => ({
  __esModule: true,
  displayError: mockDisplayError,
  displayErrorMsg: jest.fn(),
  logDebug: mockLogDebug,
}));

jest.mock('../js/App', () => ({
  __esModule: true,
  default: mockApp,
}));

jest.mock('../js/useAppState', () => ({
  __esModule: true,
  default: mockUseAppState,
}));

jest.mock('../js/config/dynamicConfig', () => ({
  resetPromisedConfig: mockResetPromisedConfig,
}));

jest.mock('../js/nativePlugins', () => ({
  pluginsReadyPromise: Promise.resolve(),
}));

jest.mock('expo', () => ({
  registerRootComponent: mockRegisterRootComponent,
}));

describe('AppRoot startup protection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAppState.mockImplementation(() => ({ appState: 'active', lastNotActiveMs: 0 }));
    mockRegisterRootComponent.mockImplementation(() => undefined);
  });

  it('renders the app root while the app is active', () => {
    const AppRoot = require('../js/AppRoot').default;

    expect(() => {
      renderer.act(() => {
        renderer.create(<AppRoot />);
      });
    }).not.toThrow();
  });

  it('renders the app root while the app is active and reloads after a long background interval', () => {
    const captured = { onActive: undefined };
    mockUseAppState.mockImplementation(({ onActive } = {}) => {
      captured.onActive = onActive;
      return { appState: 'active', lastNotActiveMs: 0 };
    });

    const AppRoot = require('../js/AppRoot').default;

    expect(() => {
      renderer.act(() => {
        renderer.create(<AppRoot />);
      });
    }).not.toThrow();

    expect(mockApp).toHaveBeenCalled();

    renderer.act(() => {
      captured.onActive?.(5 * 60 * 1000);
    });

    expect(mockResetPromisedConfig).toHaveBeenCalledTimes(1);
    expect(mockLogDebug).toHaveBeenCalledWith(
      expect.stringContaining('App resumed after 300000 ms, reloading app'),
    );
  });

  it('catches descendant render failures through the app error boundary', () => {
    const ErrorBoundary = require('../js/plugin/ErrorBoundary').default;
    const err = new Error('render boom');
    const boundary = new ErrorBoundary({ children: null });

    expect(ErrorBoundary.getDerivedStateFromError(err)).toEqual({ hasError: true });

    boundary.componentDidCatch(err, { componentStack: 'render boom stack' } as any);

    expect(mockDisplayError).toHaveBeenCalledWith(err, 'render boom stack');
  });

  it('logs and ignores registration failures during plugin-ready startup', async () => {
    mockRegisterRootComponent.mockImplementation(() => {
      throw new Error('register boom');
    });

    jest.isolateModules(() => {
      require('../js/AppRoot');
    });
    await Promise.resolve();

    expect(mockRegisterRootComponent).toHaveBeenCalled();
    expect(mockDisplayError).toHaveBeenCalledWith(
      expect.any(Error),
      'AppRoot: root registration failed',
    );
    expect(mockLogDebug).toHaveBeenCalledWith(
      expect.stringContaining('AppRoot: root registration failed: Error: register boom'),
    );
  });
});
