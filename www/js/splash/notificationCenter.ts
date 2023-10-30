type callbacks = { [eventName: string]: { [id: string]: Function } };

let notificationList: callbacks = {};

export const subscribe = function (eventName: string, id: string, action: Function) {
  notificationList[eventName][id] = action;
}

export const unsubscribe = function (eventName: string, id: string) {
  delete notificationList[eventName][id];
}

export const publish = function (eventName: string, data: any = null) {
  //if the event exists in the list
  if (notificationList[eventName]) {
    notificationList[eventName].keys().forEach((id) => {
      notificationList[eventName][id](data);
    })
  }
}