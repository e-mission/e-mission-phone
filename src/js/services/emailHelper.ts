import DeploymentConfig from 'op-deployment-configs';
import { getStudyNameFromToken } from '../config/opcode';
import { getDeviceSettings } from '../splash/storeDeviceSettings';

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
