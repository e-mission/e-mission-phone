/*
 * The general structure of this code is that all the timeline information for
 * a particular day is retrieved from the Timeline factory and put into the scope.
 * For best performance, all data should be loaded into the in-memory timeline,
 * and in addition to writing to storage, the data should be written to memory.
 * All UI elements should only use $scope variables.
 */

import i18next from 'i18next';
import { labelInputDetailsForTrip } from './confirmHelper';
import { logDebug } from '../../plugin/logger';

function unlabeledCheck(trip, userInputForTrip) {
  const tripInputDetails = labelInputDetailsForTrip(userInputForTrip);
  return Object.keys(tripInputDetails)
    .map((inputType) => !userInputForTrip?.[inputType])
    .reduce((acc, val) => acc || val, false);
}

function toLabelCheck(trip, userInputForTrip) {
  logDebug('Expectation: ' + trip.expectation);
  if (!trip.expectation) return true;
  return trip.expectation.to_label && unlabeledCheck(trip, userInputForTrip);
}

const UNLABELED = {
  key: 'unlabeled',
  text: i18next.t('diary.unlabeled'),
  filter: unlabeledCheck,
};

const TO_LABEL = {
  key: 'to_label',
  text: i18next.t('diary.to-label'),
  filter: toLabelCheck,
};

export const configuredFilters = [TO_LABEL, UNLABELED];
