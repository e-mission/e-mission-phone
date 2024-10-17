//  * @example getTokenFromUrl('https://open-access-openpath.nrel.gov/join/') => nrelop_open-access_default_randomLongStringWith32Characters
//  * @example getTokenFromUrl('emission://login_token?token=nrelop_study_subgroup_random') => nrelop_study_subgroup_random
//  * @example getTokenFromUrl('nrelopenpath://login_token?token=nrelop_study_subgroup_random') => nrelop_study_subgroup_random

import { getStudyNameFromToken, getSubgroupFromToken, getTokenFromUrl } from '../js/config/opcode';
import AppConfig from '../js/types/appConfigTypes';
describe('opcode', () => {
  describe('getStudyNameFromToken', () => {
    const token = 'nrelop_great-study_default_randomLongStringWith32Characters';
    it('returns the study name from a token', () => {
      expect(getStudyNameFromToken(token)).toBe('great-study');
    });
  });

  describe('getSubgroupFromToken', () => {
    const amazingSubgroupToken = 'nrelop_great-study_amazing-subgroup_000';
    it('returns the subgroup from a token with valid subgroup', () => {
      const fakeconfig = {
        opcode: {
          subgroups: ['amazing-subgroup', 'other-subgroup'],
        },
      } as any as AppConfig;
      expect(getSubgroupFromToken(amazingSubgroupToken, fakeconfig)).toBe('amazing-subgroup');
    });

    it("throws error if token's subgroup is not in config", () => {
      const fakeconfig = {
        opcode: {
          subgroups: ['sad-subgroup', 'other-subgroup'],
        },
      } as any as AppConfig;
      expect(() => getSubgroupFromToken(amazingSubgroupToken, fakeconfig)).toThrow();
    });

    it("returns 'default' if token has 'default' and config is not configured with subgroups", () => {
      const defaultSubgroupToken = 'nrelop_great-study_default_000';
      const fakeconfig = {
        opcode: {},
      } as any as AppConfig;
      expect(getSubgroupFromToken(defaultSubgroupToken, fakeconfig)).toBe('default');
    });

    it("throws error if token's subgroup is not 'default' and config is not configured with subgroups", () => {
      const invalidSubgroupToken = 'nrelop_great-study_imaginary-subgroup_000';
      const fakeconfig = {
        opcode: {},
      } as any as AppConfig;
      expect(() => getSubgroupFromToken(invalidSubgroupToken, fakeconfig)).toThrow();
    });
  });

  describe('getTokenFromUrl', () => {
    it('generates a token for an nrel.gov join page URL', () => {
      const url = 'https://open-access-openpath.nrel.gov/join/';
      expect(getTokenFromUrl(url)).toMatch(/^nrelop_open-access_default_[a-zA-Z0-9]{32}$/);
    });

    it('generates a token for an nrel.gov join page URL with a sub_group parameter', () => {
      const url = 'https://open-access-openpath.nrel.gov/join/?sub_group=foo';
      expect(getTokenFromUrl(url)).toMatch(/^nrelop_open-access_foo_[a-zA-Z0-9]{32}$/);
    });

    it('generates a token for an emission://join URL', () => {
      const url = 'emission://join?study_config=great-study';
      expect(getTokenFromUrl(url)).toMatch(/^nrelop_great-study_default_[a-zA-Z0-9]{32}$/);
    });

    it('extracts the token from a nrelopenpath://login_token URL', () => {
      const url = 'nrelopenpath://login_token?token=nrelop_study_subgroup_random';
      expect(getTokenFromUrl(url)).toBe('nrelop_study_subgroup_random');
    });

    it('throws error for any URL with a path other than "join" or "login_token"', () => {
      expect(() => getTokenFromUrl('https://open-access-openpath.nrel.gov/invalid/')).toThrow();
      expect(() => getTokenFromUrl('nrelopenpath://jion?study_config=open-access')).toThrow();
      expect(() =>
        getTokenFromUrl('emission://togin_loken?token=nrelop_open-access_000'),
      ).toThrow();
    });
  });
});
