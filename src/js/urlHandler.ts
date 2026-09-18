import { OnboardingJoinMethod } from './AppContext';

export type UrlHandlerResult = boolean | Promise<boolean>;
export type UrlHandler = (url: string, joinMethod: OnboardingJoinMethod) => UrlHandlerResult;

const handlers = new Set<UrlHandler>();

export function registerUrlHandler(handler: UrlHandler): () => void {
  handlers.add(handler);
  return () => handlers.delete(handler);
}

export async function handleUrl(url: string, joinMethod: OnboardingJoinMethod): Promise<boolean> {
  const results = await Promise.all(Array.from(handlers, (handler) => handler(url, joinMethod)));
  return results.some(Boolean);
}
