/*
 * The general structure of this code is that all the timeline information for
 * a particular day is retrieved from the Timeline factory and put into the scope.
 * For best performance, all data should be loaded into the in-memory timeline,
 * and in addition to writing to storage, the data should be written to memory.
 * All UI elements should only use $scope variables.
 */

import i18next from 'i18next';

const unlabeledCheck = (t) => {
  return t.INPUTS.map((inputType, index) => !t.userInput[inputType]).reduce(
    (acc, val) => acc || val,
    false,
  );
};

const invalidCheck = (t) => {
  const retVal =
    t.userInput['MODE'] &&
    t.userInput['MODE'].value === 'pilot_ebike' &&
    (!t.userInput['REPLACED_MODE'] ||
      t.userInput['REPLACED_MODE'].value === 'pilot_ebike' ||
      t.userInput['REPLACED_MODE'].value === 'same_mode');
  return retVal;
};

const toLabelCheck = (trip) => {
  if (trip.expectation) {
    console.log(trip.expectation.to_label);
    return trip.expectation.to_label && unlabeledCheck(trip);
  } else {
    return true;
  }
};

const UNLABELED = {
  key: 'unlabeled',
  text: i18next.t('diary.unlabeled'),
  filter: unlabeledCheck,
  width: 'col-50',
};

const INVALID_EBIKE = {
  key: 'invalid_ebike',
  text: i18next.t('diary.invalid-ebike'),
  filter: invalidCheck,
};

const TO_LABEL = {
  key: 'to_label',
  text: i18next.t('diary.to-label'),
  filter: toLabelCheck,
  width: 'col-50',
};

export const configuredFilters = [TO_LABEL, UNLABELED];
