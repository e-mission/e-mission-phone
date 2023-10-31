let notifSettings;
let onList = {};

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