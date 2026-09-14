import DeploymentConfig from 'op-deployment-configs';
import '../js/i18nextInit';
import {
  getProgramAdminEmail,
  getDeploymentId,
  openEmailClient,
  getDiagnosticInfo,
  launchAccessoryRequestEmail,
  launchLibrarianContactEmail,
} from '../js/services/emailHelper';
import { Alerts } from '../js/components/AlertArea';
import { getDeviceSettings } from '../js/splash/storeDeviceSettings';

jest.mock('../js/components/AlertArea', () => ({
  __esModule: true,
  Alerts: {
    addMessage: jest.fn(),
    showPopup: jest.fn(),
  },
  default: () => null,
}));

jest.mock('../js/splash/storeDeviceSettings', () => ({
  getDeviceSettings: jest.fn(),
}));

jest.mock('../js/plugin/clientStats', () => ({
  addStatReading: jest.fn(),
}));

describe('emailHelper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (window as any).cordova = {
      InAppBrowser: {
        open: jest.fn(),
      },
    };
  });

  describe('getProgramAdminEmail', () => {
    it('returns program_admin_email when present', () => {
      const config = {
        intro: {
          program_admin_email: 'admin@example.com',
          program_admin_contact: 'Contact us at contact@example.com',
        },
      } as unknown as DeploymentConfig;
      expect(getProgramAdminEmail(config)).toBe('admin@example.com');
    });

    it('falls back to email parsed from program_admin_contact', () => {
      const config = {
        intro: {
          program_admin_email: '',
          program_admin_contact: 'Contact us at help@example.org or by phone',
        },
      } as unknown as DeploymentConfig;
      expect(getProgramAdminEmail(config)).toBe('help@example.org');
    });

    it('returns undefined if no email is found or config is missing', () => {
      expect(getProgramAdminEmail(null)).toBeUndefined();
      const config = {
        intro: {
          program_admin_email: '',
          program_admin_contact: 'No email here',
        },
      } as unknown as DeploymentConfig;
      expect(getProgramAdminEmail(config)).toBeUndefined();
    });
  });

  describe('getDeploymentId', () => {
    it('returns url_abbreviation when available', () => {
      const config = { url_abbreviation: 'test-dep' } as DeploymentConfig;
      expect(getDeploymentId(config, 'nrelop_study_token')).toBe('test-dep');
    });

    it('extracts study name from opcode token when url_abbreviation is missing', () => {
      const config = {} as DeploymentConfig;
      expect(getDeploymentId(config, 'nrelop_mystudy_token123')).toBe('mystudy');
    });

    it('returns empty string if neither is available', () => {
      expect(getDeploymentId(null)).toBe('');
    });
  });

  describe('openEmailClient', () => {
    it('opens cordova InAppBrowser with correctly encoded mailto URI', () => {
      openEmailClient({
        to: 'librarian@example.com',
        subject: 'Accessory Request',
        body: 'Hello & welcome',
      });

      expect((window as any).cordova.InAppBrowser.open).toHaveBeenCalledWith(
        'mailto:librarian@example.com?subject=Accessory%20Request&body=Hello%20%26%20welcome',
        '_system',
      );
    });

    it('handles multiple recipients as array', () => {
      openEmailClient({
        to: ['a@example.com', 'b@example.com'],
      });

      expect((window as any).cordova.InAppBrowser.open).toHaveBeenCalledWith(
        'mailto:a@example.com,b@example.com',
        '_system',
      );
    });
  });

  describe('getDiagnosticInfo', () => {
    it('formats device settings when available', async () => {
      (getDeviceSettings as jest.Mock).mockResolvedValueOnce({
        client_app_version: '1.2.3',
        manufacturer: 'Apple',
        model: 'iPhone 15',
      });

      const info = await getDiagnosticInfo('test-dep');
      expect(info).toContain('App version: 1.2.3');
      expect(info).toContain('Device model: Apple iPhone 15');
      expect(info).toContain('Deployment: test-dep');
    });

    it('returns empty string when device settings are not available', async () => {
      (getDeviceSettings as jest.Mock).mockResolvedValueOnce(null);
      const info = await getDiagnosticInfo('test-dep');
      expect(info).toBe('');
    });
  });

  describe('launchAccessoryRequestEmail', () => {
    it('launches email with prefilled opcode, accessories, and rental info', () => {
      const appConfig = {
        url_abbreviation: 'bike-lib',
        intro: {
          program_admin_email: 'librarian@bikelib.org',
        },
      } as unknown as DeploymentConfig;

      const result = launchAccessoryRequestEmail({
        appConfig,
        opcode: 'nrelop_bike-lib_user1',
        vehicleId: 'bike-42',
        requestedAccessories: ['Panniers', 'Front basket'],
        checkoutTime: '2026-09-11 10:00:00',
      });

      expect(result).toBe(true);
      expect((window as any).cordova.InAppBrowser.open).toHaveBeenCalledWith(
        expect.stringContaining('mailto:librarian@bikelib.org'),
        '_system',
      );
      const callArg = (window as any).cordova.InAppBrowser.open.mock.calls[0][0];
      const decodedUri = decodeURIComponent(callArg);
      expect(decodedUri).toContain('Vehicle bike-42');
      expect(decodedUri).toContain('user1');
      expect(decodedUri).toContain('Panniers');
      expect(decodedUri).toContain('Front basket');
      expect(decodedUri).toContain('bike-lib');
    });

    it('shows alert message and returns false when admin email is missing', () => {
      const appConfig = {
        url_abbreviation: 'bike-lib',
        intro: {},
      } as unknown as DeploymentConfig;

      const result = launchAccessoryRequestEmail({
        appConfig,
        opcode: 'nrelop_bike-lib_user1',
        vehicleId: 'bike-42',
        requestedAccessories: ['Panniers'],
      });

      expect(result).toBe(false);
      expect(Alerts.addMessage).toHaveBeenCalled();
    });
  });

  describe('launchLibrarianContactEmail', () => {
    it('launches email for general librarian inquiries with deployment and opcode info', () => {
      const appConfig = {
        url_abbreviation: 'bike-lib',
        intro: {
          program_admin_email: 'librarian@bikelib.org',
        },
      } as unknown as DeploymentConfig;

      const result = launchLibrarianContactEmail({
        appConfig,
        opcode: 'nrelop_bike-lib_user1',
        vehicleId: 'bike-42',
      });

      expect(result).toBe(true);
      expect((window as any).cordova.InAppBrowser.open).toHaveBeenCalledWith(
        expect.stringContaining('mailto:librarian@bikelib.org'),
        '_system',
      );
      const callArg = (window as any).cordova.InAppBrowser.open.mock.calls[0][0];
      const decodedUri = decodeURIComponent(callArg);
      expect(decodedUri).toContain('Vehicle Library Question');
      expect(decodedUri).toContain('Vehicle: bike-42');
      expect(decodedUri).toContain('user1');
    });

    it('shows alert when admin email is missing', () => {
      const appConfig = {
        url_abbreviation: 'bike-lib',
        intro: {},
      } as unknown as DeploymentConfig;

      const result = launchLibrarianContactEmail({
        appConfig,
        opcode: 'nrelop_bike-lib_user1',
      });

      expect(result).toBe(false);
      expect(Alerts.addMessage).toHaveBeenCalled();
    });
  });
});
