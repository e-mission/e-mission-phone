import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Button as PaperButton, Appbar } from 'react-native-paper';
import LibraryTab from '../js/library/LibraryTab';
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

jest.mock('../js/components/NavBar', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

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
}));

jest.mock('../js/plugin/clientStats', () => ({
  __esModule: true,
  addStatReading: jest.fn(),
}));

jest.mock('../js/library/serverComm', () => ({
  __esModule: true,
  checkAndGetLibrarySetupStatus: jest.fn(),
  checkinLibraryVehicle: jest.fn(),
  checkoutLibraryVehicle: jest.fn(),
  createLibrarySetupSession: jest.fn(),
  getLibraryRentalHistory: jest.fn(() => Promise.resolve({ rental_history: [] })),
  getLibrarySetupStatus: jest.fn(() => Promise.resolve({ payment_setup_status: 'NOT_STARTED' })),
  getLibraryStations: jest.fn(() => Promise.resolve({ stations: [] })),
}));

describe('LibraryTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const getSetupCheckoutButton = (tree: ReturnType<typeof render>) => {
    const allButtons = tree.UNSAFE_getAllByType(PaperButton);
    const setupButton = allButtons.find((button) => button.props.children === 'setup checkout');
    if (!setupButton) {
      throw new Error('setup checkout button not found');
    }
    return setupButton;
  };

  const getCheckoutButton = (tree: ReturnType<typeof render>) => {
    const allButtons = tree.UNSAFE_getAllByType(PaperButton);
    const checkoutButton = allButtons.find((button) => button.props.children === 'checkout');
    if (!checkoutButton) {
      throw new Error('checkout button not found');
    }
    return checkoutButton;
  };

  const getReturnButton = (tree: ReturnType<typeof render>) => {
    const allButtons = tree.UNSAFE_getAllByType(PaperButton);
    const returnButton = allButtons.find((button) => button.props.children === 'return');
    if (!returnButton) {
      throw new Error('return button not found');
    }
    return returnButton;
  };

  it('rejects setup checkout flow if displayErrorMsg throws', async () => {
    let rejectRequest: (reason?: unknown) => void = () => {};
    (createLibrarySetupSession as jest.Mock)
      .mockImplementationOnce(
        () =>
          new Promise((resolve, reject) => {
            rejectRequest = reject;
          }),
      )
      .mockResolvedValueOnce({ url: 'https://example.com/setup-session' });
    (displayErrorMsg as jest.Mock).mockImplementationOnce(() => {
      throw new Error('mocked displayErrorMsg failure');
    });

    let commitCount = 0;
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <React.Profiler
        id="LibraryTab"
        onRender={() => {
          commitCount += 1;
        }}>
        {children}
      </React.Profiler>
    );

    const tree = render(<LibraryTab />, { wrapper: Wrapper });
    const initialCommitCount = commitCount;

    expect(getSetupCheckoutButton(tree).props.disabled).toBe(false);

    const setupButton = getSetupCheckoutButton(tree);
    const pressPromise = setupButton.props.onPress();
    const rejectionAssertion = expect(pressPromise).rejects.toThrow(
      'mocked displayErrorMsg failure',
    );
    expect(createLibrarySetupSession).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(getSetupCheckoutButton(tree).props.disabled).toBe(true);
    });
    const inFlightCommitCount = commitCount;
    expect(inFlightCommitCount).toBeGreaterThan(initialCommitCount);

    // While request is in flight, the button should be disabled and ignore additional presses.
    fireEvent.press(tree.getByText('setup checkout'));
    expect(createLibrarySetupSession).toHaveBeenCalledTimes(1);

    await act(async () => {
      rejectRequest(new Error('mocked 500'));
      await Promise.resolve();
    });

    await rejectionAssertion;
    expect(displayErrorMsg).toHaveBeenCalledTimes(1);
  });

  it('shows rental history entries returned by getLibraryRentalHistory', async () => {
    const useAppState = require('../js/useAppState').default as jest.Mock;
    useAppState.mockImplementationOnce(({ onActive }: { onActive: () => void }) => {
      onActive();
    });
    (getLibraryRentalHistory as jest.Mock).mockResolvedValueOnce({
      rental_history: [
        {
          vehicle_id: 'bike-1',
          vehicle_name: 'Blue Bike',
          start_ts: 1700000000,
          start_local_dt: {
            year: 2023,
            month: 11,
            day: 14,
            hour: 22,
            minute: 0,
            second: 0,
            weekday: 2,
            timezone: 'America/Los_Angeles',
          },
          start_fmt_time: '2023-11-14T22:00:00-08:00',
          start_dock_id: 'dock-A',
          start_loc: { type: 'Point', coordinates: [-122.4, 37.8] },
          end_ts: 1700003600,
          end_local_dt: {
            year: 2023,
            month: 11,
            day: 14,
            hour: 23,
            minute: 0,
            second: 0,
            weekday: 2,
            timezone: 'America/Los_Angeles',
          },
          end_fmt_time: '2023-11-14T23:00:00-08:00',
          end_dock_id: 'dock-B',
          end_loc: { type: 'Point', coordinates: [-122.5, 37.9] },
          rental_status: 'completed',
        },
        {
          vehicle_id: 'bike-2',
          vehicle_name: null,
          start_ts: 1700010000,
          start_local_dt: {
            year: 2023,
            month: 11,
            day: 15,
            hour: 0,
            minute: 40,
            second: 0,
            weekday: 3,
            timezone: 'America/Los_Angeles',
          },
          start_fmt_time: '2023-11-15T00:40:00-08:00',
          start_dock_id: 'dock-C',
          start_loc: { type: 'Point', coordinates: [-122.3, 37.7] },
          end_ts: null,
          end_local_dt: null,
          end_loc: null,
          rental_status: 'active',
        },
      ],
    });

    const tree = render(<LibraryTab />);

    await waitFor(() => {
      expect(tree.getByText(/Blue Bike.*completed/)).toBeTruthy();
      expect(tree.getByText(/bike-2.*active/)).toBeTruthy();
      // completed rental shows fmt_time and dock IDs
      expect(tree.getByText(/2023-11-14T22.*dock-A.*2023-11-14T23.*dock-B/)).toBeTruthy();
      // active rental shows start time, start dock, and "ongoing"
      expect(tree.getByText(/2023-11-15T00.*dock-C.*ongoing/)).toBeTruthy();
    });
  });

  it('shows "No rentals yet." when rental history is empty', async () => {
    const useAppState = require('../js/useAppState').default as jest.Mock;
    useAppState.mockImplementationOnce(({ onActive }: { onActive: () => void }) => {
      onActive();
    });
    (getLibraryRentalHistory as jest.Mock).mockResolvedValueOnce({ rental_history: [] });

    const tree = render(<LibraryTab />);

    await waitFor(() => {
      expect(tree.getByText('No rentals yet.')).toBeTruthy();
    });
  });

  it('shows station entries after pressing "show stations"', async () => {
    (getLibraryStations as jest.Mock).mockResolvedValueOnce({
      stations: [
        { station_id: 'st-1', name: 'Main St Station' },
        { station_id: 'st-2', name: 'Park Ave Station' },
      ],
    });

    const tree = render(<LibraryTab />);

    await act(async () => {
      fireEvent.press(tree.getByText('show stations'));
    });

    await waitFor(() => {
      expect(getLibraryStations).toHaveBeenCalledTimes(1);
      expect(tree.getByText('Main St Station')).toBeTruthy();
      expect(tree.getByText('Park Ave Station')).toBeTruthy();
    });
  });

  it('shows "No stations found." when stations list is empty', async () => {
    (getLibraryStations as jest.Mock).mockResolvedValueOnce({ stations: [] });

    const tree = render(<LibraryTab />);

    await act(async () => {
      fireEvent.press(tree.getByText('show stations'));
    });

    await waitFor(() => {
      expect(tree.getByText('No stations found.')).toBeTruthy();
    });
  });

  it('refresh button calls refreshSetupStatus and refreshRentalHistory', async () => {
    (checkAndGetLibrarySetupStatus as jest.Mock).mockResolvedValueOnce({
      payment_setup_status: 'NOT_STARTED',
    });
    (getLibraryRentalHistory as jest.Mock).mockResolvedValueOnce({ rental_history: [] });

    const tree = render(<LibraryTab />);
    const refreshButton = tree
      .UNSAFE_getAllByType(Appbar.Action)
      .find((b) => b.props.icon === 'refresh');
    expect(refreshButton).toBeTruthy();

    await act(async () => {
      refreshButton!.props.onPress();
    });

    await waitFor(() => {
      expect(checkAndGetLibrarySetupStatus).toHaveBeenCalledTimes(1);
      expect(getLibraryRentalHistory).toHaveBeenCalledTimes(1);
    });
  });

  it('successful checkout calls refreshRentalHistory and updates button states from returned history', async () => {
    const activeRental = {
      vehicle_id: 'bike-123',
      vehicle_name: 'Test Bike',
      start_ts: Math.floor(Date.now() / 1000),
      end_ts: null,
      rental_status: 'active' as const,
    };
    (checkoutLibraryVehicle as jest.Mock).mockResolvedValueOnce({
      result: 'checked_out',
      vehicle_id: 'bike-123',
    });
    (checkAndGetLibrarySetupStatus as jest.Mock).mockResolvedValueOnce({
      payment_setup_status: 'SUCCEEDED',
    });
    // first call returns empty (initial load), second returns the new active rental
    (getLibraryRentalHistory as jest.Mock)
      .mockResolvedValueOnce({ rental_history: [] })
      .mockResolvedValueOnce({ rental_history: [activeRental] });
    (Alerts.showPopup as jest.Mock).mockImplementation((popup: unknown) => {
      if (typeof popup !== 'function') return;
      const element = popup({ visible: true, onDismiss: jest.fn() });
      if (element?.props?.onConfirm) element.props.onConfirm(false, 38000);
      if (element?.props?.onManualSubmit) element.props.onManualSubmit('bike-123');
    });

    const useAppStateMock = require('../js/useAppState').default as jest.Mock;
    useAppStateMock.mockImplementationOnce(({ onActive }: { onActive: () => void }) => {
      onActive();
    });

    const tree = render(<LibraryTab />);

    await waitFor(() => expect(getCheckoutButton(tree).props.disabled).toBe(false));

    await act(async () => {
      getCheckoutButton(tree).props.onPress();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(checkoutLibraryVehicle).toHaveBeenCalledWith('bike-123', 38000);
      // refreshRentalHistory called once on mount (onActive) and once after checkout
      expect(getLibraryRentalHistory).toHaveBeenCalledTimes(2);
      // checkout button disabled because active rental exists
      expect(getCheckoutButton(tree).props.disabled).toBe(true);
      // return button enabled because active rental exists
      expect(getReturnButton(tree).props.disabled).toBe(false);
    });
  });

  it('re-enables actions after confirmCheckout server error', async () => {
    (checkoutLibraryVehicle as jest.Mock).mockRejectedValueOnce(
      new Error('mocked checkout failure'),
    );
    (Alerts.showPopup as jest.Mock).mockImplementation((popup: unknown) => {
      if (typeof popup !== 'function') {
        return;
      }

      const element = popup({ visible: true, onDismiss: jest.fn() });
      if (element?.props?.onConfirm) {
        element.props.onConfirm(false, 38000);
      }
      if (element?.props?.onManualSubmit) {
        element.props.onManualSubmit('bike-123');
      }
    });

    const tree = render(<LibraryTab />);

    expect(getSetupCheckoutButton(tree).props.disabled).toBe(false);

    await act(async () => {
      getCheckoutButton(tree).props.onPress();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(checkoutLibraryVehicle).toHaveBeenCalledWith('bike-123', 38000);
      expect(displayErrorMsg).toHaveBeenCalledWith(
        'Error: mocked checkout failure',
        'Stripe checkout failed',
      );
      expect(getSetupCheckoutButton(tree).props.disabled).toBe(false);
    });
  });

  it('checkout and return buttons reflect active rental loaded on mount', async () => {
    const useAppStateMock = require('../js/useAppState').default as jest.Mock;
    useAppStateMock.mockImplementationOnce(({ onActive }: { onActive: () => void }) => {
      onActive();
    });
    (checkAndGetLibrarySetupStatus as jest.Mock).mockResolvedValueOnce({
      payment_setup_status: 'SUCCEEDED',
    });
    (getLibraryRentalHistory as jest.Mock).mockResolvedValueOnce({
      rental_history: [
        {
          vehicle_id: 'bike-99',
          start_ts: Math.floor(Date.now() / 1000) - 3600,
          end_ts: null,
          rental_status: 'active',
        },
      ],
    });

    const tree = render(<LibraryTab />);

    await waitFor(() => {
      expect(getCheckoutButton(tree).props.disabled).toBe(true);
      expect(getReturnButton(tree).props.disabled).toBe(false);
    });
  });

  it('uses the last active rental when history has multiple entries', async () => {
    const useAppStateMock = require('../js/useAppState').default as jest.Mock;
    useAppStateMock.mockImplementationOnce(({ onActive }: { onActive: () => void }) => {
      onActive();
    });
    (checkAndGetLibrarySetupStatus as jest.Mock).mockResolvedValueOnce({
      payment_setup_status: 'SUCCEEDED',
    });
    (getLibraryRentalHistory as jest.Mock).mockResolvedValueOnce({
      rental_history: [
        // completed first rental — should not drive UI
        {
          vehicle_id: 'bike-old',
          start_ts: 1000000,
          end_ts: 1003600,
          rental_status: 'completed',
        },
        // active last rental — should drive UI
        {
          vehicle_id: 'bike-new',
          start_ts: Math.floor(Date.now() / 1000) - 600,
          end_ts: null,
          rental_status: 'active',
        },
      ],
    });

    const tree = render(<LibraryTab />);

    await waitFor(() => {
      expect(getCheckoutButton(tree).props.disabled).toBe(true);
      expect(getReturnButton(tree).props.disabled).toBe(false);
    });
  });

  it('successful checkin calls refreshRentalHistory and re-enables checkout button', async () => {
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

    const useAppStateMock = require('../js/useAppState').default as jest.Mock;
    useAppStateMock.mockImplementationOnce(({ onActive }: { onActive: () => void }) => {
      onActive();
    });
    (checkAndGetLibrarySetupStatus as jest.Mock).mockResolvedValueOnce({
      payment_setup_status: 'SUCCEEDED',
    });
    // first call on mount returns active rental; second after checkin returns completed
    (getLibraryRentalHistory as jest.Mock)
      .mockResolvedValueOnce({ rental_history: [activeRental] })
      .mockResolvedValueOnce({ rental_history: [completedRental] });
    (checkinLibraryVehicle as jest.Mock).mockResolvedValueOnce({
      result: 'checked_in',
      vehicle_id: 'bike-123',
      dock_id: 'dock-1',
    });
    (Alerts.showPopup as jest.Mock).mockImplementation((popup: unknown) => {
      if (typeof popup !== 'function') return;
      const element = popup({ visible: true, onDismiss: jest.fn() });
      if (element?.props?.onManualSubmit) element.props.onManualSubmit('dock-1');
    });

    const tree = render(<LibraryTab />);

    // wait for active rental to load
    await waitFor(() => expect(getReturnButton(tree).props.disabled).toBe(false));

    await act(async () => {
      getReturnButton(tree).props.onPress();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(checkinLibraryVehicle).toHaveBeenCalledWith('dock-1');
      expect(getLibraryRentalHistory).toHaveBeenCalledTimes(2);
      expect(getReturnButton(tree).props.disabled).toBe(true);
      expect(getCheckoutButton(tree).props.disabled).toBe(false);
    });
  });
});
