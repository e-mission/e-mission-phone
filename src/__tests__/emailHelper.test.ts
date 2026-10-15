import DeploymentConfig from 'op-deployment-configs';
import '../js/i18nextInit';
import {
  getProgramAdminEmail,
  getDeploymentId,
  openEmailClient,
  getDiagnosticInfo,
} from '../js/services/emailHelper';
import {
  launchAccessoryRequestEmail,
  launchLibrarianContactEmail,
} from '../js/library/emailHelper';
import { Alerts } from '../js/components/AlertArea';
import { getDeviceSettings } from '../js/splash/storeDeviceSettings';
import { emailErrorReport } from '../js/services/shareLocalDBFile';
import { getConfig } from '../js/config/dynamicConfig';
import { Alerts as GlobalAlerts } from '../js/components/alerts';

jest.mock('../js/config/dynamicConfig', () => ({
  getConfig: jest.fn(),
}));

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

    it('omits diagnostics without opening a popup when device settings reject', async () => {
      (getDeviceSettings as jest.Mock).mockRejectedValueOnce(new Error('Device unavailable'));
      const showPopup = jest.spyOn(GlobalAlerts, 'showPopup');
      try {
        await expect(getDiagnosticInfo('test-dep')).resolves.toBe('');
        expect(showPopup).not.toHaveBeenCalled();
      } finally {
        showPopup.mockRestore();
      }
    });
  });

  describe('emailErrorReport', () => {
    const fileUrl = 'file:///cache/loggerDB.txt';
    const stackFileUrl = 'file:///cache/stacktrace.txt';
    let removeFile: jest.Mock;
    let copyFile: jest.Mock;
    let writeFile: jest.Mock;
    let fileWriter: {
      write: jest.Mock;
      onwriteend?: () => void;
      onerror?: () => void;
      error?: Error;
    };
    let shareViaEmail: jest.Mock;
    let previousPlugins: unknown;
    let previousResolveFile: unknown;

    beforeEach(() => {
      (getConfig as jest.Mock).mockReset().mockResolvedValue(null);
      previousPlugins = window['plugins'];
      previousResolveFile = window['resolveLocalFileSystemURL'];
      removeFile = jest.fn((success) => success());
      copyFile = jest.fn((directory, name, success) => success({ nativeURL: fileUrl }));
      writeFile = jest.fn(() => fileWriter.onwriteend?.());
      fileWriter = { write: writeFile };
      shareViaEmail = jest.fn((body, subject, to, cc, bcc, files, success) => success());
      window['plugins'] = {
        socialsharing: {
          shareViaEmail,
          canShareViaEmail: jest.fn((success) => success()),
        },
      };
      window['cordova'].platformId = 'android';
      window['cordova'].file = {
        dataDirectory: 'file:///data/files/',
        cacheDirectory: 'file:///cache/',
      };
      window['resolveLocalFileSystemURL'] = jest.fn((path, success) =>
        success({
          filesystem: {
            root: {
              getFile: jest.fn((name, options, found) =>
                found({
                  nativeURL: name === 'stacktrace.txt' ? stackFileUrl : fileUrl,
                  copyTo: copyFile,
                  remove: removeFile,
                  createWriter: jest.fn((success) => success(fileWriter)),
                }),
              ),
            },
          },
        }),
      );
      (getDeviceSettings as jest.Mock).mockResolvedValue({
        client_app_version: '1.2.3',
        manufacturer: 'Apple',
        model: 'iPhone 15',
      });
    });

    afterEach(() => {
      window['plugins'] = previousPlugins;
      window['resolveLocalFileSystemURL'] = previousResolveFile;
    });

    it.each(['android', 'ios'])(
      'opens an editable error report with diagnostics and logs on %s',
      async (platform) => {
        window['cordova'].platformId = platform;
        await emailErrorReport('Rendering Error', 'render boom\nerror stack');

        expect(copyFile).toHaveBeenCalledWith(
          expect.anything(),
          'loggerDB.txt',
          expect.any(Function),
          expect.any(Function),
        );
        expect(shareViaEmail).toHaveBeenCalledWith(
          expect.stringContaining('Diagnostic info:'),
          'OpenPATH Error Report: Rendering Error',
          ['openpath@nlr.gov'],
          null,
          null,
          [fileUrl, stackFileUrl],
          expect.any(Function),
          expect.any(Function),
        );
        const body = shareViaEmail.mock.calls[0][0];
        expect(body).toContain('OpenPATH team,<br><br>');
        expect(body).toContain('Describe your feedback or issue here');
        expect(body).toContain('App version: 1.2.3');
        expect(body).toContain('Apple iPhone 15');
        expect(body).not.toContain('Rendering Error');
        expect(body).not.toContain('render boom');
        expect(body).not.toContain('error stack');
        expect(writeFile).toHaveBeenCalledWith(expect.any(Blob));
        expect(removeFile).toHaveBeenCalledTimes(4);
      },
    );

    it('still opens the report with both attachments when device diagnostics fail', async () => {
      (getDeviceSettings as jest.Mock).mockRejectedValueOnce(new Error('Device unavailable'));
      const showPopup = jest.spyOn(GlobalAlerts, 'showPopup');
      try {
        await emailErrorReport('Rendering Error', 'original error stack');
        expect(shareViaEmail).toHaveBeenCalledWith(
          expect.stringContaining('Describe your feedback or issue here'),
          'OpenPATH Error Report: Rendering Error',
          ['openpath@nlr.gov'],
          null,
          null,
          [fileUrl, stackFileUrl],
          expect.any(Function),
          expect.any(Function),
        );
        expect(showPopup).not.toHaveBeenCalled();
      } finally {
        showPopup.mockRestore();
      }
    });

    it('includes the saved deployment abbreviation in the diagnostics', async () => {
      (getConfig as jest.Mock).mockResolvedValueOnce({ url_abbreviation: 'bike-lib' });
      await emailErrorReport('Error', 'boom');
      expect(shareViaEmail.mock.calls[0][0]).toContain('Deployment: bike-lib<br>');
    });

    it.each([null, {}])('leaves deployment blank when the saved config is %p', async (config) => {
      (getConfig as jest.Mock).mockResolvedValueOnce(config);
      await emailErrorReport('Error', 'boom');
      expect(shareViaEmail.mock.calls[0][0]).toContain('Deployment: <br>');
    });

    it('still opens the email when reading the saved config fails', async () => {
      (getConfig as jest.Mock).mockRejectedValueOnce(new Error('Config unavailable'));
      await emailErrorReport('Error', 'boom');
      expect(shareViaEmail.mock.calls[0][0]).toContain('Deployment: <br>');
      expect(shareViaEmail).toHaveBeenCalledTimes(1);
    });

    it('still opens the email when the config reader throws synchronously', async () => {
      (getConfig as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Invalid cached config');
      });
      await emailErrorReport('Error', 'boom');
      expect(shareViaEmail.mock.calls[0][0]).toContain('Deployment: <br>');
    });

    it('escapes markup in diagnostic values for the email body', async () => {
      (getConfig as jest.Mock).mockResolvedValueOnce({
        url_abbreviation: '<deployment> & details',
      });
      await emailErrorReport('Error', 'render boom');
      expect(shareViaEmail.mock.calls[0][0]).toContain(
        'Deployment: &lt;deployment&gt; &amp; details<br>',
      );
    });

    it('preserves blank lines and mixed newline formats as explicit HTML breaks', async () => {
      (getDeviceSettings as jest.Mock).mockResolvedValueOnce({
        client_app_version: '1.2.3',
        manufacturer: 'Maker',
        model: 'first\r\n\r\nsecond\rthird\nlast',
      });
      await emailErrorReport('Error', 'boom');
      const body = shareViaEmail.mock.calls[0][0];
      expect(body).toContain('first<br><br>second<br>third<br>last');
      expect(body).not.toMatch(/[\r\n]/);
    });

    it('writes the full error and stack as plain text without changing newlines or markup', async () => {
      const details = 'render boom\r\n\r\nat <anonymous> & <View>\nnext frame';
      await emailErrorReport('Rendering Error', details);
      const attachment = writeFile.mock.calls[0][0] as Blob;
      expect(attachment.type).toBe('text/plain;charset=utf-8');
      const contents = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsText(attachment);
      });
      expect(contents).toBe(`Rendering Error\n${details}`);
    });

    it('cleans up both files and does not open the composer if writing the stack fails', async () => {
      writeFile.mockImplementationOnce(() => {
        fileWriter.error = new Error('Write failed');
        fileWriter.onerror?.();
      });
      await expect(emailErrorReport('Error', 'boom')).rejects.toThrow('Write failed');
      expect(shareViaEmail).not.toHaveBeenCalled();
      expect(removeFile).toHaveBeenCalledTimes(4);
    });

    it('rejects when email sharing is unavailable', async () => {
      window['plugins'] = {};
      await expect(emailErrorReport('Error', 'boom')).rejects.toThrow('Email is not available');
      expect(copyFile).not.toHaveBeenCalled();
    });

    it('does not export logs when no email client is configured', async () => {
      window['plugins'].socialsharing.canShareViaEmail.mockImplementation((success, failure) =>
        failure('not available'),
      );
      await expect(emailErrorReport('Error', 'boom')).rejects.toThrow('Email is not available');
      expect(copyFile).not.toHaveBeenCalled();
      expect(shareViaEmail).not.toHaveBeenCalled();
    });

    it('keeps the attachment until the composer callback completes', async () => {
      let finish!: () => void;
      let started!: () => void;
      const composerStarted = new Promise<void>((resolve) => {
        started = resolve;
      });
      shareViaEmail.mockImplementation((body, subject, to, cc, bcc, files, success) => {
        finish = success;
        started();
      });
      const report = emailErrorReport('Error', 'boom');
      await composerStarted;
      expect(removeFile).toHaveBeenCalledTimes(2);
      finish();
      await report;
      expect(removeFile).toHaveBeenCalledTimes(4);
    });

    it('cleans up the attachment and rejects when the email composer fails', async () => {
      shareViaEmail.mockImplementation((body, subject, to, cc, bcc, files, success, failure) =>
        failure(new Error('No email app')),
      );
      await expect(emailErrorReport('Error', 'boom')).rejects.toThrow('No email app');
      expect(removeFile).toHaveBeenCalledTimes(4);
    });

    it('rejects file export failures without opening the composer', async () => {
      copyFile.mockImplementation((directory, name, success, failure) =>
        failure(new Error('Copy failed')),
      );
      await expect(emailErrorReport('Error', 'boom')).rejects.toThrow('Copy failed');
      expect(shareViaEmail).not.toHaveBeenCalled();
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
