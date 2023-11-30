import packageJsonBuild from '../../package.cordovabuild.json';

export const mockCordova = () => {
  window['cordova'] ||= {};
  window['cordova'].platformId ||= 'ios';
  window['cordova'].platformVersion ||= packageJsonBuild.dependencies['cordova-ios'];
  window['cordova'].plugins ||= {};
};

export const mockReminders = () => {
  window['cordova'] ||= {};
  window['cordova'].plugins ||= {};
  window['cordova'].plugins.notification ||= {};
  window['cordova'].plugins.notification.local ||= {};
  window['cordova'].plugins.notification.local.getScheduled ||= () => [];
  window['cordova'].plugins.notification.local.cancelAll ||= () => {};
  window['cordova'].plugins.notification.local.schedule ||= () => {};
};

export const mockDevice = () => {
  window['device'] ||= {};
  window['device'].platform ||= 'ios';
  window['device'].version ||= '14.0.0';
};

export const mockGetAppVersion = () => {
  const mockGetAppVersion = {
    getAppName: () => new Promise((rs, rj) => setTimeout(() => rs('Mock App'), 10)),
    getPackageName: () => new Promise((rs, rj) => setTimeout(() => rs('com.example.mockapp'), 10)),
    getVersionCode: () => new Promise((rs, rj) => setTimeout(() => rs('123'), 10)),
    getVersionNumber: () => new Promise((rs, rj) => setTimeout(() => rs('1.2.3'), 10)),
  };
  window['cordova'] ||= {};
  window['cordova'].getAppVersion = mockGetAppVersion;
};

export const mockFile = () => {
  window['cordova'].file = {
    dataDirectory: '../path/to/data/directory',
    applicationStorageDirectory: '../path/to/app/storage/directory',
  };
};

//for consent document
const _storage = {};

export const mockBEMUserCache = () => {
  const _cache = {};
  const messages = [];
  const mockBEMUserCache = {
    getLocalStorage: (key: string, isSecure: boolean) => {
      return new Promise((rs, rj) =>
        setTimeout(() => {
          rs(_cache[key]);
        }, 100),
      );
    },
    putLocalStorage: (key: string, value: any) => {
      return new Promise<void>((rs, rj) =>
        setTimeout(() => {
          _cache[key] = value;
          rs();
        }, 100),
      );
    },
    removeLocalStorage: (key: string) => {
      return new Promise<void>((rs, rj) =>
        setTimeout(() => {
          delete _cache[key];
          rs();
        }, 100),
      );
    },
    clearAll: () => {
      return new Promise<void>((rs, rj) =>
        setTimeout(() => {
          for (let p in _cache) delete _cache[p];
          for (let doc in _storage) delete _storage[doc];
          rs();
        }, 100),
      );
    },
    listAllLocalStorageKeys: () => {
      return new Promise<string[]>((rs, rj) =>
        setTimeout(() => {
          rs(Object.keys(_cache));
        }, 100),
      );
    },
    listAllUniqueKeys: () => {
      return new Promise<string[]>((rs, rj) =>
        setTimeout(() => {
          rs(Object.keys(_cache));
        }, 100),
      );
    },
    putMessage: (key: string, value: any) => {
      return new Promise<void>((rs, rj) =>
        setTimeout(() => {
          messages.push({ key, value });
          rs();
        }, 100),
      );
    },
    getAllMessages: (key: string, withMetadata?: boolean) => {
      return new Promise<any[]>((rs, rj) =>
        setTimeout(() => {
          rs(messages.filter((m) => m.key == key).map((m) => m.value));
        }, 100),
      );
    },
    getDocument: (key: string, withMetadata?: boolean) => {
      return new Promise<any[]>((rs, rj) =>
        setTimeout(() => {
          rs(_storage[key]);
        }, 100),
      );
    },
    isEmptyDoc: (doc) => {
      if (doc == undefined) {
        return true;
      }
      let string = doc.toString();
      if (string.length == 0) {
        return true;
      } else {
        return false;
      }
    },
  };
  window['cordova'] ||= {};
  window['cordova'].plugins ||= {};
  window['cordova'].plugins.BEMUserCache = mockBEMUserCache;
};

export const mockBEMDataCollection = () => {
  const mockBEMDataCollection = {
    markConsented: (consentDoc) => {
      setTimeout(() => {
        _storage['config/consent'] = consentDoc;
      }, 100);
    },
    getConfig: () => {
      return new Promise<any>((rs, rj) => {
        setTimeout(() => {
          rs({ ios_use_remote_push_for_sync: true });
        }, 100);
      });
    },
    handleSilentPush: () => {
      return new Promise<void>((rs, rj) =>
        setTimeout(() => {
          rs();
        }, 100),
      );
    },
  };
  window['cordova'] ||= {};
  window['cordova'].plugins.BEMDataCollection = mockBEMDataCollection;
};

export const mockBEMServerCom = () => {
  const mockBEMServerCom = {
    postUserPersonalData: (actionString, typeString, updateDoc, rs, rj) => {
      setTimeout(() => {
        console.log('set in mock', updateDoc);
        _storage['user_data'] = updateDoc;
        rs();
      }, 100);
    },

    getUserPersonalData: (actionString, rs, rj) => {
      setTimeout(() => {
        rs(_storage['user_data']);
      }, 100);
    },
  };
  window['cordova'].plugins.BEMServerComm = mockBEMServerCom;
};

let _url_stash = '';

export const mockInAppBrowser = () => {
  const mockInAppBrowser = {
    open: (url: string, mode: string, options: {}) => {
      _url_stash = url;
    },
  };
  window['cordova'].InAppBrowser = mockInAppBrowser;
};

export const getURL = () => {
  return _url_stash;
};

export const clearURL = () => {
  _url_stash = '';
};
