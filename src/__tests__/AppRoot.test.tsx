import React from 'react';
import { Dialog, Text } from 'react-native-paper';
import renderer from 'react-test-renderer';
import AlertArea from '../js/components/AlertArea';
import { Alerts } from '../js/components/alerts';

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
    mockDisplayError.mockImplementation((error: Error, title?: string) => {
      Alerts.showPopup({ title, content: error.message + '\n' + error.stack });
    });
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

    expect(mockDisplayError).toHaveBeenCalledWith(err, 'Rendering Error');
  });

  it.each([true, false])(
    'shows the error Alert popup after a render failure (startup: %s)',
    (startup: boolean) => {
      const AppRoot = require('../js/AppRoot').default;
      const err = new Error('root render boom');
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      let root!: renderer.ReactTestRenderer;

      try {
        if (!startup) {
          renderer.act(() => {
            root = renderer.create(<AppRoot />);
          });
        }
        mockApp.mockImplementation(() => {
          throw err;
        });
        renderer.act(() => {
          if (startup) root = renderer.create(<AppRoot />);
          else root.update(<AppRoot />);
        });

        expect(root.root.findAllByType(AlertArea)).toHaveLength(1);
        const details = root.root
          .findAllByType(Text)
          .find((text) => text.props.children === err.message + '\n' + err.stack);
        expect(details).toBeDefined();
        expect(details?.props.children).toContain(err.stack);
        expect(root.root.findByType(Dialog.Title).props.children).toBe('Rendering Error');
        expect(mockDisplayError).toHaveBeenCalledWith(err, 'Rendering Error');
        expect(root.root.findAllByType(mockApp)).toHaveLength(0);
      } finally {
        renderer.act(() => root?.unmount());
        mockApp.mockImplementation(() => null);
        consoleError.mockRestore();
      }
    },
  );

  it('clears the alert host and its popup after the background timeout', () => {
    const AppRoot = require('../js/AppRoot').default;
    let root!: renderer.ReactTestRenderer;

    try {
      renderer.act(() => {
        root = renderer.create(<AppRoot />);
      });
      renderer.act(() => {
        Alerts.showPopup({ title: 'Old popup', content: 'Old details' });
      });
      expect(
        root.root.findAllByType(Text).some((text) => text.props.children === 'Old details'),
      ).toBe(true);

      mockUseAppState.mockReturnValue({
        appState: 'background',
        lastNotActiveMs: Date.now() - 6 * 60 * 1000,
      });
      renderer.act(() => root.update(<AppRoot />));
      expect(root.toJSON()).toBeNull();

      mockUseAppState.mockReturnValue({ appState: 'active', lastNotActiveMs: 0 });
      renderer.act(() => root.update(<AppRoot />));
      expect(root.root.findAllByType(AlertArea)).toHaveLength(1);
      expect(
        root.root.findAllByType(Text).some((text) => text.props.children === 'Old details'),
      ).toBe(false);
    } finally {
      renderer.act(() => root?.unmount());
    }
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
