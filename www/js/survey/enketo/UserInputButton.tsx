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
import useDerivedProperties from '../../diary/useDerivedProperties';
import { resolveSurveyButtonConfig } from './enketoHelper';
import { SurveyButtonConfig } from '../../types/appConfigTypes';

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
  const derivedTripProps = useDerivedProperties(timelineEntry);

  // which survey will this button launch?
  const survey = useMemo<SurveyButtonConfig | null>(() => {
    if (!appConfig) return null; // no config loaded yet; show blank for now
    const possibleSurveysForButton = resolveSurveyButtonConfig(appConfig, 'trip-label');
    // if there is only one survey, no need to check further
    if (possibleSurveysForButton.length == 1) return possibleSurveysForButton[0];
    // config lists one or more surveys; find which one to use for this timeline entry
    return getSurveyForTimelineEntry(possibleSurveysForButton, timelineEntry, derivedTripProps);
  }, [appConfig, timelineEntry, i18n.resolvedLanguage]);

  // the label resolved from the survey response, or undefined if there is no response yet
  const responseLabel = useMemo<string | undefined>(() => {
    if (!survey) return undefined;
    return userInputFor(timelineEntry)?.[survey.surveyName]?.data.label || undefined;
  }, [survey, userInputFor(timelineEntry)?.[survey?.surveyName || '']?.data.label]);

  function launchUserInputSurvey() {
    if (!survey) return displayErrorMsg('UserInputButton: no survey to launch');
    logDebug('UserInputButton: About to launch survey');
    const prevResponse = userInputFor(timelineEntry)?.[survey.surveyName];
    if (prevResponse?.data?.xmlResponse) {
      setPrevSurveyResponse(prevResponse.data.xmlResponse);
    }
    setModalVisible(true);
  }

  function onResponseSaved(result) {
    if (result) {
      logDebug(`UserInputButton: response was saved, about to addUserInputToEntry; 
        result = ${JSON.stringify(result)}`);
      addUserInputToEntry(timelineEntry._id.$oid, { [result.name]: result }, 'label');
    } else {
      displayErrorMsg('UserInputButton: response was not saved, result=', result);
    }
  }

  if (!survey) return <></>; // no survey to launch
  return (
    <>
      <DiaryButton
        // if a response has been been recorded, the button is 'filled in'
        fillColor={responseLabel && colors.primary}
        onPress={() => launchUserInputSurvey()}>
        {responseLabel || survey['not-filled-in-label'][i18n.resolvedLanguage || 'en']}
      </DiaryButton>

      <EnketoModal
        visible={modalVisible}
        onDismiss={() => setModalVisible(false)}
        onResponseSaved={onResponseSaved}
        surveyName={survey.surveyName}
        opts={{ timelineEntry, prefilledSurveyResponse: prevSurveyResponse }}
      />
    </>
  );
};

export default UserInputButton;
