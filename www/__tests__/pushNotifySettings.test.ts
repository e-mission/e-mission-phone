import { EVENT_NAMES, publish } from '../js/customEventHandler';
import { initPushNotify } from '../js/splash/pushNotifySettings';
import { mockCordova, mockBEMUserCache } from '../__mocks__/cordovaMocks';
import { mockLogger } from '../__mocks__/globalMocks';
import { mockPushNotification } from '../__mocks__/pushNotificationMocks';

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

it('initializes the push notifications', () => {
  initPushNotify();

  publish(EVENT_NAMES.CONSENTED_EVENT, "test data");
  publish(EVENT_NAMES.INTRO_DONE_EVENT, "test data");
  publish(EVENT_NAMES.CLOUD_NOTIFICATION_EVENT, {additionalData: {'content-avaliable': 1}});
})