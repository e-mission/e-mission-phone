import { DateTime } from 'luxon';
import { getConfig, resetDataAndRefresh } from '../config/dynamicConfig';
import { storageGet, storageSet } from '../plugin/storage';
import { displayError, logDebug } from '../plugin/logger';
import { readConsentState } from '../splash/startprefs';
import { addStatReading } from '../plugin/clientStats';
import { getSubgroupFromToken } from '../config/opcode';

export const INTRO_DONE_KEY = 'intro_done';

// route = WELCOME if no config present
// route = SUMMARY if config present, but protocol not done and summary not done
// route = PROTOCOL if config present, but protocol not done and summary done
// route = SAVE_QR if config present, protocol done, but save qr not done
// route = SURVEY if config present, consented and save qr done
// route = FAILED if onboarding has failed for some reason
// route = DONE if onboarding is finished (intro_done marked)

export enum OnboardingRoute {
  WELCOME,
  SUMMARY,
  PROTOCOL,
  SAVE_QR,
  SURVEY,
  FAILED,
  DONE,
}
export type OnboardingState = {
  opcode: string;
  subgroup: string | undefined;
  route: OnboardingRoute;
};

export let summaryDone = false;
export const setSummaryDone = (b) => (summaryDone = b);

export let protocolDone = false;
export const setProtocolDone = (b) => (protocolDone = b);

export let saveQrDone = false;
export const setSaveQrDone = (b) => (saveQrDone = b);

export let registerUserDone = false;
export const setRegisterUserDone = (b) => (registerUserDone = b);

export let onboardingFailed = false;
export const setOnboardingFailed = (b: boolean) => (onboardingFailed = b);

export let pendingOpcode: string | undefined;
export const setPendingOpcode = (opcode: string) => (pendingOpcode = opcode);

async function getOPCode() {
  logDebug(`getOPCode: pendingOpcode = ${pendingOpcode}`);
  try {
    const storedOpcode = await window['cordova'].plugins.OPCodeAuth.getOPCode();
    const finalOpcode = storedOpcode || pendingOpcode;
    logDebug(`getOPCode: resolved opcode = ${finalOpcode}; storedOpcode = ${storedOpcode}`);
    return finalOpcode;
  } catch (err) {
    logDebug(`getOPCode: failed to read opcode: ${err}`);
    throw err;
  }
}

export function getPendingOnboardingState(): Promise<OnboardingState> {
  logDebug(
    `getPendingOnboardingState: starting; pendingOpcode=${pendingOpcode}; protocolDone=${protocolDone}; summaryDone=${summaryDone}; saveQrDone=${saveQrDone}; registerUserDone=${registerUserDone}`,
  );
  return Promise.all([getOPCode(), getConfig(), readConsentState(), readIntroDone()])
    .then(([opcode, config, isConsented, isIntroDone]) => {
      logDebug(
        `getPendingOnboardingState: async inputs resolved -> opcode=${opcode}; configPresent=${Boolean(config)}; isConsented=${isConsented}; isIntroDone=${isIntroDone}`,
      );

      let route: OnboardingRoute;

      // backwards compat - prev. versions might have config cleared but still have intro_done set
      if (!config && (isIntroDone || isConsented)) {
        logDebug(
          'getPendingOnboardingState: config missing while intro/consent suggests stale state; resetting data and refreshing',
        );
        resetDataAndRefresh(); // if there's no config, we need to reset everything
      }

      if (onboardingFailed) {
        route = OnboardingRoute.FAILED;
      } else if (isIntroDone) {
        route = OnboardingRoute.DONE;
      } else if (!config || !opcode) {
        route = OnboardingRoute.WELCOME;
      } else if (!protocolDone && !summaryDone) {
        route = OnboardingRoute.SUMMARY;
      } else if (!protocolDone) {
        route = OnboardingRoute.PROTOCOL;
      } else if (!saveQrDone) {
        route = OnboardingRoute.SAVE_QR;
      } else {
        route = OnboardingRoute.SURVEY;
      }

      logDebug(
        `getPendingOnboardingState: selected route=${route} (${OnboardingRoute[route]}); onboardingFailed=${onboardingFailed}; isIntroDone=${isIntroDone}; configPresent=${Boolean(config)}; isConsented=${isConsented}; saveQrDone=${saveQrDone}; protocolDone=${protocolDone}; summaryDone=${summaryDone}; opcode=${opcode}`,
      );

      const subgroup = config ? getSubgroupFromToken(opcode, config) : undefined;
      logDebug(`getPendingOnboardingState: subgroup=${subgroup}`);
      addStatReading('onboarding_state', { route, opcode, subgroup, onboardingFailed });
      return { route, opcode, subgroup };
    })
    .catch((err) => {
      setOnboardingFailed(true);
      displayError(err, `getPendingOnboardingState: failed while determining state`);
      return { opcode: '', subgroup: undefined, route: OnboardingRoute.FAILED };
    });
}

export async function readIntroDone() {
  return storageGet(INTRO_DONE_KEY).then((read_val) => Boolean(read_val)) as Promise<boolean>;
}

export async function markIntroDone() {
  const currDateTime = DateTime.now().toISO();
  logDebug(`marking intro done at ${currDateTime}`);
  return storageSet(INTRO_DONE_KEY, currDateTime);
}
