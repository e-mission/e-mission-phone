import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import '../js/i18nextInit';
import ActiveRental from '../js/library/components/ActiveRental';
import { AppContext, AppContextProps } from '../js/AppContext';
import { Alerts } from '../js/components/AlertArea';
import { storageGet, storageSet } from '../js/plugin/storage';
import AccessoryRequestModal from '../js/library/components/AccessoryRequestModal';
import DeploymentConfig from 'op-deployment-configs';
import { OnboardingRoute } from '../js/onboarding/onboardingHelper';

jest.mock('../js/components/AlertArea', () => ({
  __esModule: true,
  Alerts: {
    addMessage: jest.fn(),
    showPopup: jest.fn(),
  },
  default: () => null,
}));

jest.mock('../js/plugin/storage', () => ({
  storageGet: jest.fn(),
  storageSet: jest.fn(),
}));

const initialMetrics = {
  frame: { x: 0, y: 0, width: 320, height: 640 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

describe('ActiveRental', () => {
  const mockAppConfig = {
    url_abbreviation: 'bike-lib',
    intro: {
      program_admin_email: 'librarian@example.com',
      translated_text: {
        en: { deployment_name: 'Test City Bike Library' },
      },
    },
  } as unknown as DeploymentConfig;

  const mockOnboardingState = {
    opcode: 'nrelop_bike-lib_user1',
    route: OnboardingRoute.DONE,
  } as AppContextProps['onboardingState'];

  const defaultRental = {
    vehicle_id: 'bike-101',
    vehicle_name: 'City Cruiser',
    start_ts: 1700000000,
    end_ts: null,
    rental_status: 'active' as const,
  };

  const defaultProps = {
    vehicleId: 'bike-101',
    activeRental: defaultRental,
    durationDisplay: '2 hours',
    feeDisplay: '$5.00',
    onReturnVehicle: jest.fn(),
    refreshing: false,
    onRefresh: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (storageGet as jest.Mock).mockResolvedValue(null);
    (storageSet as jest.Mock).mockResolvedValue(undefined);
  });

  function renderComponent(props = {}) {
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
            <ActiveRental {...defaultProps} {...props} />
          </AppContext.Provider>
        </PaperProvider>
      </SafeAreaProvider>,
    );
  }

  it('renders active rental basic info', async () => {
    const tree = renderComponent();

    expect(tree.getByText('City Cruiser')).toBeTruthy();
    expect(tree.getByText('2 hours')).toBeTruthy();
    expect(tree.getByText('Current fee: $5.00')).toBeTruthy();
    expect(tree.getByText('Test City Bike Library')).toBeTruthy();
  });

  it('shows requested accessories and email button when accessories were requested but not emailed', async () => {
    (storageGet as jest.Mock).mockResolvedValueOnce({
      vehicleId: 'bike-101',
      requestedAccessories: ['Panniers', 'Front basket'],
      hasEmailed: false,
    });

    const tree = renderComponent();

    await waitFor(() => {
      expect(tree.getByText('Requested Accessories')).toBeTruthy();
      expect(tree.getByText(/You requested: Panniers, Front basket/)).toBeTruthy();
      expect(tree.getByText('Email for accessories')).toBeTruthy();
    });

    fireEvent.press(tree.getByText('Email for accessories'));

    expect(Alerts.showPopup).toHaveBeenCalledWith(
      AccessoryRequestModal,
      expect.objectContaining({
        vehicleId: 'bike-101',
        requestedAccessories: ['Panniers', 'Front basket'],
      }),
    );
  });

  it('hides the accessory prompt when the email was already sent', async () => {
    (storageGet as jest.Mock).mockResolvedValueOnce({
      vehicleId: 'bike-101',
      requestedAccessories: ['Panniers'],
      hasEmailed: true,
    });

    const tree = renderComponent();

    await waitFor(() => {
      expect(storageGet).toHaveBeenCalledWith('library_rental_accessories');
      expect(tree.queryByText('Requested Accessories')).toBeNull();
      expect(tree.queryByText('Email for accessories')).toBeNull();
    });
  });

  it('calls onReturnVehicle when scan dock to return is pressed', () => {
    const onReturnVehicle = jest.fn();
    const tree = renderComponent({ onReturnVehicle });

    fireEvent.press(tree.getByText('Scan Dock to Return'));

    expect(onReturnVehicle).toHaveBeenCalledTimes(1);
  });
});
