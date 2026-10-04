describe('AppRoot startup protection', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('logs and ignores registration failures during plugin-ready startup', async () => {
    const displayError = jest.fn();
    const logDebug = jest.fn();
    const registerRootComponent = jest.fn(() => {
      throw new Error('register boom');
    });

    jest.doMock('expo', () => ({
      registerRootComponent,
    }));
    jest.doMock('../js/useAppState', () => ({
      __esModule: true,
      default: jest.fn(() => ({ appState: 'active', lastNotActiveMs: 0 })),
    }));
    jest.doMock('../js/App', () => ({
      __esModule: true,
      default: jest.fn(() => null),
    }));
    jest.doMock('../js/config/dynamicConfig', () => ({
      resetPromisedConfig: jest.fn(),
    }));
    jest.doMock('../js/nativePlugins', () => ({
      pluginsReadyPromise: Promise.resolve(),
    }));
    jest.doMock('../js/plugin/logger', () => ({
      displayError,
      displayErrorMsg: jest.fn(),
      logDebug,
    }));

    jest.isolateModules(() => {
      require('../js/AppRoot');
    });

    await Promise.resolve();

    expect(registerRootComponent).toHaveBeenCalled();
    expect(displayError).toHaveBeenCalledWith(
      expect.stringContaining('AppRoot: root registration failed: Error: register boom'),
    );
    expect(logDebug).toHaveBeenCalledWith(
      expect.stringContaining('AppRoot: root registration failed: Error: register boom'),
    );
  });
});
