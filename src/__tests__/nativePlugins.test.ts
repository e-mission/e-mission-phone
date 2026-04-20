jest.mock('react-native', () => ({
  Platform: { OS: 'web' },
}));

describe('nativePlugins', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    delete (window as any).cordova;
  });

  it('calls mockNativeForWeb immediately when not running under cordova', async () => {
    const nativePlugins = require('../js/nativePlugins');

    expect(nativePlugins.IS_WEB).toBe(true);
    expect(nativePlugins.IS_CORDOVA).toBe(false);

    await expect(nativePlugins.pluginsReadyPromise).resolves.toBeUndefined();
  });

  it('does not call mockNativeForWeb when running under cordova', async () => {
    (window as any).cordova = {};
    const nativePlugins = require('../js/nativePlugins');

    expect(nativePlugins.IS_WEB).toBe(true);
    expect(nativePlugins.IS_CORDOVA).toBe(true);

    let resolved = false;
    const ready = nativePlugins.pluginsReadyPromise.then(() => {
      resolved = true;
    });

    await Promise.resolve();
    expect(resolved).toBe(false);

    document.dispatchEvent(new Event('deviceready'));
    await ready;
    expect(resolved).toBe(true);
  });
});
