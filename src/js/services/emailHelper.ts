import DeploymentConfig from 'op-deployment-configs';
import i18next from 'i18next';
import { getStudyNameFromToken } from '../config/opcode';
import { getDeviceSettings } from '../splash/storeDeviceSettings';
import { Alerts } from '../components/AlertArea';
import { addStatReading } from '../plugin/clientStats';

export function getProgramAdminEmail(appConfig?: DeploymentConfig | null): string | undefined {
  if (!appConfig?.intro) return undefined;
  return (
    appConfig.intro.program_admin_email ||
    // TODO: can remove this after config auto-update has been on prod for awhile
    appConfig.intro.program_admin_contact?.match(/([a-zA-Z0-9._+-]+@[a-zA-Z0-9._-]+)/gi)?.[0]
  );
}

export function getDeploymentId(appConfig?: DeploymentConfig | null, opcode?: string): string {
  return appConfig?.url_abbreviation || (opcode ? getStudyNameFromToken(opcode) : '');
}

export function openEmailClient({
  to,
  subject,
  body,
}: {
  to: string | string[];
  subject?: string;
  body?: string;
}) {
  const recipients = Array.isArray(to) ? to.join(',') : to;
  let mailtoLink = `mailto:${recipients}`;
  const params: string[] = [];
  if (subject) {
    params.push(`subject=${encodeURIComponent(subject)}`);
  }
  if (body) {
    params.push(`body=${encodeURIComponent(body)}`);
  }
  if (params.length > 0) {
    mailtoLink += `?${params.join('&')}`;
  }

  (window as any).cordova?.InAppBrowser?.open(mailtoLink, '_system');
}

export async function getDiagnosticInfo(deploymentId: string): Promise<string> {
  const deviceSettings = await getDeviceSettings();
  if (!deviceSettings) return '';
  return (
    `- App version: ${deviceSettings.client_app_version}\n` +
    `- Device model: ${deviceSettings.manufacturer} ${deviceSettings.model}\n` +
    `- Deployment: ${deploymentId}\n`
  );
}

export function launchAccessoryRequestEmail({
  appConfig,
  opcode,
  vehicleId,
  requestedAccessories,
  checkoutTime,
}: {
  appConfig: DeploymentConfig;
  opcode: string;
  vehicleId: string;
  requestedAccessories: string[];
  checkoutTime?: string;
}): boolean {
  const adminEmail = getProgramAdminEmail(appConfig);
  if (!adminEmail) {
    Alerts.addMessage({ text: 'No program admin email configured.' });
    return false;
  }

  const deploymentId = getDeploymentId(appConfig, opcode);
  const subject = i18next.t('library.checkout.accessory-email-subject', {
    vehicleId,
    deploymentId,
  });
  const accessoriesFormatted = requestedAccessories.map((acc) => `- ${acc}`).join('\n');
  const timeFormatted = checkoutTime || new Date().toLocaleString();
  const body = i18next.t('library.checkout.accessory-email-body', {
    vehicleId,
    opcode,
    accessories: accessoriesFormatted,
    checkoutTime: timeFormatted,
    deploymentId,
  });

  addStatReading('user_feedback', { method: 'email', purpose: 'accessory_request' });
  openEmailClient({ to: adminEmail, subject, body });
  return true;
}

export function launchLibrarianContactEmail({
  appConfig,
  opcode,
  vehicleId,
}: {
  appConfig: DeploymentConfig;
  opcode?: string;
  vehicleId?: string;
}): boolean {
  const adminEmail = getProgramAdminEmail(appConfig);
  if (!adminEmail) {
    Alerts.addMessage({ text: 'No program admin email configured.' });
    return false;
  }

  const deploymentId = getDeploymentId(appConfig, opcode);
  const subject = i18next.t('library.contact-librarian-subject', {
    deploymentId,
  });
  const rentalInfo = vehicleId ? `\n- Vehicle: ${vehicleId}` : '';
  const body = i18next.t('library.contact-librarian-body', {
    opcode: opcode || 'N/A',
    rentalInfo,
    deploymentId,
  });

  addStatReading('user_feedback', { method: 'email', purpose: 'librarian_contact' });
  openEmailClient({ to: adminEmail, subject, body });
  return true;
}
