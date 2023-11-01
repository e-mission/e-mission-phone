let notifSettings;
let onList : any = {};

export const mockPushNotification = () => {
  window['PushNotification'] = {
    init: (settings: Object) => {
      notifSettings = settings;
      return {
        on: (event: string, callback: Function) => {
          onList[event] = callback;
        }
      };
    },
  };
}

export const clearNotifMock = function () {
  notifSettings = {};
  onList = {};
}

export const getOnList = function () {
  return onList;
}

export const fakeEvent = function (eventName : string) {
  //fake the event by executing whatever we have stored for it
  onList[eventName]();
}