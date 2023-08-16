/* This button launches an Enketo survey associated with the trip or place (timelineEntry).
  The use case for this may be gathering detailed information associated with a trip or place,
  such as the mode and purpose of travel, the number of people traveling, cost of travel, and
  other details.
  
  Unlike the AddNoteButton, this button only records one survey response per trip or place
  and does not have multiple time-based additions.
  The start and end times of the addition are the same as the trip or place.
*/

import React, { useEffect, useState } from "react";
import { angularize, getAngularService } from "../../angular-react-helper";
import { object } from "prop-types";
import DiaryButton from "../../diary/DiaryButton";
import { useTranslation } from "react-i18next";
import { useTheme } from "react-native-paper";
import { logDebug } from "../../plugin/logger";
import EnketoModal from "./EnketoModal";

const UserInputButton = ({ timelineEntry }) => {
  const { colors } = useTheme();
  const { t, i18n } = useTranslation();

  // initial label "Add Trip Details"; will be filled after a survey response is recorded
  const [displayLabel, setDisplayLabel] = useState(t('diary.choose-survey'));
  const [isFilled, setIsFilled] = useState(false);
  const [prevSurveyResponse, setPrevSurveyResponse] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const EnketoTripButtonService = getAngularService("EnketoTripButtonService");
  const etbsSingleKey = EnketoTripButtonService.SINGLE_KEY;

  useEffect(() => {
    const isFilled = timelineEntry.userInput?.[etbsSingleKey];
    if (isFilled) {
      setDisplayLabel(timelineEntry.userInput[etbsSingleKey].data.label);
      setIsFilled(true);
    }
  }, []);

  function launchUserInputSurvey() {
    logDebug('UserInputButton: About to launch survey');
    const prevResponse = timelineEntry.userInput?.[etbsSingleKey];
    setPrevSurveyResponse(prevResponse?.data?.xmlResponse);
    setModalVisible(true);
  }

  function onResponseSaved(result) {
    if (!result) return;
    timelineEntry.userInput[etbsSingleKey] = {
      data: result,
      write_ts: Date.now()
    }
    setDisplayLabel(result.label);
    setIsFilled(true);
  }

  return (<>
    <DiaryButton text={displayLabel}
                  fillColor={isFilled && colors.primary}
                  onPress={() => launchUserInputSurvey()} />
    <EnketoModal visible={modalVisible}
      onDismiss={() => setModalVisible(false)}
      onResponseSaved={onResponseSaved}
      surveyName={'TripConfirmSurvey'} /* As of now, the survey name is hardcoded.
                                        In the future, if we ever implement something like
                                        a "Place Details" survey, we may want to make this
                                        configurable. */
      opts={{ timelineEntry,
              prefilledSurveyResponse: prevSurveyResponse
      }} />
  </>);
};

UserInputButton.propTypes = {
  timelineEntry: object,
  notesConfig: object,
}

angularize(UserInputButton, 'UserInputButton', 'emission.survey.userinputbutton');
export default UserInputButton;
