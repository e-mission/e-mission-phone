import { handleUrl, registerUrlHandler } from '../js/urlHandler';
import packageJson from '../../package.json';

const URL_SCHEME = packageJson.cordova.plugins['cordova-plugin-customurlscheme'].URL_SCHEME;

it('runs every URL handler and returns true if any handler handles it', async () => {
  const calls: string[] = [];
  const unregisterFirst = registerUrlHandler(async () => {
    calls.push('first');
    return false;
  });
  const unregisterSecond = registerUrlHandler(async () => {
    calls.push('second');
    return true;
  });
  const unregisterThird = registerUrlHandler(async () => {
    calls.push('third');
    return false;
  });

  await expect(handleUrl(`${URL_SCHEME}://test`)).resolves.toBe(true);
  expect(calls).toEqual(['first', 'second', 'third']);

  unregisterFirst();
  unregisterSecond();
  unregisterThird();
});

it('supports unregistering URL handlers', async () => {
  const handler = jest.fn(() => true);
  const unregister = registerUrlHandler(handler);
  unregister();

  await expect(handleUrl(`${URL_SCHEME}://test`)).resolves.toBe(false);
  expect(handler).not.toHaveBeenCalled();
});
