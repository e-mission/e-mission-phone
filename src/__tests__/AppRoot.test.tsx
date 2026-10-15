import React from 'react';
import { Animated } from 'react-native';
import { Button, Dialog, Text } from 'react-native-paper';
import renderer from 'react-test-renderer';
import AlertArea from '../js/components/AlertArea';
import AppModalHost from '../js/components/AppModalHost';
import { AppContext, AppContextProps } from '../js/AppContext';
import { Alerts } from '../js/components/alerts';
import { emailErrorReport } from '../js/services/shareLocalDBFile';

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

jest.mock('../js/services/shareLocalDBFile', () => ({
  emailErrorReport: jest.fn(),
}));

jest.mock('../js/plugin/clientStats', () => ({
  addStatError: jest.fn(),
}));

describe('AppRoot startup protection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDisplayError.mockImplementation((error: Error, title?: string) => {
      jest.requireActual('../js/plugin/logger').displayError(error, title);
    });
    (emailErrorReport as jest.Mock).mockReset().mockResolvedValue(undefined);
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
    async (startup: boolean) => {
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
        const emailButton = root.root
          .findAllByType(Button)
          .find((button) => button.props.icon === 'email-outline');
        expect(emailButton).toBeDefined();
        await renderer.act(async () => {
          await emailButton?.props.onPress();
        });
        expect(emailErrorReport).toHaveBeenCalledWith(
          'Rendering Error',
          err.message + '\n' + err.stack,
        );
      } finally {
        renderer.act(() => root?.unmount());
        mockApp.mockImplementation(() => null);
        consoleError.mockRestore();
      }
    },
  );

  it.each([
    [null, 'null'],
    [undefined, 'undefined'],
    ['render string failure', 'render string failure'],
    [{ message: 'render object failure', stack: 'original object stack' }, 'render object failure'],
  ])('preserves root reporting for a thrown non-Error value: %p', async (thrown, message) => {
    const AppRoot = require('../js/AppRoot').default;
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockApp.mockImplementation(() => {
      throw thrown;
    });
    let root!: renderer.ReactTestRenderer;

    try {
      renderer.act(() => {
        root = renderer.create(<AppRoot />);
      });
      expect(root.root.findAllByType(AlertArea)).toHaveLength(1);
      expect(mockDisplayError).toHaveBeenCalledTimes(1);
      const reportedError = mockDisplayError.mock.calls[0][0] as Error;
      expect(reportedError).toBeInstanceOf(Error);
      expect(reportedError.message).toBe(message);
      expect(reportedError.stack).toContain('ErrorBoundary');
      if (thrown && typeof thrown === 'object') {
        expect(reportedError.stack).toContain(thrown.stack);
      }
      const details = `${reportedError.message}\n${reportedError.stack}`;
      expect(root.root.findAllByType(Text).some((text) => text.props.children === details)).toBe(
        true,
      );
      expect(root.root.findByType(Dialog.Title).props.children).toBe('Rendering Error');
      const emailButton = root.root
        .findAllByType(Button)
        .find((button) => button.props.icon === 'email-outline');
      expect(emailButton).toBeDefined();
      await renderer.act(async () => {
        await emailButton?.props.onPress();
      });
      expect(emailErrorReport).toHaveBeenCalledWith('Rendering Error', details);
    } finally {
      renderer.act(() => root?.unmount());
      mockApp.mockImplementation(() => null);
      consoleError.mockRestore();
    }
  });

  it('renders custom modals with live app context and keeps text popups at the root', () => {
    const AppRoot = require('../js/AppRoot').default;
    let deployment = 'first-deployment';
    const ContextModal = ({ visible, onDismiss, label }) => {
      const { appConfig } = React.useContext(AppContext);
      return (
        <Text onPress={onDismiss}>{`${label}:${appConfig?.url_abbreviation}:${visible}`}</Text>
      );
    };
    mockApp.mockImplementation(() => (
      <AppContext.Provider
        value={{ appConfig: { url_abbreviation: deployment } } as AppContextProps}>
        <AppModalHost />
      </AppContext.Provider>
    ));
    let root!: renderer.ReactTestRenderer;

    try {
      renderer.act(() => {
        root = renderer.create(<AppRoot />);
      });
      renderer.act(() => Alerts.showPopup(ContextModal, { label: 'Feedback' }));
      expect(
        root.root
          .findAllByType(Text)
          .some((text) => text.props.children === 'Feedback:first-deployment:true'),
      ).toBe(true);

      deployment = 'updated-deployment';
      renderer.act(() => root.update(<AppRoot />));
      expect(
        root.root
          .findAllByType(Text)
          .some((text) => text.props.children === 'Feedback:updated-deployment:true'),
      ).toBe(true);

      renderer.act(() => Alerts.showPopup({ title: 'Root alert', content: 'Root details' }));
      expect(root.root.findByType(Dialog.Title).props.children).toBe('Root alert');
      expect(root.root.findAllByType(ContextModal)).toHaveLength(1);

      renderer.act(() => root.root.findByType(ContextModal).props.onDismiss());
      expect(root.root.findAllByType(ContextModal)).toHaveLength(0);
      expect(root.root.findByType(Dialog.Title).props.children).toBe('Root alert');
    } finally {
      renderer.act(() => root?.unmount());
      mockApp.mockImplementation(() => null);
    }
  });

  it('reports custom modal render failures through the surviving root alert host', () => {
    const AppRoot = require('../js/AppRoot').default;
    const err = new Error('custom modal render boom');
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const BrokenModal = () => {
      throw err;
    };
    mockApp.mockImplementation(() => <AppModalHost />);
    let root!: renderer.ReactTestRenderer;

    try {
      renderer.act(() => {
        root = renderer.create(<AppRoot />);
      });
      renderer.act(() => Alerts.showPopup(BrokenModal));
      expect(root.root.findAllByType(AppModalHost)).toHaveLength(0);
      expect(root.root.findAllByType(AlertArea)).toHaveLength(1);
      expect(root.root.findByType(Dialog.Title).props.children).toBe('Rendering Error');
      expect(mockDisplayError).toHaveBeenCalledWith(err, 'Rendering Error');
      expect(
        root.root
          .findAllByType(Text)
          .some(
            (text) =>
              typeof text.props.children === 'string' && text.props.children.includes(err.message),
          ),
      ).toBe(true);
      expect(() => Alerts.showPopup(BrokenModal)).not.toThrow();
    } finally {
      renderer.act(() => root?.unmount());
      mockApp.mockImplementation(() => null);
      consoleError.mockRestore();
    }
  });

  it('clears the alert host and its popup after the background timeout', () => {
    const AppRoot = require('../js/AppRoot').default;
    const CustomModal = () => <Text>Old custom modal</Text>;
    mockApp.mockImplementation(() => <AppModalHost />);
    let root!: renderer.ReactTestRenderer;

    try {
      renderer.act(() => {
        root = renderer.create(<AppRoot />);
      });
      renderer.act(() => {
        Alerts.showPopup(CustomModal);
        Alerts.showPopup({ title: 'Old popup', content: 'Old details' });
      });
      expect(root.root.findAllByType(CustomModal)).toHaveLength(1);
      expect(
        root.root.findAllByType(Text).some((text) => text.props.children === 'Old details'),
      ).toBe(true);
      expect(
        root.root.findAllByType(Button).some((button) => button.props.icon === 'email-outline'),
      ).toBe(false);

      mockUseAppState.mockReturnValue({
        appState: 'background',
        lastNotActiveMs: Date.now() - 6 * 60 * 1000,
      });
      renderer.act(() => root.update(<AppRoot />));
      expect(root.toJSON()).toBeNull();

      mockUseAppState.mockReturnValue({ appState: 'active', lastNotActiveMs: 0 });
      renderer.act(() => root.update(<AppRoot />));
      expect(root.root.findAllByType(AlertArea)).toHaveLength(1);
      expect(root.root.findAllByType(AppModalHost)).toHaveLength(1);
      expect(root.root.findAllByType(CustomModal)).toHaveLength(0);
      expect(
        root.root.findAllByType(Text).some((text) => text.props.children === 'Old details'),
      ).toBe(false);
    } finally {
      renderer.act(() => root?.unmount());
      mockApp.mockImplementation(() => null);
    }
  });

  it('keeps the original error visible and allows retry when email preparation fails', async () => {
    const AppRoot = require('../js/AppRoot').default;
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    (emailErrorReport as jest.Mock).mockRejectedValueOnce(new Error('No email app'));
    let root!: renderer.ReactTestRenderer;

    try {
      renderer.act(() => {
        root = renderer.create(<AppRoot />);
      });
      renderer.act(() => mockDisplayError(new Error('Original error'), 'Rendering Error'));
      const emailButton = root.root
        .findAllByType(Button)
        .find((button) => button.props.icon === 'email-outline');
      await renderer.act(async () => {
        await emailButton?.props.onPress();
      });

      expect(root.root.findByType(Dialog.Title).props.children).toBe('Rendering Error');
      expect(
        root.root
          .findAllByType(Text)
          .some(
            (text) =>
              typeof text.props.children === 'string' &&
              text.props.children.includes('Original error'),
          ),
      ).toBe(true);
      expect(
        root.root.findAllByType(Text).some((text) => text.props.children === 'No email app'),
      ).toBe(true);
      expect(emailButton?.props.disabled).toBe(false);
    } finally {
      renderer.act(() => root?.unmount());
      consoleError.mockRestore();
    }
  });

  it('disables the email action while preparing the report', async () => {
    const AppRoot = require('../js/AppRoot').default;
    const animation = jest.spyOn(Animated, 'timing').mockReturnValue({
      start: jest.fn(),
      stop: jest.fn(),
      reset: jest.fn(),
    });
    const loopAnimation = jest.spyOn(Animated, 'loop').mockReturnValue({
      start: jest.fn(),
      stop: jest.fn(),
      reset: jest.fn(),
    });
    let finish!: () => void;
    (emailErrorReport as jest.Mock).mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    let root!: renderer.ReactTestRenderer;

    try {
      renderer.act(() => {
        root = renderer.create(<AppRoot />);
      });
      renderer.act(() => Alerts.showPopup({ title: 'Error', content: 'boom', reportError: true }));
      const emailButton = root.root
        .findAllByType(Button)
        .find((button) => button.props.icon === 'email-outline');
      renderer.act(() => {
        void emailButton?.props.onPress();
      });
      expect(emailButton?.props.disabled).toBe(true);
      expect(emailButton?.props.loading).toBe(true);
      await renderer.act(async () => finish());
      expect(emailButton?.props.disabled).toBe(false);
    } finally {
      renderer.act(() => root?.unmount());
      animation.mockRestore();
      loopAnimation.mockRestore();
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
