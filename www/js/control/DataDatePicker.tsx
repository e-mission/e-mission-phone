/* This date picker element is set up to handle the "download data from day" in ProfileSettings.
  Later, we may consider changing this to a date range instead of a single day */

import React, { useState } from 'react';
import { ModalProps } from 'react-native';
import { DatePickerModal } from 'react-native-paper-dates';
import { useTranslation } from 'react-i18next';
import { getMyData } from '../services/controlHelper';
import useAppConfig from '../useAppConfig';

const DataDatePicker = (props: ModalProps) => {
  const appConfig = useAppConfig();
  const { t, i18n } = useTranslation();
  const [date, setDate] = useState<Date>(new Date());

  const onConfirm = React.useCallback(
    (params) => {
      setDate(params.date);
      getMyData(params.date);
      props.onDismiss?.();
    },
    [setDate, props.onDismiss],
  );

  const minDate = new Date(
    Number(appConfig?.intro?.start_year),
    Number(appConfig?.intro?.start_month) - 1,
    1,
  );
  const maxDate = new Date();

  return (
    <DatePickerModal
      locale={i18n.resolvedLanguage || 'en'}
      mode="single"
      visible={props.visible || false}
      onDismiss={props.onDismiss || (() => {})}
      date={date}
      onChange={onConfirm}
      onConfirm={onConfirm}
      label={t('general-settings.choose-date')}
      saveLabel={t('list-datepicker-set')}
      validRange={{ startDate: minDate, endDate: maxDate }}
    />
  );
};

export default DataDatePicker;
