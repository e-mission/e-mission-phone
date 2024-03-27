/* This date picker element is set up to handle the "download data from day" in ProfileSettings.
  Later, we may consider changing this to a date range instead of a single day */

import React from 'react';
import { DatePickerModal } from 'react-native-paper-dates';
import { useTranslation } from 'react-i18next';
import { getMyData } from '../services/controlHelper';

const DataDatePicker = ({ date, setDate, open, setOpen, minDate }) => {
  const { t, i18n } = useTranslation(); //able to pull lang from this
  const onDismiss = React.useCallback(() => {
    setOpen(false);
  }, [setOpen]);

  const onConfirm = React.useCallback(
    (params) => {
      setOpen(false);
      setDate(params.date);
      getMyData(params.date);
    },
    [setOpen, setDate],
  );

  const maxDate = new Date();

  return (
    <>
      <DatePickerModal
        locale={i18n.resolvedLanguage || 'en'}
        mode="single"
        visible={open}
        onDismiss={onDismiss}
        date={date}
        onChange={onConfirm}
        onConfirm={onConfirm}
        label={t('general-settings.choose-date')}
        saveLabel={t('list-datepicker-set')}
        validRange={{ startDate: minDate, endDate: maxDate }}
      />
    </>
  );
};

export default DataDatePicker;
