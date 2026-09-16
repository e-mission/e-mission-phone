import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import '../js/i18nextInit';
import AccessoryRequestModal from '../js/library/components/AccessoryRequestModal';
import { AppContext, AppContextProps } from '../js/AppContext';
import { launchAccessoryRequestEmail } from '../js/library/emailHelper';
import DeploymentConfig from 'op-deployment-configs';
import { OnboardingRoute } from '../js/onboarding/onboardingHelper';

jest.mock('../js/library/emailHelper', () => ({
  ...jest.requireActual('../js/library/emailHelper'),
  launchAccessoryRequestEmail: jest.fn(),
}));

const initialMetrics = {
  frame: { x: 0, y: 0, width: 320, height: 640 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

describe('AccessoryRequestModal', () => {
  const mockAppConfig = {
    url_abbreviation: 'bike-lib',
    intro: {
      program_admin_email: 'librarian@example.com',
    },
  } as unknown as DeploymentConfig;

  const mockOnboardingState = {
    opcode: 'nrelop_bike-lib_user1',
    route: OnboardingRoute.DONE,
  } as AppContextProps['onboardingState'];

  const defaultProps = {
    visible: true,
    onDismiss: jest.fn(),
    vehicleId: 'bike-101',
    requestedAccessories: ['Panniers', 'Front basket'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function renderModal(props = {}) {
    return render(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <PaperProvider>
          <AppContext.Provider
            value={
              {
                appConfig: mockAppConfig,
                onboardingState: mockOnboardingState,
              } as AppContextProps
            }>
            <AccessoryRequestModal {...defaultProps} {...props} />
          </AppContext.Provider>
        </PaperProvider>
      </SafeAreaProvider>,
    );
  }

  it('renders modal with requested accessories and admin email', () => {
    const tree = renderModal();

    expect(tree.getByText('Request Accessories')).toBeTruthy();
    expect(tree.getByText('• Panniers')).toBeTruthy();
    expect(tree.getByText('• Front basket')).toBeTruthy();
    expect(tree.getByText('librarian@example.com')).toBeTruthy();
  });

  it('calls launchAccessoryRequestEmail and dismisses when compose email is pressed', () => {
    const onDismiss = jest.fn();
    const tree = renderModal({ onDismiss });

    fireEvent.press(tree.getByText('Compose email'));

    expect(launchAccessoryRequestEmail).toHaveBeenCalledWith({
      appConfig: mockAppConfig,
      opcode: 'nrelop_bike-lib_user1',
      vehicleId: 'bike-101',
      requestedAccessories: ['Panniers', 'Front basket'],
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('dismisses modal without launching email when no thanks is pressed', () => {
    const onDismiss = jest.fn();
    const tree = renderModal({ onDismiss });

    fireEvent.press(tree.getByText('No thanks'));

    expect(launchAccessoryRequestEmail).not.toHaveBeenCalled();
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
