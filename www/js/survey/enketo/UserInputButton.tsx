/* This button launches an Enketo survey associated with the trip or place (timelineEntry).
  The use case for this may be gathering detailed information associated with a trip or place,
  such as the mode and purpose of travel, the number of people traveling, cost of travel, and
  other details.
  
  Unlike the AddNoteButton, this button only records one survey response per trip or place
  and does not have multiple time-based additions.
  The start and end times of the addition are the same as the trip or place.
*/

import React, { useContext, useMemo, useState } from 'react';
import { getAngularService } from '../../angular-react-helper';
import DiaryButton from '../../components/DiaryButton';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'react-native-paper';
import { displayErrorMsg, logDebug } from '../../plugin/logger';
import EnketoModal from './EnketoModal';
import LabelTabContext from '../../diary/LabelTabContext';

type Props = {
  timelineEntry: any;
};
const UserInputButton = ({ timelineEntry }: Props) => {
  const { colors } = useTheme();
  const { t, i18n } = useTranslation();

  const [prevSurveyResponse, setPrevSurveyResponse] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const { repopulateTimelineEntry, timelineLabelMap } = useContext(LabelTabContext);

  // the label resolved from the survey response, or null if there is no response yet
  const responseLabel = useMemo<string | null>(
    () => timelineLabelMap[timelineEntry._id.$oid]?.['SURVEY']?.data?.label || null,
    [timelineEntry],
  );

  function launchUserInputSurvey() {
    logDebug('UserInputButton: About to launch survey');
    const prevResponse = timelineLabelMap[timelineEntry._id.$oid]?.['SURVEY'];
    setPrevSurveyResponse(prevResponse?.data?.xmlResponse);
    setModalVisible(true);
  }

  function onResponseSaved(result) {
    if (result) {
      logDebug(
        'UserInputButton: response was saved, about to repopulateTimelineEntry; result=' +
          JSON.stringify(result),
      );
      repopulateTimelineEntry(timelineEntry._id.$oid);
    } else {
      displayErrorMsg('UserInputButton: response was not saved, result=', result);
    }
  }

  return (
    <>
      <DiaryButton
        fillColor={responseLabel && colors.primary}
        onPress={() => launchUserInputSurvey()}>
        {/* if no response yet, show the default label */}
        {responseLabel || t('diary.choose-survey')}
      </DiaryButton>

      <EnketoModal
        visible={modalVisible}
        onDismiss={() => setModalVisible(false)}
        onResponseSaved={onResponseSaved}
        surveyName={'TripConfirmSurvey'} /* As of now, the survey name is hardcoded.
                                        In the future, if we ever implement something like
                                        a "Place Details" survey, we may want to make this
                                        configurable. */
        opts={{ timelineEntry, prefilledSurveyResponse: prevSurveyResponse }}
      />
    </>
  );
};

export default UserInputButton;
