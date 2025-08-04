let notifSettings;
let listenerList: any = {};
let finishedNotId = null;

export const mockPushNotification = () => {
  window['PushNotification'] = {
    init: (settings: Object) => {
      notifSettings = settings;
      const push = {
        on: (event: string, callback: Function) => {
          listenerList[event] = callback;
        },
        finish: (content: any, errorFcn: Function, notID: any) => {
          finishedNotId = notID;
        },
      };
      setTimeout(() => {
        mockPushEvent('registration', {
          registrationId: 'foo123',
          registrationType: 'barABC',
        });
      }, 100);
      return push;
    },
  };
};

export const getNotifSettings = () => notifSettings;
export const getListenerList = () => listenerList;
export const getFinishedNotId = () => finishedNotId;

export const mockPushEvent = (event: string, data: any) => listenerList[event]?.(data);

export function clearNotifMock() {
  notifSettings = {};
  listenerList = {};
  finishedNotId = null;
}
