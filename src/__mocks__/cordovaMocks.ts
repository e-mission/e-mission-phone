import { Platform } from 'react-native';
import packageJson from '../../package.json';

export let alerts: string[] = [];

export const mockLogger = () => {
  window['Logger'] = {
    log: console.log,
    getMaxIndex: () => 0, // mock
    getMessagesFromIndex: () => [], // mock
  };
  window['alert'] = (message) => {
    console.log(message);
    alerts.push(message);
  };
  console.error ||= (msg) => {
    console.log(msg);
  };
};
import { displayErrorMsg } from '../js/plugin/logger';

export const mockCordova = () => {
  window['cordova'] ||= {};
  window['cordova'].platformId ||= 'web';
  window['cordova'].platformVersion ||= '0.0.0';
  window['cordova'].plugins ||= {};
};

export const mockLocalNotification = () => {
  let notifications: any[] = [];
  window['cordova'] ||= {};
  window['cordova'].plugins ||= {};
  window['cordova'].plugins.notification ||= {};
  window['cordova'].plugins.notification.local ||= {
    getScheduled: (callback) => {
      setTimeout(() => {
        console.debug('getScheduled resolved');
        callback(notifications);
      });
    },
    cancelAll: (callback) => {
      setTimeout(() => {
        notifications = [];
        callback();
      });
    },
    schedule: (nots, callback) => {
      setTimeout(() => {
        notifications.push(...nots);
        callback();
      });
    },
  };
};

export const mockDevice = () => {
  window['device'] ||= {};
  window['device'].cordova ||= '0.0.0';
  window['device'].model ||= 'UNKNOWN';
  window['device'].platform ||= 'web';
  window['device'].uuid ||= '00000000';
  window['device'].version ||= '0.0.0';
  window['device'].manufacturer ||= 'UNKNOWN';
  window['device'].isVirtual ||= false;
  window['device'].serial ||= '00000000';
};

export const mockGetAppVersion = () => {
  const mockGetAppVersion = {
    getAppName: () => new Promise((rs, rj) => setTimeout(() => rs(packageJson.displayName))),
    getPackageName: () => new Promise((rs, rj) => setTimeout(() => rs(packageJson.name))),
    getVersionCode: () => new Promise((rs, rj) => setTimeout(() => rs(packageJson.version))),
    getVersionNumber: () => new Promise((rs, rj) => setTimeout(() => rs(packageJson.version))),
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

const BEM_USERCACHE_LOCAL = 'BEMUserCache:local:';
const BEM_USERCACHE_DOC = 'BEMUserCache:doc:';
const BEM_SERVERCOMM = 'BEMServerComm:';

type MessageData = any;
type Message = { key: string; data: MessageData; metadata: { write_ts: number; [k: string]: any } };
export const mockBEMUserCache = (config?) => {
  const messages: Message[] = [];
  const mockBEMUserCache = {
    getLocalStorage: (key: string, isSecure: boolean) => {
      return new Promise((rs, rj) =>
        setTimeout(() => {
          const raw = sessionStorage.getItem(`${BEM_USERCACHE_LOCAL}${key}`);
          rs(raw === null ? undefined : JSON.parse(raw));
        }),
      );
    },
    putLocalStorage: (key: string, value: any) => {
      return new Promise<void>((rs, rj) =>
        setTimeout(() => {
          sessionStorage.setItem(`${BEM_USERCACHE_LOCAL}${key}`, JSON.stringify(value));
          rs();
        }),
      );
    },
    removeLocalStorage: (key: string) => {
      return new Promise<void>((rs, rj) =>
        setTimeout(() => {
          sessionStorage.removeItem(`${BEM_USERCACHE_LOCAL}${key}`);
          rs();
        }),
      );
    },
    clearAll: () => {
      return new Promise<void>((rs, rj) =>
        setTimeout(() => {
          for (let key in sessionStorage) {
            if (key.startsWith(BEM_USERCACHE_LOCAL) || key.startsWith(BEM_USERCACHE_DOC)) {
              sessionStorage.removeItem(key);
            }
          }
          rs();
        }),
      );
    },
    listAllLocalStorageKeys: () => {
      return new Promise<string[]>((rs, rj) =>
        setTimeout(() => {
          rs(
            Object.keys(sessionStorage)
              .filter((key) => key.startsWith(BEM_USERCACHE_LOCAL))
              .map((key) => key.substring(BEM_USERCACHE_LOCAL.length)),
          );
        }),
      );
    },
    listAllUniqueKeys: () => {
      return new Promise<string[]>((rs, rj) =>
        setTimeout(() => {
          rs(
            Object.keys(sessionStorage)
              .filter((key) => key.startsWith(BEM_USERCACHE_LOCAL))
              .map((key) => key.substring(BEM_USERCACHE_LOCAL.length)),
          );
        }),
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
        }),
      );
    },
    getAllMessages: (key: string, withMetadata?: boolean) => {
      return new Promise<Message[] | MessageData[]>((rs, rj) =>
        setTimeout(() => {
          rs(messages.filter((m) => m.key == key).map((m) => (withMetadata ? m : m.data)));
        }),
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
        }),
      );
    }, // Used for getUnifiedDataForInterval
    putRWDocument: (key: string, value: any) => {
      if (key == 'config/app_ui_config') {
        return new Promise<void>((rs, rj) =>
          setTimeout(() => {
            config = value;
            rs();
          }),
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
          }),
        );
      } else {
        return new Promise<any[]>((rs, rj) =>
          setTimeout(() => {
            const raw = sessionStorage.getItem(`${BEM_USERCACHE_DOC}${key}`);
            rs(raw === null ? undefined : JSON.parse(raw));
          }),
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
          }),
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
          sessionStorage.setItem(`${BEM_USERCACHE_DOC}config/consent`, JSON.stringify(consentDoc));
          rs();
        }),
      );
    },
    getConfig: () => {
      return new Promise<any>((rs, rj) => {
        setTimeout(() => {
          rs({ ios_use_remote_push_for_sync: true });
        });
      });
    },
    handleSilentPush: () => {
      return new Promise<void>((rs, rj) =>
        setTimeout(() => {
          rs();
        }),
      );
    },
    getState: () => {
      return new Promise<any>((rs, rj) => {
        setTimeout(() => {
          rs(undefined);
        });
      });
    },
  };
  window['cordova'] ||= {};
  window['cordova'].plugins ||= {};
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

    const auth = await window['cordova'].plugins.BEMUserCache.getLocalStorage('prompted-auth');
    const opcode = auth?.token;
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
    postUserPersonalData: (actionString, typeString, updateDoc, rs, rj) => {
      setTimeout(() => {
        console.log('set in mock', updateDoc);
        sessionStorage.setItem(`${BEM_SERVERCOMM}user_data`, JSON.stringify(updateDoc));
        rs();
      });
    },
    getUserPersonalData: (actionString, rs, rj) => {
      setTimeout(() => {
        const raw = sessionStorage.getItem(`${BEM_SERVERCOMM}user_data`);
        rs(raw === null ? undefined : JSON.parse(raw));
      });
    },
  };
  window['cordova'] ||= {};
  window['cordova'].plugins ||= {};
  window['cordova'].plugins.BEMServerComm = mockBEMServerCom;
};

export const mockOPCodeAuth = () => {
  const mockOPCodeAuth = {
    getOPCode: () =>
      window['cordova'].plugins.BEMUserCache.getLocalStorage('prompted-auth').then(
        (auth) => auth?.token,
      ),
  };
  window['cordova'] ||= {};
  window['cordova'].plugins ||= {};
  window['cordova'].plugins.OPCodeAuth = mockOPCodeAuth;
};

export const mockFileSystem = () => {
  const mockFileSystem = (parentDir, handleFS) => {
    const fs = {
      filesystem: {
        root: {
          getFile: (path, options, onSuccess) => {
            let fileEntry = {
              file: (handleFile) => {
                let file = new File(['this is a mock'], 'loggerDB');
                handleFile(file);
              },
              nativeURL: 'file:///Users/Jest/test/URL/',
              isFile: true,
            };
            onSuccess(fileEntry);
          },
        },
      },
    };
    console.log('in mock, fs is ', fs, ' get File is ', fs.filesystem.root.getFile);
    handleFS(fs);
  };
  window['resolveLocalFileSystemURL'] ||= mockFileSystem;
};

export const mockInAppBrowser = () => {
  const mockInAppBrowser = {
    open: (url: string, mode: string, options: {}) => {
      console.log(`Mock InAppBrowser: open ${url} with mode: ${mode} and options:`, options);
    },
  };
  window['cordova'].InAppBrowser = mockInAppBrowser;
};

export const mockCordovaHttp = () => {
  const mockHttp = {
    sendRequest: async (
      url: string,
      options: any,
      successCallback: (response: { status: number; data: any }) => void,
      errorCallback: (error: any) => void,
    ) => {
      try {
        const response = await fetch(url, {
          method: options?.method || 'get',
          headers: options?.headers,
          body:
            options?.data === undefined
              ? undefined
              : typeof options.data === 'string'
                ? options.data
                : JSON.stringify(options.data),
        } as RequestInit);

        let data: any;
        if (options?.responseType === 'json') {
          if (typeof response.json === 'function') {
            data = await response.json();
          } else if (typeof response.text === 'function') {
            data = JSON.parse(await response.text());
          } else {
            data = response as any;
          }
        } else if (typeof response.text === 'function') {
          data = await response.text();
        } else {
          data = response as any;
        }

        successCallback({
          status: (response as any)?.status ?? 200,
          data,
        });
      } catch (error) {
        errorCallback(error);
      }
    },
  };

  window['cordova'].plugin ||= {};
  window['cordova'].plugin.http ||= mockHttp;
};
