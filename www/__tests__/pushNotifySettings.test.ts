import { DateTime } from 'luxon';
import { EVENT_NAMES, publish } from '../js/customEventHandler';
import { INTRO_DONE_KEY, readIntroDone } from '../js/onboarding/onboardingHelper';
import { storageSet } from '../js/plugin/storage';
import { initPushNotify } from '../js/splash/pushNotifySettings';
import { mockCordova, mockBEMUserCache, mockBEMDataCollection } from '../__mocks__/cordovaMocks';
import { mockLogger } from '../__mocks__/globalMocks';
import { clearNotifMock, getOnList, mockPushNotification, getCalled } from '../__mocks__/pushNotificationMocks';

mockCordova();
mockLogger();
mockPushNotification();
mockBEMUserCache();
mockBEMDataCollection();

global.fetch = (url: string) => new Promise((rs, rj) => {
  setTimeout(() => rs({
    json: () => new Promise((rs, rj) => {
      let myJSON = { "emSensorDataCollectionProtocol": { "protocol_id": "2014-04-6267", "approval_date": "2016-07-14" }, };
      setTimeout(() => rs(myJSON), 100);
    })
  }));
}) as any;

it('intro done does nothing if not registered', () => {
  clearNotifMock();
  expect(getOnList()).toStrictEqual({});
  publish(EVENT_NAMES.INTRO_DONE_EVENT, "test data");
  expect(getOnList()).toStrictEqual({});
})

it('intro done initializes the push notifications', () => {
  clearNotifMock();
  expect(getOnList()).toStrictEqual({});

  initPushNotify();
  publish(EVENT_NAMES.INTRO_DONE_EVENT, "test data");
  // setTimeout(() => {}, 100);
  expect(getOnList()).toStrictEqual(expect.objectContaining({
    notification: expect.any(Function),
    error: expect.any(Function),
    registration: expect.any(Function)
  }));
})

it('cloud event does nothing if not registered', () => {
  expect(window['cordova'].platformId).toEqual('ios');
  publish(EVENT_NAMES.CLOUD_NOTIFICATION_EVENT, {additionalData: {'content-available': 1, 'payload' : {'notID' : 3}}});
  expect(getCalled()).toBeNull();
})

it('cloud event handles notification if registered', () => {
  clearNotifMock();
  expect(window['cordova'].platformId).toEqual('ios');
  initPushNotify();
  publish(EVENT_NAMES.INTRO_DONE_EVENT, "intro done");
  publish(EVENT_NAMES.CLOUD_NOTIFICATION_EVENT, {additionalData: {'content-available': 1, 'payload' : {'notID' : 3}}});
  setTimeout(() => {
    expect(getCalled()).toEqual(3);
  }, 300)
})

it('consent event does nothing if not registered', () => {
  clearNotifMock();
  expect(getOnList()).toStrictEqual({});
  publish(EVENT_NAMES.CONSENTED_EVENT, "test data");
  expect(getOnList()).toStrictEqual({});
})

it('consent event registers if intro done', async () => {
  //make sure the mock is clear
  clearNotifMock();
  expect(getOnList()).toStrictEqual({});

  //initialize the pushNotify, to subscribe to events
  initPushNotify();
  console.log("initialized");

  //mark the intro as done
  const currDateTime = DateTime.now().toISO();
  let marked = await storageSet(INTRO_DONE_KEY, currDateTime);
  console.log("marked intro");
  let introDone = await readIntroDone();
  expect(introDone).toBeTruthy();

  //publish consent event and check results
  publish(EVENT_NAMES.CONSENTED_EVENT, "test data");
  //have to wait a beat since event response is async
  setTimeout(() => {
    expect(getOnList()).toStrictEqual(expect.objectContaining({
      notification: expect.any(Function),
      error: expect.any(Function),
      registration: expect.any(Function)
    }));
  }, 100);
})

it('consent event does not register if intro not done', () => {
  clearNotifMock();
  expect(getOnList()).toStrictEqual({});
  initPushNotify();
  publish(EVENT_NAMES.CONSENTED_EVENT, "test data");
  expect(getOnList()).toStrictEqual({}); //nothing, intro not done
})