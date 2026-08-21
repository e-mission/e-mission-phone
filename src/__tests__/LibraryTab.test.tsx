import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Button as PaperButton } from 'react-native-paper';
import LibraryTab from '../js/library/LibraryTab';
import { Alerts } from '../js/components/AlertArea';
import { displayErrorMsg } from '../js/plugin/logger';
import { checkoutLibraryVehicle, createLibrarySetupSession } from '../js/library/serverComm';

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

  it('re-enables actions after confirmCheckout server error', async () => {
    (checkoutLibraryVehicle as jest.Mock).mockRejectedValueOnce(new Error('mocked checkout failure'));
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
});
