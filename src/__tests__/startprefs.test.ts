import { markConsented, readConsentState, getConsentDocument } from '../js/splash/startprefs';

it('checks state of consent before and after marking consent', async () => {
  expect(await readConsentState()).toBeFalsy();
  await markConsented();
  expect(await readConsentState()).toBeTruthy();
  expect(await getConsentDocument()).toEqual({
    approval_date: '2016-07-14',
  });
});
