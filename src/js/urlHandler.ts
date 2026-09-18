import packageJson from '../../package.json';
import { Alerts } from './components/AlertArea';
import { logDebug } from './plugin/logger';

const URL_SCHEME = packageJson.cordova.plugins['cordova-plugin-customurlscheme'].URL_SCHEME;

export type UrlHandlerResult = boolean | Promise<boolean>;
export type UrlHandler = (url: string) => UrlHandlerResult;

const handlers = new Set<UrlHandler>();

export function registerUrlHandler(handler: UrlHandler): () => void {
  handlers.add(handler);
  return () => handlers.delete(handler);
}

export async function handleUrl(url: string): Promise<boolean> {
  if (!url?.startsWith(URL_SCHEME + '://')) {
    logDebug(`handleOpenURL: Ignoring ${url} - does not start with ${URL_SCHEME}://`);
    return false;
  }
  const results = await Promise.all(Array.from(handlers, (handler) => handler(url)));
  if (results.some(Boolean)) {
    return true;
  }
  Alerts.addMessage({ text: `No handler could handle ${url}` });
  return false;
}
