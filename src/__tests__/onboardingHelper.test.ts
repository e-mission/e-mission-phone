import {
  OnboardingRoute,
  getPendingOnboardingState,
  setOnboardingFailed,
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
  displayError: jest.fn(),
  logDebug: jest.fn(),
}));

describe('getPendingOnboardingState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setOnboardingFailed(false);

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

  it('fails immediately when onboarding state resolution throws an error', async () => {
    const getOpcodeMock = window['cordova'].plugins.OPCodeAuth.getOPCode as jest.Mock;
    getOpcodeMock.mockRejectedValue(new Error('native failure'));

    await expect(getPendingOnboardingState()).resolves.toEqual({
      opcode: '',
      subgroup: undefined,
      route: OnboardingRoute.FAILED,
    });

    expect(getOpcodeMock).toHaveBeenCalledTimes(1);
    expect(getConfig).toHaveBeenCalledTimes(1);
  });

  it('returns the onboarding route when state resolves successfully', async () => {
    const getOpcodeMock = window['cordova'].plugins.OPCodeAuth.getOPCode as jest.Mock;
    getOpcodeMock.mockResolvedValue('test-opcode');

    const state = await getPendingOnboardingState();

    expect(state).toEqual({
      opcode: 'test-opcode',
      subgroup: 'test-subgroup',
      route: OnboardingRoute.SUMMARY,
    });
  });

  it('routes stale onboarding state to FAILED once the helper reports a failure', async () => {
    const getOpcodeMock = window['cordova'].plugins.OPCodeAuth.getOPCode as jest.Mock;
    getOpcodeMock.mockResolvedValue('test-opcode');
    (getConfig as jest.Mock).mockResolvedValue(null);
    (readConsentState as jest.Mock).mockResolvedValue(true);
    setOnboardingFailed(true);

    const state = await getPendingOnboardingState();

    expect(state).toEqual({
      opcode: 'test-opcode',
      subgroup: undefined,
      route: OnboardingRoute.FAILED,
    });
  });
});
