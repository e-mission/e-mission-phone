/* This button launches an Enketo survey associated with the trip or place (timelineEntry).
  The use case for this may be recording activities during a trip, or recording notes about
  a place. The survey used is specified by the config.

  Unlike the UserInputButton, this button can record multiple things per trip or place.
  From each survey response, a new addition is created and added to the timeline entry.
  The start and end times of the addition are determined by the survey response.
*/

import React, { useEffect, useState, useContext } from 'react';
import DiaryButton from '../../components/DiaryButton';
import { useTranslation } from 'react-i18next';
import { DateTime } from 'luxon';
import TimelineContext from '../../TimelineContext';
import EnketoModal from './EnketoModal';
import { displayErrorMsg, logDebug } from '../../plugin/logger';
import { isTrip } from '../../types/diaryTypes';

type Props = {
  timelineEntry: any;
  notesConfig: any;
  storeKey: string;
};
const AddNoteButton = ({ timelineEntry, notesConfig, storeKey }: Props) => {
  const { t, i18n } = useTranslation();
  const [displayLabel, setDisplayLabel] = useState('');
  const { notesFor, addUserInputToEntry } = useContext(TimelineContext);

  useEffect(() => {
    let newLabel: string;
    const localeCode = i18n.resolvedLanguage || 'en';
    if (notesConfig?.['filled-in-label'] && notesFor(timelineEntry)?.length) {
      newLabel = notesConfig?.['filled-in-label']?.[localeCode];
      setDisplayLabel(newLabel);
    } else {
      newLabel = notesConfig?.['not-filled-in-label']?.[localeCode];
      setDisplayLabel(newLabel);
    }
  }, [notesConfig]);

  type PrefillTimes = {
    Start_date?: string;
    Start_time?: string;
    End_date?: string;
    End_time?: string;
  };
  // return a dictionary of fields we want to prefill, using start/enter and end/exit times
  function getPrefillTimes() {
    let begin = isTrip(timelineEntry) ? timelineEntry.start_ts : timelineEntry.enter_ts;
    let stop = isTrip(timelineEntry) ? timelineEntry.end_ts : timelineEntry.exit_ts;

    // if addition(s) already present on this timeline entry, `begin` where the last one left off
    notesFor(timelineEntry)?.forEach((a) => {
      if (a.data.end_ts > (begin || 0) && a.data.end_ts != stop) begin = a.data.end_ts;
    });

    const timezone =
      timelineEntry.start_local_dt?.timezone ||
      timelineEntry.enter_local_dt?.timezone ||
      timelineEntry.end_local_dt?.timezone ||
      timelineEntry.exit_local_dt?.timezone;
    const beginDt = begin ? DateTime.fromSeconds(begin).setZone(timezone) : null;
    const stopDt = stop ? DateTime.fromSeconds(stop).setZone(timezone) : null;

    // the current, local time offset (e.g. -07:00)
    const currOffset = DateTime.now().toISO()?.slice(-6);
    const prefillTimes: PrefillTimes = {};

    // enketo requires dates as YYYY-MM-DD, and times as HH:mm:ss.SSS+/-HH:mm
    // some may be left blank, if the timelineEntry doesn't have them
    if (beginDt) {
      prefillTimes.Start_date = beginDt.toFormat('yyyy-MM-dd');
      prefillTimes.Start_time = beginDt.toFormat('HH:mm:ss.SSS') + currOffset;
    } else if (stopDt) {
      prefillTimes.Start_date = stopDt.toFormat('yyyy-MM-dd');
    }
    if (stopDt) {
      prefillTimes.End_date = stopDt.toFormat('yyyy-MM-dd');
      prefillTimes.End_time = stopDt.toFormat('HH:mm:ss.SSS') + currOffset;
    }
    return prefillTimes;
  }

  function launchAddNoteSurvey() {
    const surveyName = notesConfig.surveyName;
    logDebug(`AddNoteButton: about to launch survey ${surveyName}`);
    setPrefillTimes(getPrefillTimes());
    setModalVisible(true);
  }

  function onResponseSaved(result) {
    if (result) {
      logDebug(`AddNoteButton: response was saved, about to addUserInputToEntry; 
        result = ${JSON.stringify(result)}`);
      addUserInputToEntry(timelineEntry._id.$oid, result, 'note');
    } else {
      displayErrorMsg('AddNoteButton: response was not saved, result=', result);
    }
  }

  const [prefillTimes, setPrefillTimes] = useState<PrefillTimes | undefined>(undefined);
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <>
      <DiaryButton icon={'plus-thick'} onPress={() => launchAddNoteSurvey()}>
        {displayLabel}
      </DiaryButton>
      <EnketoModal
        visible={modalVisible}
        onDismiss={() => setModalVisible(false)}
        onResponseSaved={onResponseSaved}
        surveyName={notesConfig?.surveyName}
        opts={{ timelineEntry, dataKey: storeKey, prefillFields: prefillTimes }}
      />
    </>
  );
};

export default AddNoteButton;
