import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Button as PaperButton } from 'react-native-paper';
import LibraryTab from '../js/library/LibraryTab';
import { displayErrorMsg } from '../js/plugin/logger';
import { createStripeCheckoutSession } from '../js/services/stripeCheckout';

jest.mock('../js/components/NavBar', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
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

jest.mock('../js/services/stripeCheckout', () => ({
  __esModule: true,
  finalizeStripeCheckoutSession: jest.fn(),
  getLibrarySetupStatus: jest.fn(),
  captureStripeHoldPaymentIntent: jest.fn(),
  createStripeCheckoutSession: jest.fn(),
  createStripeHoldPaymentIntent: jest.fn(),
  createStripePaymentIntent: jest.fn(),
  createStripeRefund: jest.fn(),
  isDirectStripeModeEnabled: jest.fn(() => false),
  retrieveStripePaymentIntent: jest.fn(),
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

  it('rejects setup checkout flow if displayErrorMsg throws', async () => {
    let rejectRequest: (reason?: unknown) => void = () => {};
    (createStripeCheckoutSession as jest.Mock)
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
    expect(createStripeCheckoutSession).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(getSetupCheckoutButton(tree).props.disabled).toBe(true);
    });
    const inFlightCommitCount = commitCount;
    expect(inFlightCommitCount).toBeGreaterThan(initialCommitCount);

    // While request is in flight, the button should be disabled and ignore additional presses.
    fireEvent.press(tree.getByText('setup checkout'));
    expect(createStripeCheckoutSession).toHaveBeenCalledTimes(1);

    await act(async () => {
      rejectRequest(new Error('mocked 500'));
      await Promise.resolve();
    });

    await rejectionAssertion;
    expect(displayErrorMsg).toHaveBeenCalledTimes(1);
  });
});
