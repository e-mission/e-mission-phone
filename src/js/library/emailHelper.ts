import DeploymentConfig from 'op-deployment-configs';
import i18next from 'i18next';
import { Alerts } from '../components/AlertArea';
import { addStatReading } from '../plugin/clientStats';
import { getDeploymentId, getProgramAdminEmail, openEmailClient } from '../services/emailHelper';

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
