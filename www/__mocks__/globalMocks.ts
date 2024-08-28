export const mockLogger = () => {
  window['Logger'] = {
    log: console.log,
    getMaxIndex: () => 0, // mock
    getMessagesFromIndex: () => [], // mock
  };
  window.alert ||= (msg) => {
    console.log(msg);
  };
  console.error ||= (msg) => {
    console.log(msg);
  };
};

let alerts: string[] = [];

export const mockAlert = () => {
  window['alert'] = (message) => {
    alerts.push(message);
  };
};

export const clearAlerts = () => {
  alerts = [];
};

export const getAlerts = () => {
  return alerts;
};
