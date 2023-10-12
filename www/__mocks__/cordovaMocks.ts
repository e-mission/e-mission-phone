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
  const messages = [];
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
    },
    putMessage: (key: string, value: any) => {
      return new Promise<void>((rs, rj) =>
        setTimeout(() => {
          messages.push({ key, value });
          rs();
        }, 100)
      );
    },
    getAllMessages: (key: string, withMetadata?: boolean) => {
      return new Promise<any[]>((rs, rj) =>
        setTimeout(() => {
          rs(messages.filter(m => m.key == key).map(m => m.value));
        }, 100)
      );
    },
    getDocument: (key: string, withMetadata?: boolean) => {
      // this was mocked specifically for enketoHelper's use, could be expanded if needed
      const fakeSurveyConfig = {
        survey_info: {
          surveys: {
            TimeUseSurvey: { compatibleWith: 1, 
              formPath: "https://raw.githubusercontent.com/sebastianbarry/nrel-openpath-deploy-configs/surveys-info-and-surveys-data/survey-resources/data-json/time-use-survey-form-v9.json", 
              labelTemplate: {en: " erea, plural, =0 {} other {# Employment/Education, } }{ da, plural, =0 {} other {# Domestic activities, }",
                              es: " erea, plural, =0 {} other {# Empleo/Educación, } }{ da, plural, =0 {} other {# Actividades domesticas, }"}, 
              labelVars: {da: {key: "Domestic_activities", type: "length"},
                          erea: {key: "Employment_related_a_Education_activities", type:"length"}}, 
              version: 9}
          }
        }
      }

      if(key == "config/app_ui_config"){
        return new Promise<any>((rs, rj) =>
        setTimeout(() => {
          rs(fakeSurveyConfig);
        }, 100)
      );
      }
      else {
        return null;
      }
    }
  }
  window['cordova'] ||= {};
  window['cordova'].plugins ||= {};
  window['cordova'].plugins.BEMUserCache = mockBEMUserCache;
}
