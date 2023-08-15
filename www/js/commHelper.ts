import { logDebug } from "./plugin/logger";

/**
 * @param url URL endpoint for the request
 * @returns Promise of the fetched response (as text) or cached text from local storage
 */
export async function fetchUrlCached(url) {
  const stored = localStorage.getItem(url);
  if (stored) {
    logDebug(`fetchUrlCached: found cached data for url ${url}, returning`);
    return Promise.resolve(stored);
  }
  logDebug(`fetchUrlCached: found no cached data for url ${url}, fetching`);
  const response = await fetch(url);
  const text = await response.text();
  localStorage.setItem(url, text);
  logDebug(`fetchUrlCached: fetched data for url ${url}, returning`);
  return text;
}
