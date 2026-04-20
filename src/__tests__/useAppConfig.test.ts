import { renderHook, waitFor } from '@testing-library/react-native';
import useAppConfig from '../js/useAppConfig';

const mockGetConfig = jest.fn();
const mockSetConfigChanged = jest.fn();
const mockLogDebug = jest.fn();
let mockConfigChanged = false;

jest.mock('../js/config/dynamicConfig', () => ({
  get configChanged() {
    return mockConfigChanged;
  },
  getConfig: (...args: any[]) => mockGetConfig(...args),
  setConfigChanged: (...args: any[]) => mockSetConfigChanged(...args),
}));

jest.mock('../js/plugin/logger', () => ({
  logDebug: (...args: any[]) => mockLogDebug(...args),
}));

describe('useAppConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConfigChanged = false;
  });

  it('loads and returns a non-empty config', async () => {
    const config = {
      version: 1,
      intro: { translated_text: { en: { deployment_name: 'test' } } },
    } as any;
    mockGetConfig.mockResolvedValue(config);

    const { result } = renderHook(() => useAppConfig());

    await waitFor(() => {
      expect(result.current).toEqual(config);
    });
  });

  it('treats empty config as null and logs debug message', async () => {
    mockGetConfig.mockResolvedValue({});

    const { result } = renderHook(() => useAppConfig());

    await waitFor(() => {
      expect(result.current).toBeNull();
    });
    expect(mockLogDebug).toHaveBeenCalledWith('Config was empty, treating as null');
  });

  it('refreshes config when configChanged is true and resets the flag', async () => {
    const initialConfig = { version: 1 } as any;
    const refreshedConfig = { version: 2 } as any;
    mockGetConfig.mockResolvedValue(initialConfig);

    const { result, rerender } = renderHook(() => useAppConfig());

    await waitFor(() => {
      expect(result.current).toEqual(initialConfig);
    });

    mockGetConfig.mockResolvedValue(refreshedConfig);
    mockConfigChanged = true;
    rerender({});

    await waitFor(() => {
      expect(result.current).toEqual(refreshedConfig);
    });
    expect(mockSetConfigChanged).toHaveBeenCalledWith(false);
  });
});
