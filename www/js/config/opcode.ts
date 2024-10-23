import i18next from 'i18next';
import { logDebug } from '../plugin/logger';
import AppConfig from '../types/appConfigTypes';

/**
 * Adapted from https://stackoverflow.com/a/63363662/4040267
 * made available under a CC BY-SA 4.0 license
 */
function generateRandomString(length: number) {
  const randomInts = window.crypto.getRandomValues(new Uint8Array(length * 2));
  const randomChars = Array.from(randomInts).map((b) => String.fromCharCode(b));
  const randomString = randomChars.join('');
  const validRandomString = window.btoa(randomString).replace(/[+/]/g, '');
  const truncatedRandomString = validRandomString.substring(0, length);
  return truncatedRandomString;
}

/*
 * We want to support both old style and new style tokens.
 * Theoretically, we don't need anything from this except the study
 * name, but we should re-validate the token for extra robustness.
 * The control flow here is a bit tricky, though.
 * - we need to first get the study name
 * - then we need to retrieve the study config
 * - then we need to re-validate the token against the study config,
 * and the subgroups in the study config, in particular.
 *
 * So let's support two separate functions here - getStudyNameFromToken and getSubgroupFromToken
 */
export function getStudyNameFromToken(token: string): string {
  const tokenParts = token.split('_');
  if (tokenParts.length < 3 || tokenParts.some((part) => part == '')) {
    // all tokens must have at least nrelop_[studyname]_[usercode]
    // and neither [studyname] nor [usercode] can be blank
    throw new Error(i18next.t('config.not-enough-parts-old-style', { token: token }));
  }
  if (tokenParts[0] != 'nrelop') {
    throw new Error(i18next.t('config.no-nrelop-start', { token: token }));
  }
  return tokenParts[1];
}

export function getSubgroupFromToken(token: string, config: AppConfig): string | undefined {
  if (config.opcode) {
    // new style study, expects token with sub-group
    const tokenParts = token.split('_');
    if (tokenParts.length <= 3) {
      // no subpart defined
      throw new Error(i18next.t('config.not-enough-parts', { token: token }));
    }
    if (config.opcode.subgroups) {
      if (config.opcode.subgroups.indexOf(tokenParts[2]) == -1) {
        // subpart not in config list
        throw new Error(
          i18next.t('config.invalid-subgroup', {
            token: token,
            subgroup: tokenParts[2],
            config_subgroups: config.opcode.subgroups,
          }),
        );
      } else {
        logDebug('subgroup ' + tokenParts[2] + ' found in list ' + config.opcode.subgroups);
        return tokenParts[2];
      }
    } else {
      if (tokenParts[2] != 'default') {
        // subpart not in config list
        throw new Error(i18next.t('config.invalid-subgroup-no-default', { token: token }));
      } else {
        logDebug("no subgroups in config, 'default' subgroup found in token ");
        return tokenParts[2];
      }
    }
  } else {
    /* old style study, expect token without subgroup
     * nothing further to validate at this point
     * only validation required is `nrelop_` and valid study name
     * first is already handled in getStudyNameFromToken, second is handled
     * by default since download will fail if it is invalid
     */
    logDebug('Old-style study, expecting token without a subgroup...');
    return undefined;
  }
}

/**
 * @returns The study name for a URL, which is:
 *           - the value of the 'study_config' query parameter if present,
 *           - the first part of the hostname before '-openpath' if present,
 *           - 'stage' if the first part of the hostname is 'openpath-stage',
 *           - undefined if it can't be determined
 * @example getStudyNameFromUrl(new URL('https://openpath-stage.nrel.gov/join/')) => 'stage'
 * @example getStudyNameFromUrl(new URL('https://open-access-openpath.nrel.gov/join/')) => 'open-access'
 * @example getStudyNameFromUrl(new URL('https://nrel-commute-openpath.nrel.gov/api/')) => 'nrel-commute'
 * @example getStudyNameFromUrl(new URL('http://localhost:3274/?study_config=foo')) => 'foo'
 */
export function getStudyNameFromUrl(url) {
  const studyConfigParam = url.searchParams.get('study_config');
  if (studyConfigParam) return studyConfigParam;
  const firstDomain = url.hostname.split('.')[0];
  if (firstDomain == 'openpath-stage') return 'stage';
  const openpathSuffixIndex = firstDomain.indexOf('-openpath');
  if (openpathSuffixIndex == -1) return undefined;
  return firstDomain.substring(0, openpathSuffixIndex);
}

/**
 * @example generateOpcodeFromUrl(new URL('https://open-access-openpath.nrel.gov/join/')) => nrelop_open-access_default_randomLongStringWith32Characters
 * @example generateOpcodeFromUrl(new URL('https://open-access-openpath.nrel.gov/join/?sub_group=foo')) => nrelop_open-access_foo_randomLongStringWith32Characters
 */
function generateOpcodeFromUrl(url: URL) {
  const studyName = getStudyNameFromUrl(url);
  const subgroup = url.searchParams.get('sub_group') || 'default';
  const randomString = generateRandomString(32);
  return url.searchParams.get('tester') == 'true'
    ? `nrelop_${studyName}_${subgroup}_test_${randomString}`
    : `nrelop_${studyName}_${subgroup}_${randomString}`;
}

/**
 * @description If the URL has a path of 'login_token', returns the token from the URL. If the URL has a path of 'join', generates a token and returns it.
 * @example getTokenFromUrl('https://open-access-openpath.nrel.gov/join/') => nrelop_open-access_default_randomLongStringWith32Characters
 * @example getTokenFromUrl('emission://login_token?token=nrelop_study_subgroup_random') => nrelop_study_subgroup_random
 * @example getTokenFromUrl('nrelopenpath://login_token?token=nrelop_study_subgroup_random') => nrelop_study_subgroup_random
 */
export function getTokenFromUrl(url: string) {
  const parsedUrl = new URL(url);
  const path = parsedUrl.pathname.replace(/\//g, '') || parsedUrl.hostname;
  if (path == 'join') {
    const token = generateOpcodeFromUrl(parsedUrl);
    logDebug(`getTokenFromUrl: found 'join' path in URL, using generated token ${token}`);
    return token;
  } else if (path == 'login_token') {
    const token = parsedUrl.searchParams.get('token');
    if (!token) throw new Error(`URL ${url} had path 'login_token' but no token param`);
    logDebug(`getTokenFromUrl: found 'login_token' path in URL, using token ${token}`);
    return token;
  } else {
    throw new Error(`URL ${url} had path ${path}, expected 'join' or 'login_token'`);
  }
}
