import { DateTime } from "luxon";
import { getConfig, resetDataAndRefresh } from "../config/dynamicConfig";
import { storageGet, storageSet } from "../plugin/storage";
import { logDebug } from "../plugin/logger";
import { readConsentState, isConsented } from "../splash/startprefs";
import { getAngularService } from "../angular-react-helper";

export const INTRO_DONE_KEY = 'intro_done';

// route = WELCOME if no config present
// route = SUMMARY if config present, but protocol not done and summary not done
// route = PROTOCOL if config present, but protocol not done and summary done
// route = SAVE_QR if config present, protocol done, but save qr not done
// route = SURVEY if config present, consented and save qr done
// route = DONE if onboarding is finished (intro_done marked)
export enum OnboardingRoute { WELCOME, SUMMARY, PROTOCOL, SAVE_QR, SURVEY, DONE };
export type OnboardingState = {
  opcode: string,
  route: OnboardingRoute,
}

export let summaryDone = false;
export const setSummaryDone = (b) => summaryDone = b;

export let protocolDone = false;
export const setProtocolDone = (b) => protocolDone = b;

export let saveQrDone = false;
export const setSaveQrDone = (b) => saveQrDone = b;

export let registerUserDone = false;
export const setRegisterUserDone = (b) => registerUserDone = b;

export function getPendingOnboardingState(): Promise<OnboardingState> {
  return Promise.all([getConfig(), readConsented(), readIntroDone()]).then(([config, isConsented, isIntroDone]) => {
    let route: OnboardingRoute;

    // backwards compat - prev. versions might have config cleared but still have intro_done set
    if (!config && (isIntroDone || isConsented)) {
      resetDataAndRefresh(); // if there's no config, we need to reset everything
      return null;
    }
    
    if (isIntroDone) {
      route = OnboardingRoute.DONE;
    } else if (!config) {
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

    logDebug("pending onboarding state is " + route + " intro, config, consent, qr saved : " + isIntroDone + config + isConsented + saveQrDone);

    return { route, opcode: config?.joined?.opcode };
  });
};

async function readConsented() {
  return readConsentState().then(isConsented) as Promise<boolean>;
}

export async function readIntroDone() {
  return storageGet(INTRO_DONE_KEY).then((read_val) => !!read_val) as Promise<boolean>;
}

export async function markIntroDone() {
  const currDateTime = DateTime.now().toISO();
  return storageSet(INTRO_DONE_KEY, currDateTime)
    .then(() => {
      //handle "on intro" events
      logDebug("intro done, calling registerPush and storeDeviceSettings");
      const PushNotify = getAngularService("PushNotify");
      const StoreSeviceSettings = getAngularService("StoreDeviceSettings");
      PushNotify.registerPush();
      StoreSeviceSettings.storeDeviceSettings();
    });
}
