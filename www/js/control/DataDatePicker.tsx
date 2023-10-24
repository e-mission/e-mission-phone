// this date picker element is set up to handle the "download data from day" in ProfileSettings
// it relies on an angular service (Control Helper) but when we migrate that we might want to download a range instead of single

import React from 'react';
import { DatePickerModal } from 'react-native-paper-dates';
import { useTranslation } from 'react-i18next';
import { getAngularService } from '../angular-react-helper';

const DataDatePicker = ({ date, setDate, open, setOpen, minDate }) => {
  const { t, i18n } = useTranslation(); //able to pull lang from this
  const ControlHelper = getAngularService('ControlHelper');

  const onDismiss = React.useCallback(() => {
    setOpen(false);
  }, [setOpen]);

  const onConfirm = React.useCallback(
    (params) => {
      setOpen(false);
      setDate(params.date);
      ControlHelper.getMyData(params.date);
    },
    [setOpen, setDate],
  );

  const maxDate = new Date();

  return (
    <>
      <DatePickerModal
        locale={i18n.language}
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
