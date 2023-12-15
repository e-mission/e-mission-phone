import { mockBEMUserCache } from '../__mocks__/cordovaMocks';
import { mockAlert, mockLogger } from '../__mocks__/globalMocks';
import { getConfig, initByUser } from '../js/config/dynamicConfig';

import initializedI18next from '../js/i18nextInit';
window['i18next'] = initializedI18next;

mockLogger();
mockAlert();
mockBEMUserCache();

global.fetch = (url: string) => {
  return new Promise((rs, rj) => {
    if (url.includes('nrel-commute.nrel-op.json')) {
      rs({
        ok: true,
        json: () =>
          new Promise((rs, rj) =>
            rs({
              version: 1,
              ts: 1655143472,
              server: {
                connectUrl: 'https://nrel-commute-openpath.nrel.gov/api/',
                aggregate_call_auth: 'user_only',
              },
              // ... more config would follow but it's good enough for this mock
            }),
          ),
      });
    }
  }) as any;
};

const fakeBaseConfig = {
  version: 1,
  server: {
    connectUrl: 'https://www.example.com',
    aggregate_call_auth: 'no_auth',
  },
};
const fakeConfigWithSurveys = {
  ...fakeBaseConfig,
  survey_info: {
    surveys: {
      CommuteSurvey: {
        formPath: 'https://www.example.com',
        labelTemplate: { en: 'Trip to {{destination}}' },
        labelVars: { walking: { destination: 'work' } },
        version: 1,
        compatibleWith: 1,
        dataKey: 'commute',
      },
    },
    'trip-labels': 'MULTILABEL',
  },
};

describe('dynamicConfig', () => {
  const fakeStudyName = 'gotham-city-transit';
  const validStudyName = 'nrel-commute';

  describe('getConfig', () => {
    it('should reject since no config is set yet', () => {
      expect(getConfig()).rejects.toThrow();
    });
    it('should resolve with a config once initByUser is called', async () => {
      const validToken = `nrelop_${validStudyName}_user1`;
      await initByUser({ token: validToken });
      const config = await getConfig();
      expect(config.server.connectUrl).toBe('https://nrel-commute-openpath.nrel.gov/api/');
    });
  });

  describe('initByUser', () => {
    it('should error if the study is nonexistent', () => {
      const fakeBatmanToken = `nrelop_${fakeStudyName}_batman`;
      expect(initByUser({ token: fakeBatmanToken })).rejects.toThrow();
    });
    it('should error if the study exists but the token is invalid format', () => {
      const badToken1 = validStudyName;
      expect(initByUser({ token: badToken1 })).rejects.toThrow();
      const badToken2 = `nrelop_${validStudyName}`;
      expect(initByUser({ token: badToken2 })).rejects.toThrow();
      const badToken3 = `nrelop_${validStudyName}_`;
      expect(initByUser({ token: badToken3 })).rejects.toThrow();
    });
    it('should return the config for valid token', () => {
      const validToken = `nrelop_${validStudyName}_user2`;
      expect(initByUser({ token: validToken })).resolves.toBeTruthy();
    });
  });
});
