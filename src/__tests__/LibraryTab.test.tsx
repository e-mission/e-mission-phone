import React from 'react';
import { RefreshControl } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import '../js/i18nextInit';
import LibraryTab from '../js/library/LibraryTab';
import { AppContext, AppContextProps } from '../js/AppContext';
import { Alerts } from '../js/components/AlertArea';
import { displayErrorMsg } from '../js/plugin/logger';
import {
  checkoutLibraryVehicle,
  checkAndGetLibrarySetupStatus,
  checkinLibraryVehicle,
  createLibrarySetupSession,
  getLibraryRentalHistory,
  getLibraryStations,
} from '../js/library/serverComm';

jest.mock('../js/components/AlertArea', () => ({
  __esModule: true,
  Alerts: {
    addMessage: jest.fn(),
    showPopup: jest.fn(),
  },
  default: () => null,
}));

jest.mock('../js/useAppState', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../js/customEventHandler', () => ({
  __esModule: true,
  EVENTS: {
    TOKEN_OR_URL_EVENT: 'TOKEN_OR_URL_EVENT',
  },
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
}));

jest.mock('../js/plugin/logger', () => ({
  __esModule: true,
  displayErrorMsg: jest.fn(),
  logDebug: jest.fn(),
  logWarn: jest.fn(),
}));

jest.mock('../js/plugin/clientStats', () => ({
  __esModule: true,
  addStatReading: jest.fn(),
}));

jest.mock('../js/library/serverComm', () => ({
  __esModule: true,
  checkAndGetLibrarySetupStatus: jest.fn(() =>
    Promise.resolve({ payment_setup_status: 'SUCCEEDED' }),
  ),
  checkinLibraryVehicle: jest.fn(),
  checkoutLibraryVehicle: jest.fn(),
  createLibrarySetupSession: jest.fn(),
  getLibraryRentalHistory: jest.fn(() => Promise.resolve({ rental_history: [] })),
  getLibraryStations: jest.fn(() => Promise.resolve({ stations: [] })),
}));

// react-native-paper's ActivityIndicator (used directly, and internally by Button's
// `loading` prop) starts a native-driven Animated.timing on mount, which crashes in this
// environment due to a react vs react-native-renderer version mismatch. Stub both out.
jest.mock('react-native-paper', () => {
  const actual = jest.requireActual('react-native-paper');
  const ReactLib = require('react');
  const { Pressable, Text: RNText } = require('react-native');
  const MockButton = ({ children, onPress, disabled }: any) =>
    ReactLib.createElement(
      Pressable,
      { onPress, disabled },
      ReactLib.createElement(RNText, null, children),
    );
  return { ...actual, ActivityIndicator: () => null, Button: MockButton };
});

// the Library tab is only shown when `vehicle_library` is configured, and once it is,
// `fee_expression` is expected to always be present too - mock that config here
const mockAppConfig = {
  vehicle_library: {
    fee_expression:
      "((duration>(5/60))*5 + (duration>5)*30 + (duration>24)*65 + (duration>72)*100 + (duration>144)*180) * (1 - 0.5*(subgroup=='discount'))",
  },
} as unknown as AppContextProps['appConfig'];

function renderLibraryTab() {
  return render(
    <AppContext.Provider value={{ appConfig: mockAppConfig } as AppContextProps}>
      <LibraryTab />
    </AppContext.Provider>,
  );
}

// fires the checkout/return QR scanner's manual code entry (see QRScanner.tsx)
async function submitManualCode(
  tree: ReturnType<typeof render>,
  placeholder: string,
  code: string,
) {
  fireEvent.changeText(tree.getByPlaceholderText(placeholder), code);
  await act(async () => {
    fireEvent.press(tree.getByTestId('qr-manual-submit'));
    await Promise.resolve();
  });
}

describe('LibraryTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // the real useAppState hook invokes onActive once on mount (see useAppState.ts);
    // replicate that here so LibraryTab's setup/rental-history fetches actually run
    const useAppState = require('../js/useAppState').default as jest.Mock;
    useAppState.mockImplementationOnce(
      ({ onActive }: { onActive?: (msNotActive: number) => void } = {}) => {
        onActive?.(0);
        return { appState: 'active', lastActiveMs: 0, lastNotActiveMs: 0 };
      },
    );

    (checkAndGetLibrarySetupStatus as jest.Mock).mockResolvedValue({
      payment_setup_status: 'SUCCEEDED',
      is_sandbox: false,
    });
    (getLibraryRentalHistory as jest.Mock).mockResolvedValue({ rental_history: [] });
    (getLibraryStations as jest.Mock).mockResolvedValue({ stations: [] });
  });

  it('shows a payment setup banner when setup is incomplete, and starts setup on press', async () => {
    (checkAndGetLibrarySetupStatus as jest.Mock).mockResolvedValue({
      payment_setup_status: 'NOT_STARTED',
      is_sandbox: false,
    });
    (createLibrarySetupSession as jest.Mock).mockResolvedValueOnce({
      url: 'https://example.com/setup-session',
    });
    (window as any).cordova = { InAppBrowser: { open: jest.fn() } };

    const tree = renderLibraryTab();

    await waitFor(() => {
      expect(tree.getByText('Set up your payment method to check out a vehicle.')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(tree.getByText('Set up payment'));
      await Promise.resolve();
    });

    expect(createLibrarySetupSession).toHaveBeenCalledTimes(1);
  });

  it('shows rental history entries returned by getLibraryRentalHistory', async () => {
    (getLibraryRentalHistory as jest.Mock).mockResolvedValueOnce({
      rental_history: [
        {
          vehicle_id: 'bike-1',
          vehicle_name: 'Blue Bike',
          start_ts: 1700000000,
          start_fmt_time: '2023-11-14T22:00:00-08:00',
          start_dock_id: 'dock-A',
          end_ts: 1700003600,
          end_fmt_time: '2023-11-14T23:00:00-08:00',
          end_dock_id: 'dock-B',
          rental_status: 'completed',
        },
        {
          vehicle_id: 'bike-2',
          vehicle_name: null,
          start_ts: 1700010000,
          start_fmt_time: '2023-11-15T00:40:00-08:00',
          start_dock_id: 'dock-C',
          end_ts: null,
          rental_status: 'active',
        },
      ],
    });

    const tree = renderLibraryTab();

    await waitFor(() => {
      expect(tree.getByText(/Blue Bike.*completed/)).toBeTruthy();
      expect(tree.getByText(/2023-11-14T22.*dock-A.*2023-11-14T23.*dock-B/)).toBeTruthy();
      // the active rental drives the "Active Rental" screen instead of "Available Vehicles"
      expect(tree.getByText('Active Rental')).toBeTruthy();
    });
  });

  it('shows "No rentals yet." when rental history is empty', async () => {
    const tree = renderLibraryTab();

    await waitFor(() => {
      expect(tree.getByText('No rentals yet.')).toBeTruthy();
    });
  });

  it('shows station cards loaded automatically on mount', async () => {
    (getLibraryStations as jest.Mock).mockResolvedValueOnce({
      stations: [
        {
          id: 'loc-1',
          type: 'BIKE_DOCKS',
          label: 'Main St Station',
          address: '123 Main St',
          status: 'LAUNCHED',
          connection: 'online',
          devices: { total: 5, available: 3, online: 5, rentable_vehicles: 2 },
        },
        {
          id: 'loc-2',
          type: 'BIKE_DOCKS',
          label: 'Park Ave Station',
          status: 'LAUNCHED',
          connection: 'online',
          devices: { total: 3, available: 1, online: 3, rentable_vehicles: 0 },
        },
      ],
    });

    const tree = renderLibraryTab();

    await waitFor(() => {
      expect(getLibraryStations).toHaveBeenCalled();
      expect(tree.getByText('Main St Station')).toBeTruthy();
      expect(tree.getByText('Park Ave Station')).toBeTruthy();
    });
  });

  it('shows "No stations found." when stations list is empty', async () => {
    const tree = renderLibraryTab();

    await waitFor(() => {
      expect(tree.getByText('No stations found.')).toBeTruthy();
    });
  });

  it('pull-to-refresh calls refreshSetupStatus, refreshRentalHistory, and loadStations', async () => {
    const tree = renderLibraryTab();

    await waitFor(() => expect(getLibraryStations).toHaveBeenCalledTimes(1));
    jest.clearAllMocks();
    (checkAndGetLibrarySetupStatus as jest.Mock).mockResolvedValue({
      payment_setup_status: 'SUCCEEDED',
      is_sandbox: false,
    });
    (getLibraryRentalHistory as jest.Mock).mockResolvedValue({ rental_history: [] });
    (getLibraryStations as jest.Mock).mockResolvedValue({ stations: [] });

    const refreshControl = tree.UNSAFE_getByType(RefreshControl);

    await act(async () => {
      refreshControl.props.onRefresh();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(checkAndGetLibrarySetupStatus).toHaveBeenCalledTimes(1);
      expect(getLibraryRentalHistory).toHaveBeenCalledTimes(1);
      expect(getLibraryStations).toHaveBeenCalledTimes(1);
    });
  });

  it('blocks scanning to checkout when payment setup is incomplete', async () => {
    (checkAndGetLibrarySetupStatus as jest.Mock).mockResolvedValue({
      payment_setup_status: 'NOT_STARTED',
      is_sandbox: false,
    });

    const tree = renderLibraryTab();

    await waitFor(() => tree.getByText('Set up your payment method to check out a vehicle.'));

    fireEvent.press(tree.getByText('Scan'));

    expect(Alerts.addMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        text: 'Please complete payment setup before checking out a vehicle.',
      }),
    );
    expect(tree.queryByText('Scan Vehicle QR Code')).toBeNull();
  });

  it('completes a full checkout via manual code entry', async () => {
    (checkoutLibraryVehicle as jest.Mock).mockResolvedValueOnce({
      result: 'checked_out',
      vehicle_id: 'bike-123',
    });
    (getLibraryRentalHistory as jest.Mock)
      .mockResolvedValueOnce({ rental_history: [] })
      .mockResolvedValueOnce({
        rental_history: [
          {
            vehicle_id: 'bike-123',
            start_ts: Math.floor(Date.now() / 1000),
            end_ts: null,
            rental_status: 'active',
          },
        ],
      });

    const tree = renderLibraryTab();

    await waitFor(() => tree.getByText('Available Vehicles'));
    fireEvent.press(tree.getByText('Scan'));

    await waitFor(() => tree.getByText('Scan Vehicle QR Code'));
    await submitManualCode(tree, 'Vehicle ID', 'bike-123');

    await waitFor(() => tree.getByText('Checkout Vehicle bike-123'));

    await act(async () => {
      fireEvent.press(tree.getByText('Check Out ($380.00 hold)'));
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(checkoutLibraryVehicle).toHaveBeenCalledWith('bike-123', 38000);
      expect(getLibraryRentalHistory).toHaveBeenCalledTimes(2);
      expect(tree.getByText('Active Rental')).toBeTruthy();
    });
  });

  it('stays on the checkout screen and surfaces an error when checkout fails', async () => {
    (checkoutLibraryVehicle as jest.Mock).mockRejectedValueOnce(
      new Error('mocked checkout failure'),
    );

    const tree = renderLibraryTab();

    await waitFor(() => tree.getByText('Available Vehicles'));
    fireEvent.press(tree.getByText('Scan'));
    await waitFor(() => tree.getByText('Scan Vehicle QR Code'));
    await submitManualCode(tree, 'Vehicle ID', 'bike-123');
    await waitFor(() => tree.getByText('Checkout Vehicle bike-123'));

    await act(async () => {
      fireEvent.press(tree.getByText('Check Out ($380.00 hold)'));
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(displayErrorMsg).toHaveBeenCalledWith(
        'Error: mocked checkout failure',
        'Checkout failed',
      );
      expect(tree.getByText('Checkout Vehicle bike-123')).toBeTruthy();
    });
  });

  it('completes a full return via manual dock code entry', async () => {
    const activeRental = {
      vehicle_id: 'bike-123',
      start_ts: Math.floor(Date.now() / 1000) - 1800,
      end_ts: null,
      rental_status: 'active' as const,
    };
    const completedRental = {
      ...activeRental,
      end_ts: Math.floor(Date.now() / 1000),
      rental_status: 'completed' as const,
    };

    (getLibraryRentalHistory as jest.Mock)
      .mockResolvedValueOnce({ rental_history: [activeRental] })
      .mockResolvedValueOnce({ rental_history: [completedRental] });
    (checkinLibraryVehicle as jest.Mock).mockResolvedValueOnce({
      result: 'checked_in',
      vehicle_id: 'bike-123',
      dock_id: 'dock-1',
    });

    const tree = renderLibraryTab();

    await waitFor(() => tree.getByText('Active Rental'));
    fireEvent.press(tree.getByText('Scan Dock to Return'));

    await waitFor(() => tree.getByText('Scan Dock QR Code'));
    await submitManualCode(tree, 'Dock ID', 'dock-1');

    await waitFor(() => tree.getByText('Confirm Return Details'));

    await act(async () => {
      fireEvent.press(tree.getByText('Confirm Return'));
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(checkinLibraryVehicle).toHaveBeenCalledWith('dock-1');
      expect(getLibraryRentalHistory).toHaveBeenCalledTimes(2);
      expect(tree.getByText('Return Complete!')).toBeTruthy();
    });

    fireEvent.press(tree.getByText('Back to Available Vehicles'));
    await waitFor(() => expect(tree.getByText('Available Vehicles')).toBeTruthy());
  });

  it('reverts to the confirm step and surfaces an error when checkin fails', async () => {
    const activeRental = {
      vehicle_id: 'bike-123',
      start_ts: Math.floor(Date.now() / 1000) - 1800,
      end_ts: null,
      rental_status: 'active' as const,
    };

    (getLibraryRentalHistory as jest.Mock).mockResolvedValueOnce({
      rental_history: [activeRental],
    });
    (checkinLibraryVehicle as jest.Mock).mockRejectedValueOnce(new Error('mocked checkin failure'));

    const tree = renderLibraryTab();

    await waitFor(() => tree.getByText('Active Rental'));
    fireEvent.press(tree.getByText('Scan Dock to Return'));
    await waitFor(() => tree.getByText('Scan Dock QR Code'));
    await submitManualCode(tree, 'Dock ID', 'dock-1');
    await waitFor(() => tree.getByText('Confirm Return Details'));

    await act(async () => {
      fireEvent.press(tree.getByText('Confirm Return'));
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(displayErrorMsg).toHaveBeenCalledWith(
        'Error: mocked checkin failure',
        'Stripe return failed',
      );
      expect(tree.getByText('Confirm Return Details')).toBeTruthy();
    });
  });
});
