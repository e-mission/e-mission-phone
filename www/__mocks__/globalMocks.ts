export const mockLogger = () => {
  window['Logger'] = { log: console.log };
  window.alert = (msg) => {
    console.log(msg);
  };
  console.error = (msg) => {
    console.log(msg);
  };
};
