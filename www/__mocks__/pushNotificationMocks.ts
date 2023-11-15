let notifSettings;
let onList: any = {};
let called = null;

export const mockPushNotification = () => {
  window['PushNotification'] = {
    init: (settings: Object) => {
      notifSettings = settings;
      return {
        on: (event: string, callback: Function) => {
          onList[event] = callback;
        },
        finish: (content: any, errorFcn: Function, notID: any) => {
          called = notID;
        },
      };
    },
  };
};

export const clearNotifMock = function () {
  notifSettings = {};
  onList = {};
  called = null;
};

export const getOnList = function () {
  return onList;
};

export const getCalled = function () {
  return called;
};
