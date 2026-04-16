const mockLogger = jest.fn();
const mockBEMDataCollection = jest.fn();
const mockBEMServerCom = jest.fn();
const mockBEMUserCache = jest.fn();
const mockDevice = jest.fn();
const mockGetAppVersion = jest.fn();
const mockOPCodeAuth = jest.fn();

jest.mock('react-native', () => ({
  Platform: { OS: 'web' },
}));

class MockDOMParser {}

jest.mock('react-native-html-parser', () => ({
  DOMParser: MockDOMParser,
}));

jest.mock('../__mocks__/cordovaMocks', () => ({
  mockLogger: (...args: any[]) => mockLogger(...args),
  mockBEMDataCollection: (...args: any[]) => mockBEMDataCollection(...args),
  mockBEMServerCom: (...args: any[]) => mockBEMServerCom(...args),
  mockBEMUserCache: (...args: any[]) => mockBEMUserCache(...args),
  mockDevice: (...args: any[]) => mockDevice(...args),
  mockGetAppVersion: (...args: any[]) => mockGetAppVersion(...args),
  mockOPCodeAuth: (...args: any[]) => mockOPCodeAuth(...args),
}));

describe('nativePlugins', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    delete (window as any).cordova;
    delete (global as any).DOMParser;
  });

  it('mocks plugins immediately when not running under cordova', async () => {
    const nativePlugins = require('../js/nativePlugins');

    expect(nativePlugins.IS_WEB).toBe(true);
    expect(nativePlugins.IS_CORDOVA).toBe(false);

    expect((global as any).DOMParser).toBe(MockDOMParser);
    expect(mockLogger).toHaveBeenCalledTimes(1);
    expect(mockDevice).toHaveBeenCalledTimes(1);
    expect(mockGetAppVersion).toHaveBeenCalledTimes(1);
    expect(mockBEMUserCache).toHaveBeenCalledTimes(1);
    expect(mockBEMServerCom).toHaveBeenCalledTimes(1);
    expect(mockBEMDataCollection).toHaveBeenCalledTimes(1);
    expect(mockOPCodeAuth).toHaveBeenCalledTimes(1);

    await expect(nativePlugins.pluginsReadyPromise).resolves.toBeUndefined();
  });

  it('waits for deviceready when running under cordova', async () => {
    (window as any).cordova = {};
    const nativePlugins = require('../js/nativePlugins');

    expect(nativePlugins.IS_WEB).toBe(true);
    expect(nativePlugins.IS_CORDOVA).toBe(true);

    expect(mockLogger).not.toHaveBeenCalled();
    expect(mockDevice).not.toHaveBeenCalled();
    expect(mockGetAppVersion).not.toHaveBeenCalled();
    expect(mockBEMUserCache).not.toHaveBeenCalled();
    expect(mockBEMServerCom).not.toHaveBeenCalled();
    expect(mockBEMDataCollection).not.toHaveBeenCalled();
    expect(mockOPCodeAuth).not.toHaveBeenCalled();

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
