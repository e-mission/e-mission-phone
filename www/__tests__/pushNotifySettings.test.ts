import { DateTime } from 'luxon';
import { EVENTS, publish } from '../js/customEventHandler';
import { INTRO_DONE_KEY, readIntroDone } from '../js/onboarding/onboardingHelper';
import { storageSet } from '../js/plugin/storage';
import { initPushNotify } from '../js/splash/pushNotifySettings';
import { clearNotifMock, getOnList, getCalled } from '../__mocks__/pushNotificationMocks';

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

afterEach(() => {
  clearNotifMock();
});

it('intro done does nothing if not registered', () => {
  expect(getOnList()).toStrictEqual({});
  publish(EVENTS.INTRO_DONE_EVENT, 'test data');
  expect(getOnList()).toStrictEqual({});
});

it('intro done initializes the push notifications', () => {
  expect(getOnList()).toStrictEqual({});

  initPushNotify();
  publish(EVENTS.INTRO_DONE_EVENT, 'test data');
  expect(getOnList()).toStrictEqual(
    expect.objectContaining({
      notification: expect.any(Function),
      error: expect.any(Function),
      registration: expect.any(Function),
    }),
  );
});

it('cloud event does nothing if not registered', () => {
  expect(window['cordova'].platformId).toEqual('ios');
  publish(EVENTS.CLOUD_NOTIFICATION_EVENT, {
    additionalData: { 'content-available': 1, payload: { notId: 3 } },
  });
  expect(getCalled()).toBeNull();
});

it('cloud event handles notification if registered', async () => {
  expect(window['cordova'].platformId).toEqual('ios');
  initPushNotify();
  publish(EVENTS.INTRO_DONE_EVENT, 'intro done');
  publish(EVENTS.CLOUD_NOTIFICATION_EVENT, {
    additionalData: { 'content-available': 1, payload: { notId: 3 } },
  });
  await new Promise((r) => setTimeout(r, 1000));
  expect(getCalled()).toEqual(3);
});

it('consent event does nothing if not registered', () => {
  expect(getOnList()).toStrictEqual({});
  publish(EVENTS.CONSENTED_EVENT, 'test data');
  expect(getOnList()).toStrictEqual({});
});

it('consent event registers if intro done', async () => {
  //make sure the mock is clear
  expect(getOnList()).toStrictEqual({});

  //initialize the pushNotify, to subscribe to events
  initPushNotify();

  //mark the intro as done
  const currDateTime = DateTime.now().toISO();
  let marked = await storageSet(INTRO_DONE_KEY, currDateTime);
  let introDone = await readIntroDone();
  expect(introDone).toBeTruthy();

  //publish consent event and check results
  publish(EVENTS.CONSENTED_EVENT, 'test data');
  //have to wait a beat since event response is async
  await new Promise((r) => setTimeout(r, 1000));
  expect(getOnList()).toStrictEqual(
    expect.objectContaining({
      notification: expect.any(Function),
      error: expect.any(Function),
      registration: expect.any(Function),
    }),
  );
});

it('consent event does not register if intro not done', () => {
  expect(getOnList()).toStrictEqual({});
  initPushNotify();
  publish(EVENTS.CONSENTED_EVENT, 'test data');
  expect(getOnList()).toStrictEqual({}); //nothing, intro not done
});
