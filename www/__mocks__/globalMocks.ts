export const mockLogger = () => {
  window['Logger'] = { log: console.log };
}
