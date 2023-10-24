import React, { useState } from "react";
import SettingRow from "./SettingRow";
import { loadPreviousResponseForSurvey } from "../survey/enketo/enketoHelper";
import EnketoModal from "../survey/enketo/EnketoModal";

export const DEMOGRAPHIC_SURVEY_NAME = "UserProfileSurvey";
export const DEMOGRAPHIC_SURVEY_DATAKEY = "manual/demographic_survey";

const DemographicsSettingRow = ({ }) => {

  const [surveyModalVisible, setSurveyModalVisible] = useState(false);
  const [prevSurveyResponse, setPrevSurveyResponse] = useState(null);

  function openPopover() {
    return loadPreviousResponseForSurvey(DEMOGRAPHIC_SURVEY_DATAKEY).then((lastSurvey) => {
      if (lastSurvey?.data?.xmlResponse) {
        setPrevSurveyResponse(lastSurvey.data.xmlResponse);
        setSurveyModalVisible(true);
      }
    });
  }

  return (<>
    <SettingRow action={openPopover} iconName="account"
      textKey="control.edit-demographics" isToggle={false} />
    <EnketoModal visible={surveyModalVisible} onDismiss={() => setSurveyModalVisible(false)}
      onResponseSaved={() => setSurveyModalVisible(false)} surveyName={DEMOGRAPHIC_SURVEY_NAME}
      opts={{
        prefilledSurveyResponse: prevSurveyResponse,
        dataKey: DEMOGRAPHIC_SURVEY_DATAKEY,
      }} />
  </>);
};

export default DemographicsSettingRow;
