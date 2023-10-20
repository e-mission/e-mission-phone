import { markConsented, isConsented, readConsentState, getConsentDocument } from '../js/splash/startprefs';

import { mockBEMUserCache, mockBEMDataCollection } from "../__mocks__/cordovaMocks";
import { mockLogger } from "../__mocks__/globalMocks";

mockBEMUserCache();
mockBEMDataCollection();
mockLogger();

global.fetch = (url: string) => new Promise((rs, rj) => {
  setTimeout(() => rs({
    json: () => new Promise((rs, rj) => {
      let jsonString = '{ "emSensorDataCollectionProtocol": { "protocol_id": "2014-04-6267", "approval_date": "2016-07-14" } }';
      setTimeout(() => rs(jsonString), 100);
    })
  }));
}) as any;

it('marks consent in local and native storage', async () => {
  let marked = markConsented();
  console.log("marked is", marked);
});

it('checks local vars for consent, returns boolean', async () => {
  expect(isConsented()).toBeFalsy();
});

it('reads the required and current consent', async () => {
  //gets the info from the json file
  //then sets the local req_consent variable
  //then storageGets the data_collection_consented_protocol
  //then uses that to store in local curr_consent var
  //and launches checkNativeConsent
  // let consentFile = await readConsentState();
  expect(await readConsentState()).toBeUndefined();
});

it('gets the consent document from storage', async () => {
//  let consentDoc = await getConsentDocument();
 expect(await getConsentDocument()).toBeNull();
});