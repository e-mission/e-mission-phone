import { getConfig, joinWithTokenOrUrl } from '../js/config/dynamicConfig';
import initializedI18next from '../js/i18nextInit';
import { storageClear } from '../js/plugin/storage';
import i18next from '../js/i18nextInit';

window['i18next'] = initializedI18next;

beforeEach(() => {
  // clear all storage and the config document
  storageClear({ local: true, native: true });
  window['cordova'].plugins.BEMUserCache.putRWDocument('config/app_ui_config', {});
});

const nrelCommuteConfig = {
  version: 1,
  server: {
    connectUrl: 'https://nrel-commute-openpath.nrel.gov/api/',
    aggregate_call_auth: 'user_only',
  },
  // ...
};

const denverCasrConfig = {
  version: 1,
  server: {
    connectUrl: 'https://denver-casr-openpath.nrel.gov/api/',
    aggregate_call_auth: 'user_only',
  },
  opcode: {
    autogen: true,
    subgroups: [
      'test',
      'qualified-cargo',
      'qualified-regular',
      'standard-cargo',
      'standard-regular',
    ],
  },
  // ...
};

global.fetch = (url: string) => {
  return new Promise((rs, rj) => {
    if (url.includes('nrel-commute.nrel-op.json')) {
      rs({
        ok: true,
        json: () => new Promise((rs, rj) => rs(nrelCommuteConfig)),
      });
    } else if (url.includes('denver-casr.nrel-op.json')) {
      rs({
        ok: true,
        json: () => new Promise((rs, rj) => rs(denverCasrConfig)),
      });
    } else {
      rj(new Error('404 while fetching ' + url));
    }
  }) as any;
};

const windowAlert = jest.spyOn(window, 'alert').mockImplementation(() => {});

describe('dynamicConfig', () => {
  const fakeStudyName = 'gotham-city-transit';
  const validStudyNrelCommute = 'nrel-commute';
  const validStudyDenverCasr = 'denver-casr';

  describe('getConfig', () => {
    it('should resolve with null since no config is set yet', async () => {
      await expect(getConfig()).resolves.toBeNull();
    });
    it('should resolve with a valid config once joinWithTokenOrUrl is called for an nrel-commute token', async () => {
      const validToken = `nrelop_${validStudyNrelCommute}_user1`;
      await joinWithTokenOrUrl(validToken);
      const config = await getConfig();
      expect(config!.server.connectUrl).toBe('https://nrel-commute-openpath.nrel.gov/api/');
      expect(config!.joined).toEqual({
        opcode: validToken,
        study_name: validStudyNrelCommute,
        subgroup: undefined,
      });
    });

    it('should resolve with a valid config once joinWithTokenOrUrl is called for a denver-casr token', async () => {
      const validToken = `nrelop_${validStudyDenverCasr}_test_user1`;
      await joinWithTokenOrUrl(validToken);
      const config = await getConfig();
      expect(config!.server.connectUrl).toBe('https://denver-casr-openpath.nrel.gov/api/');
      expect(config!.joined).toEqual({
        opcode: validToken,
        study_name: validStudyDenverCasr,
        subgroup: 'test',
      });
    });
  });

  describe('joinWithTokenOrUrl', () => {
    // fake study (gotham-city-transit)
    it('returns false if the study is nonexistent', async () => {
      const fakeBatmanToken = `nrelop_${fakeStudyName}_batman`;
      await expect(joinWithTokenOrUrl(fakeBatmanToken)).resolves.toBe(false);
      expect(windowAlert).toHaveBeenLastCalledWith(
        expect.stringContaining(i18next.t('config.unable-download-config')),
      );
    });

    // real study without subgroups (nrel-commute)
    it('returns false if the study exists but the token is invalid format', async () => {
      const badToken1 = `nrelop_${validStudyNrelCommute}`; // doesn't have enough _
      await expect(joinWithTokenOrUrl(badToken1)).resolves.toBe(false);
      expect(windowAlert).toHaveBeenLastCalledWith(
        expect.stringContaining(
          i18next.t('config.not-enough-parts-old-style', { token: badToken1 }),
        ),
      );

      const badToken2 = `nrelop_${validStudyNrelCommute}_`; // doesn't have user code after last _
      await expect(joinWithTokenOrUrl(badToken2)).resolves.toBe(false);
      expect(windowAlert).toHaveBeenLastCalledWith(
        expect.stringContaining(
          i18next.t('config.not-enough-parts-old-style', { token: badToken2 }),
        ),
      );

      const badToken3 = `invalid_${validStudyNrelCommute}_user3`; // doesn't start with nrelop_
      await expect(joinWithTokenOrUrl(badToken3)).resolves.toBe(false);
      expect(windowAlert).toHaveBeenLastCalledWith(
        expect.stringContaining(i18next.t('config.no-nrelop-start', { token: badToken3 })),
      );
    });

    it('returns true after successfully storing the config for a valid token', async () => {
      const validToken = `nrelop_${validStudyNrelCommute}_user2`;
      await expect(joinWithTokenOrUrl(validToken)).resolves.toBe(true);
    });

    // real study with subgroups (denver-casr)
    it('returns false if the study uses subgroups but the token has no subgroup', async () => {
      const tokenWithoutSubgroup = `nrelop_${validStudyDenverCasr}_user2`;
      await expect(joinWithTokenOrUrl(tokenWithoutSubgroup)).resolves.toBe(false);
      expect(windowAlert).toHaveBeenLastCalledWith(
        expect.stringContaining(
          i18next.t('config.not-enough-parts', { token: tokenWithoutSubgroup }),
        ),
      );
    });
    it('returns false if the study uses subgroups and the token is invalid format', async () => {
      const badToken1 = `nrelop_${validStudyDenverCasr}_test_`; // doesn't have user code after last _
      await expect(joinWithTokenOrUrl(badToken1)).resolves.toBe(false);
      expect(windowAlert).toHaveBeenLastCalledWith(
        expect.stringContaining(
          i18next.t('config.not-enough-parts-old-style', { token: badToken1 }),
        ),
      );
    });
    it('returns true after successfully storing the config for a valid token with subgroup', async () => {
      const validToken = `nrelop_${validStudyDenverCasr}_test_user2`;
      await expect(joinWithTokenOrUrl(validToken)).resolves.toBe(true);
    });
  });
});
