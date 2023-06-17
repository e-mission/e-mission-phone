/* This button launches an Enketo survey associated with the trip or place (timelineEntry).
  The use case for this may be recording activities during a trip, or recording notes about
  a place. The survey used is specified by the config.

  Unlike the UserInputButton, this button can record multiple things per trip or place.
  From each survey response, a new addition is created and added to the timeline entry.
  The start and end times of the addition are determined by the survey response.
*/

import React, { useEffect, useState } from "react";
import { angularize, getAngularService } from "../../angular-react-helper";
import { object, string } from "prop-types";
import DiaryButton from "../../diary/DiaryButton";
import { useTranslation } from "react-i18next";
import moment from "moment";

const AddNoteButton = ({ timelineEntry, notesConfig, storeKey }) => {
  const { t, i18n } = useTranslation();

  const [displayLabel, setDisplayLabel] = useState('');

  const EnketoSurveyLaunch = getAngularService("EnketoSurveyLaunch");
  const $rootScope = getAngularService("$rootScope");

  useEffect(() => {
    // init
  }, []);

  const updateLabel = () => {
    let newLabel: string;
    const localeCode = i18n.resolvedLanguage;
    if (notesConfig?.['filled-in-label'] && timelineEntry.additionsList?.length > 0) {
      newLabel = notesConfig?.['filled-in-label']?.[localeCode];
      setDisplayLabel(newLabel);
    } else {
      newLabel = notesConfig?.['not-filled-in-label']?.[localeCode];
      setDisplayLabel(newLabel);
    }
    return newLabel;
  };

  // return a dictionary of fields we want to prefill, using start/enter and end/exit times
  function getPrefillTimes() {

    let begin = timelineEntry.start_ts || timelineEntry.enter_ts;
    let stop = timelineEntry.end_ts || timelineEntry.exit_ts;

    // if addition(s) already present on this timeline entry, `begin` where the last one left off
    timelineEntry.additionsList.forEach(a => {
      if (a.data.end_ts > (begin || 0) && a.data.end_ts != stop)
        begin = a.data.end_ts;
    });
    
    const timezone = timelineEntry.start_local_dt?.timezone
                      || timelineEntry.enter_local_dt?.timezone
                      || timelineEntry.end_local_dt?.timezone
                      || timelineEntry.exit_local_dt?.timezone;
    const momentBegin = begin ? moment(begin * 1000).tz(timezone) : null;
    const momentStop = stop ? moment(stop * 1000).tz(timezone) : null;

    // the current, local time offset (e.g. -07:00)
    const currOffset = moment().toISOString(true).slice(-6);
    let Start_date: string, Start_time: string, End_date: string, End_time: string;

    // enketo requires dates as YYYY-MM-DD, and times as HH:mm:ss.SSS+/-HH:mm
    // some may be left blank, if the timelineEntry doesn't have them
    if (momentBegin) {
      Start_date = momentBegin.format('YYYY-MM-DD');
      Start_time = momentBegin.format('HH:mm:ss.SSS') + currOffset;
    } else {
      Start_date = momentStop.format('YYYY-MM-DD');
    }
    if (momentStop) {
      End_date = momentStop.format('YYYY-MM-DD');
      End_time = momentStop.format('HH:mm:ss.SSS') + currOffset;
    }
    return { Start_date, Start_time, End_date, End_time };
  }

  function launchAddNoteSurvey() {
    const surveyName = notesConfig.surveyName;
    console.log('About to launch survey ', surveyName);
    const prefillFields = getPrefillTimes();

    return EnketoSurveyLaunch
      .launch($rootScope, surveyName, { timelineEntry, prefillFields, dataKey: storeKey })
      .then(result => {
        if (!result) {
          return;
        }
        const addition = {
          data: result,
          write_ts: Date.now(),
          key: storeKey,
        };
        // adding the addition for display is handled in infinite_scroll_list.js
        $rootScope.$broadcast('enketo.noteAddition', addition);
      });
  };

  return (
    <DiaryButton text={displayLabel || updateLabel()}
                  icon={'plus-thick'}
                  onPress={() => launchAddNoteSurvey()} />
  );
};

AddNoteButton.propTypes = {
  timelineEntry: object,
  notesConfig: object,
  storeKey: string,
}

angularize(AddNoteButton, 'emission.survey.addnotebutton');
export default AddNoteButton;
