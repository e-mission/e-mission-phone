import i18next from 'i18next';
import { labelInputDetailsForTrip } from './confirmHelper';
import { logDebug } from '../../plugin/logger';

export function tripIsUnlabeled(trip, userInputForTrip) {
  const tripInputDetails = labelInputDetailsForTrip(userInputForTrip);
  return Object.keys(tripInputDetails)
    .map((inputType) => !userInputForTrip?.[inputType])
    .reduce((acc, val) => acc || val, false);
}

function tripNeedsLabel(trip, userInputForTrip) {
  logDebug('Expectation: ' + trip.expectation);
  if (!trip.expectation) return true;
  return trip.expectation.to_label && tripIsUnlabeled(trip, userInputForTrip);
}

const UNLABELED = {
  key: 'unlabeled',
  text: i18next.t('diary.unlabeled'),
  filter: tripIsUnlabeled,
};

const TO_LABEL = {
  key: 'to_label',
  text: i18next.t('diary.to-label'),
  filter: tripNeedsLabel,
};

export const configuredFilters = [TO_LABEL, UNLABELED];
