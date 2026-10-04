import {
  OnboardingRoute,
  resolveOnboardingStateWithRetry,
} from '../js/onboarding/onboardingHelper';
import { getConfig } from '../js/config/dynamicConfig';
import { readConsentState } from '../js/splash/startprefs';
import { storageGet } from '../js/plugin/storage';

jest.mock('../js/config/dynamicConfig', () => ({
  getConfig: jest.fn(),
  resetDataAndRefresh: jest.fn(),
}));

jest.mock('../js/plugin/storage', () => ({
  storageGet: jest.fn(),
  storageSet: jest.fn(),
}));

jest.mock('../js/splash/startprefs', () => ({
  readConsentState: jest.fn(),
}));

jest.mock('../js/plugin/clientStats', () => ({
  addStatReading: jest.fn(),
}));

jest.mock('../js/config/opcode', () => ({
  getSubgroupFromToken: jest.fn(() => 'test-subgroup'),
}));

jest.mock('../js/plugin/logger', () => ({
  logDebug: jest.fn(),
}));

describe('resolveOnboardingStateWithRetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (getConfig as jest.Mock).mockResolvedValue({});
    (readConsentState as jest.Mock).mockResolvedValue(false);
    (storageGet as jest.Mock).mockResolvedValue(null);

    Object.defineProperty(window, 'cordova', {
      value: {
        plugins: {
          OPCodeAuth: {
            getOPCode: jest.fn(),
          },
        },
      },
      configurable: true,
    });
  });

  it('times out and returns null after repeated onboarding resolution failures', async () => {
    const getOpcodeMock = window['cordova'].plugins.OPCodeAuth.getOPCode as jest.Mock;
    getOpcodeMock.mockRejectedValue(new Error('native failure'));

    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
    setTimeoutSpy.mockImplementation(((fn: (...args: any[]) => void, delay?: number) => {
      if (typeof fn === 'function') {
        fn();
      }
      return 0 as any;
    }) as typeof setTimeout);

    await expect(resolveOnboardingStateWithRetry()).resolves.toBeNull();

    expect(getOpcodeMock).toHaveBeenCalledTimes(4);
    expect(setTimeoutSpy).toHaveBeenCalledTimes(3);
    expect(setTimeoutSpy).toHaveBeenNthCalledWith(1, expect.any(Function), 250);
    expect(setTimeoutSpy).toHaveBeenNthCalledWith(2, expect.any(Function), 500);
    expect(setTimeoutSpy).toHaveBeenNthCalledWith(3, expect.any(Function), 1000);
    expect(getConfig).toHaveBeenCalledTimes(4);

    setTimeoutSpy.mockRestore();
  });

  it('returns the onboarding route when state resolves successfully', async () => {
    const getOpcodeMock = window['cordova'].plugins.OPCodeAuth.getOPCode as jest.Mock;
    getOpcodeMock.mockResolvedValue('test-opcode');

    const state = await resolveOnboardingStateWithRetry();

    expect(state).toEqual({
      opcode: 'test-opcode',
      subgroup: 'test-subgroup',
      route: OnboardingRoute.SUMMARY,
    });
  });
});
