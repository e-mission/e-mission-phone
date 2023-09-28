export const mockCordova = () => {
  window['cordova'] ||= {};
  window['cordova'].platformId ||= 'ios';
  window['cordova'].platformVersion ||= '6.2.0';
  window['cordova'].plugins ||= {};
}

export const mockDevice = () => {
  window['device'] ||= {};
  window['device'].platform ||= 'ios';
  window['device'].version ||= '14.0.0';
}

export const mockGetAppVersion = () => {
  const mockGetAppVersion = {
    getAppName: () => new Promise((rs, rj) => setTimeout(() => rs('Mock App'), 10)),
    getPackageName: () => new Promise((rs, rj) => setTimeout(() => rs('com.example.mockapp'), 10)),
    getVersionCode: () => new Promise((rs, rj) => setTimeout(() => rs('123'), 10)),
    getVersionNumber: () => new Promise((rs, rj) => setTimeout(() => rs('1.2.3'), 10)),
  }
  window['cordova'] ||= {};
  window['cordova'].getAppVersion = mockGetAppVersion;
}

export const mockBEMUserCache = () => {
  const _cache = {};
  const mockBEMUserCache = {
    getLocalStorage: (key: string, isSecure: boolean) => {
      return new Promise((rs, rj) =>
        setTimeout(() => {
          rs(_cache[key]);
        }, 100)
      );
    },
    putLocalStorage: (key: string, value: any) => {
      return new Promise<void>((rs, rj) =>
        setTimeout(() => {
          _cache[key] = value;
          rs();
        }, 100)
      );
    },
    removeLocalStorage: (key: string) => {
      return new Promise<void>((rs, rj) =>
        setTimeout(() => {
          delete _cache[key];
          rs();
        }, 100)
      );
    },
    clearAll: () => {
      return new Promise<void>((rs, rj) =>
        setTimeout(() => {
          for (let p in _cache) delete _cache[p];
          rs();
        }, 100)
      );
    },
    listAllLocalStorageKeys: () => {
      return new Promise<string[]>((rs, rj) =>
        setTimeout(() => {
          rs(Object.keys(_cache));
        }, 100)
      );
    },
    listAllUniqueKeys: () => {
      return new Promise<string[]>((rs, rj) =>
        setTimeout(() => {
          rs(Object.keys(_cache));
        }, 100)
      );
    }
  }
  window['cordova'] ||= {};
  window['cordova'].plugins ||= {};
  window['cordova'].plugins.BEMUserCache = mockBEMUserCache;
}
