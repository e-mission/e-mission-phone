/* This button launches an Enketo survey associated with the trip or place (timelineEntry).
  The use case for this may be gathering detailed information associated with a trip or place,
  such as the mode and purpose of travel, the number of people traveling, cost of travel, and
  other details.
  
  Unlike the AddNoteButton, this button only records one survey response per trip or place
  and does not have multiple time-based additions.
  The start and end times of the addition are the same as the trip or place.
*/

import React, { useContext, useMemo, useState } from 'react';
import DiaryButton from '../../components/DiaryButton';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'react-native-paper';
import { displayErrorMsg, logDebug } from '../../plugin/logger';
import EnketoModal from './EnketoModal';
import TimelineContext from '../../TimelineContext';
import useAppConfig from '../../useAppConfig';
import { getSurveyForTimelineEntry } from './conditionalSurveys';

type Props = {
  timelineEntry: any;
};
const UserInputButton = ({ timelineEntry }: Props) => {
  const { colors } = useTheme();
  const appConfig = useAppConfig();
  const { t, i18n } = useTranslation();

  const [prevSurveyResponse, setPrevSurveyResponse] = useState<string | undefined>(undefined);
  const [modalVisible, setModalVisible] = useState(false);
  const { userInputFor, addUserInputToEntry } = useContext(TimelineContext);

  // which survey will this button launch?
  const [surveyName, notFilledInLabel] = useMemo(() => {
    const tripLabelConfig = appConfig?.survey_info?.buttons?.['trip-label'];
    if (!tripLabelConfig) {
      // config doesn't specify; use default
      return ['TripConfirmSurvey', t('diary.choose-survey')];
    }
    // config lists one or more surveys; find which one to use
    const s = getSurveyForTimelineEntry(tripLabelConfig, timelineEntry);
    const lang = i18n.resolvedLanguage || 'en';
    return [s?.surveyName, s?.['not-filled-in-label'][lang]];
  }, [appConfig, timelineEntry, i18n.resolvedLanguage]);

  // the label resolved from the survey response, or null if there is no response yet
  const responseLabel = useMemo<string | undefined>(
    () => userInputFor(timelineEntry)?.['SURVEY']?.data.label || undefined,
    [userInputFor(timelineEntry)?.['SURVEY']?.data.label],
  );

  function launchUserInputSurvey() {
    logDebug('UserInputButton: About to launch survey');
    const prevResponse = userInputFor(timelineEntry)?.['SURVEY'];
    if (prevResponse?.data?.xmlResponse) {
      setPrevSurveyResponse(prevResponse.data.xmlResponse);
    }
    setModalVisible(true);
  }

  function onResponseSaved(result) {
    if (result) {
      logDebug(`UserInputButton: response was saved, about to addUserInputToEntry; 
        result = ${JSON.stringify(result)}`);
      addUserInputToEntry(timelineEntry._id.$oid, { SURVEY: result }, 'label');
    } else {
      displayErrorMsg('UserInputButton: response was not saved, result=', result);
    }
  }

  if (!surveyName) return <></>; // no survey to launch
  return (
    <>
      <DiaryButton
        // if a response has been been recorded, the button is 'filled in'
        fillColor={responseLabel && colors.primary}
        onPress={() => launchUserInputSurvey()}>
        {responseLabel || notFilledInLabel}
      </DiaryButton>

      <EnketoModal
        visible={modalVisible}
        onDismiss={() => setModalVisible(false)}
        onResponseSaved={onResponseSaved}
        surveyName={surveyName}
        opts={{ timelineEntry, prefilledSurveyResponse: prevSurveyResponse }}
      />
    </>
  );
};

export default UserInputButton;
