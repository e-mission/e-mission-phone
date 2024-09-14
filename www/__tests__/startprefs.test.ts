import {
  markConsented,
  isConsented,
  readConsentState,
  getConsentDocument,
} from '../js/splash/startprefs';

global.fetch = (url: string) =>
  new Promise((rs, rj) => {
    setTimeout(() =>
      rs({
        json: () =>
          new Promise((rs, rj) => {
            let myJSON = {
              emSensorDataCollectionProtocol: {
                protocol_id: '2014-04-6267',
                approval_date: '2016-07-14',
              },
            };
            setTimeout(() => rs(myJSON), 100);
          }),
      }),
    );
  }) as any;

it('checks state of consent before and after marking consent', async () => {
  expect(await readConsentState().then(isConsented)).toBeFalsy();
  let marked = await markConsented();
  expect(await readConsentState().then(isConsented)).toBeTruthy();
  expect(await getConsentDocument()).toEqual({
    approval_date: '2016-07-14',
    protocol_id: '2014-04-6267',
  });
});
