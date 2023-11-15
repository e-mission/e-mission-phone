export const mockLogger = () => {
  window['Logger'] = { log: console.log };
};

let alerts = [];

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
