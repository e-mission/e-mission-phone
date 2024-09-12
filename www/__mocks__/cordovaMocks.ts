import { Platform } from 'react-native';
import packageJsonBuild from '../../package.cordovabuild.json';
import { getConfig } from '../js/config/dynamicConfig';
import { displayErrorMsg } from '../js/plugin/logger';

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

type MessageData = any;
type Message = { key: string; data: MessageData; metadata: { write_ts: number; [k: string]: any } };
export const mockBEMUserCache = () => {
  const messages: Message[] = [];
  const mockBEMUserCache = {
    getLocalStorage: (key: string, isSecure: boolean) => {
      return new Promise((rs, rj) =>
        setTimeout(() => {
          const stored = localStorage.getItem('usercache_' + key);
          if (stored) rs(JSON.parse(stored));
          else rs(null);
        }, 100),
      );
    },
    putLocalStorage: (key: string, value: any) => {
      return new Promise<void>((rs, rj) =>
        setTimeout(() => {
          localStorage.setItem('usercache_' + key, JSON.stringify(value));
          rs();
        }, 100),
      );
    },
    removeLocalStorage: (key: string) => {
      return new Promise<void>((rs, rj) =>
        setTimeout(() => {
          localStorage.removeItem('usercache_' + key);
          rs();
        }, 100),
      );
    },
    clearAll: () => {
      return new Promise<void>((rs, rj) =>
        setTimeout(() => {
          localStorage.clear();
          rs();
        }, 100),
      );
    },
    listAllLocalStorageKeys: () => {
      return new Promise<string[]>((rs, rj) =>
        setTimeout(() => {
          rs(Object.keys(localStorage));
        }, 100),
      );
    },
    listAllUniqueKeys: () => {
      return new Promise<string[]>((rs, rj) =>
        setTimeout(() => {
          rs(Object.keys(localStorage));
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
            localStorage.setItem('config/app_ui_config', JSON.stringify(value));
            rs();
          }, 100),
        );
      }
    },
    getDocument: (key: string, withMetadata?: boolean) => {
      return new Promise<any>((rs, rj) =>
        setTimeout(() => {
          const stored = localStorage.getItem('config/app_ui_config');
          if (stored) rs(JSON.parse(stored));
          else rs({});
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
      return new Promise<void>((rs, rj) =>
        setTimeout(() => {
          localStorage.setItem('config/consent', JSON.stringify(consentDoc));
          rs();
        }, 100),
      );
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

const mockBEMConnectionSettings = () => {
  let _connectionSettings = {};
  const mockBEMConnectionSettings = {
    getSettings: (key: string) => Promise.resolve(_connectionSettings),
    getDefaultSettings: () =>
      Promise.resolve({
        [Platform.OS.toLowerCase()]: {
          auth: {
            method: 'dummy-dev',
          },
        },
        connectUrl: 'http://localhost:8080',
      }),
    setSettings: (settings: any) => Promise.resolve((_connectionSettings = settings)),
  };
  window['cordova'] ||= {};
  window['cordova'].plugins ||= {};
  window['cordova'].plugins.BEMConnectionSettings = mockBEMConnectionSettings;
};

export const mockBEMServerCom = () => {
  mockBEMConnectionSettings();

  const pushGetJSON = async (relativeUrl: string, msgFiller, successCallback, errorCallback) => {
    const filledJsonObject = {};
    msgFiller(filledJsonObject);

    const savedConfig = await getConfig();
    const opcode = savedConfig?.['joined'].opcode;
    if (!opcode) {
      displayErrorMsg('No user opcode found');
      return;
    }
    filledJsonObject['user'] = opcode;
    const { connectUrl } = await window['cordova'].plugins.BEMConnectionSettings.getSettings();
    const fullUrl = connectUrl + relativeUrl;

    console.debug('mockBEMServerCom', fullUrl, filledJsonObject);
    console.debug('filledJsonObject', filledJsonObject);

    const options = {
      method: 'post',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(filledJsonObject),
    } as RequestInit;
    const response = await fetch(fullUrl, options);
    if (response.status === 200) {
      const json = await response.json();
      successCallback(json);
    } else {
      const e = new Error(`Failed to get JSON object, status ${response.status}`);
      errorCallback(e);
    }
  };
  const mockBEMServerCom = {
    pushGetJSON,
    postUserPersonalData: (
      relativeUrl,
      objectLabel,
      objectJSON,
      successCallback,
      errorCallback,
    ) => {
      const msgFiller = (message) => {
        message[objectLabel] = objectJSON;
      };
      pushGetJSON(relativeUrl, msgFiller, successCallback, errorCallback);
    },

    getUserPersonalData: function (relativeUrl, successCallback, errorCallback) {
      const msgFiller = (message) => {
        // nop. we don't really send any data for what are effectively get calls
      };
      pushGetJSON(relativeUrl, msgFiller, successCallback, errorCallback);
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
