import { displayError } from '../plugin/logger';

type UrlComponents = {
  [key: string]: string;
};

export function onLaunchCustomURL(
  rawUrl: string,
  handler: (url: string, urlComponents: UrlComponents) => void,
) {
  try {
    const url = rawUrl.split('//')[1];
    const [route, paramString] = url.split('?');
    const paramsList = paramString.split('&');
    const urlComponents: UrlComponents = { route: route };
    for (let i = 0; i < paramsList.length; i++) {
      const [key, value] = paramsList[i].split('=');
      urlComponents[key] = value;
    }
    handler(url, urlComponents);
  } catch (err) {
    displayError(err, 'onLaunchCustomURL: not a valid URL');
  }
}
