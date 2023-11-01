import { EVENT_NAMES, publish } from '../js/customEventHandler';
import { markIntroDone } from '../js/onboarding/onboardingHelper';
import { initPushNotify } from '../js/splash/pushNotifySettings';
import { mockCordova, mockBEMUserCache } from '../__mocks__/cordovaMocks';
import { mockLogger } from '../__mocks__/globalMocks';
import { clearNotifMock, getOnList, mockPushNotification } from '../__mocks__/pushNotificationMocks';

mockCordova();
mockLogger();
mockPushNotification();
mockBEMUserCache();

global.fetch = (url: string) => new Promise((rs, rj) => {
  setTimeout(() => rs({
    json: () => new Promise((rs, rj) => {
      let myJSON = { "emSensorDataCollectionProtocol": { "protocol_id": "2014-04-6267", "approval_date": "2016-07-14" } };
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
  publish(EVENT_NAMES.CLOUD_NOTIFICATION_EVENT, {additionalData: {'content-avaliable': 1}});
  //how to test did nothing?
})

it('cloud event handles notification if registered', () => {
  initPushNotify();
  publish(EVENT_NAMES.CLOUD_NOTIFICATION_EVENT, {additionalData: {'content-avaliable': 1}});
  //how to test did something?
})

it('consent event does nothing if not registered', () => {
  clearNotifMock();
  expect(getOnList()).toStrictEqual({});
  publish(EVENT_NAMES.CONSENTED_EVENT, "test data");
  expect(getOnList()).toStrictEqual({});
})

// it('consent event registers if intro done', () => {
//   clearNotifMock();
//   expect(getOnList()).toStrictEqual({});
//   initPushNotify();
//   markIntroDone();
//   // setTimeout(() => {}, 100);
//   publish(EVENT_NAMES.CONSENTED_EVENT, "test data");
//   setTimeout(() => {}, 200);
//   expect(getOnList()).toStrictEqual(expect.objectContaining({
//     notification: expect.any(Function),
//     error: expect.any(Function),
//     registration: expect.any(Function)
//   }));
// })

it('consent event does not register if intro not done', () => {
  clearNotifMock();
  expect(getOnList()).toStrictEqual({});
  initPushNotify();
  publish(EVENT_NAMES.CONSENTED_EVENT, "test data");
  expect(getOnList()).toStrictEqual({}); //nothing, intro not done
})