import i18next from 'i18next';

export const tripIsUnlabeled = (trip, userInputForTrip) =>
  !userInputForTrip || !Object.values(userInputForTrip).some((input) => input);

const TO_LABEL = {
  key: 'to_label',
  text: i18next.t('diary.to-label'),
  filter: tripIsUnlabeled,
};

export const configuredFilters = [TO_LABEL];
