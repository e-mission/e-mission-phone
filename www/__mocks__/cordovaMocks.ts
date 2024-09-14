import packageJsonBuild from '../../package.cordovabuild.json';

export let alerts: string[] = [];

export const mockLogger = () => {
  window['Logger'] = { log: console.log };
  window['alert'] = (message) => {
    console.log(message);
    alerts.push(message);
  };
  console.error = (msg) => {
    console.log(msg);
  };
};

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
    tempDirectory: '../path/to/temp/directory',
  };
};

//for consent document
const _storage = {};

type MessageData = any;
type Message = { key: string; data: MessageData; metadata: { write_ts: number; [k: string]: any } };
export const mockBEMUserCache = (config?) => {
  const _cache = {};
  const messages: Message[] = [];
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
          messages.push({
            key,
            data: value,
            // write_ts is epoch time in seconds
            metadata: { write_ts: Math.floor(Date.now() / 1000) },
          });
          rs();
        }, 100),
      );
    },
    getAllMessages: (key: string, withMetadata?: boolean) => {
      return new Promise<Message[] | MessageData[]>((rs, rj) =>
        setTimeout(() => {
          rs(messages.filter((m) => m.key == key).map((m) => (withMetadata ? m : m.data)));
        }, 100),
      );
    },
    getMessagesForInterval: (key: string, tq, withMetadata?: boolean) => {
      return new Promise<Message[] | MessageData[]>((rs, rj) =>
        setTimeout(() => {
          rs(
            messages
              .filter((m) => m.key == key)
              .filter((m) => m.metadata[tq.key] >= tq.startTs && m.metadata.write_ts <= tq.endTs)
              .map((m) => (withMetadata ? m : m.data)),
          );
        }, 100),
      );
    }, // Used for getUnifiedDataForInterval
    putRWDocument: (key: string, value: any) => {
      if (key == 'config/app_ui_config') {
        return new Promise<void>((rs, rj) =>
          setTimeout(() => {
            config = value;
            rs();
          }, 100),
        );
      }
    },
    getDocument: (key: string, withMetadata?: boolean) => {
      //returns the config provided as a paramenter to this mock!
      if (key == 'config/app_ui_config') {
        return new Promise<any>((rs, rj) =>
          setTimeout(() => {
            if (config) rs(config);
            else rs({}); // return empty object if config is not set
          }, 100),
        );
      } else {
        return new Promise<any[]>((rs, rj) =>
          setTimeout(() => {
            rs(_storage[key]);
          }, 100),
        );
      }
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
    getAllTimeQuery: () => {
      return { key: 'write_ts', startTs: 0, endTs: Date.now() / 1000 };
    },
    getSensorDataForInterval: (key, tq, withMetadata) => {
      if (key == `manual/demographic_survey`) {
        return new Promise<any>((rs, rj) =>
          setTimeout(() => {
            rs({ metadata: { write_ts: '1699897723' }, data: 'completed', time: '01/01/2001' });
          }, 100),
        );
      } else {
        return Promise.resolve([]);
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
  window['cordova'] ||= {};
  window['cordova'].plugins ||= {};
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
