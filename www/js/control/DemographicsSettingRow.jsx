import React from "react";
import { getAngularService } from "../angular-react-helper";
import SettingRow from "./SettingRow";
import { loadPreviousResponseForSurvey } from "../survey/enketo/enketoHelper";

const DEMOGRAPHIC_SURVEY_DATAKEY = "manual/demographic_survey";

const DemographicsSettingRow = ({ }) => {

  const EnketoSurveyLaunch = getAngularService('EnketoSurveyLaunch');
  const $rootScope = getAngularService('$rootScope');

  function openPopover() {
    return loadPreviousResponseForSurvey(DEMOGRAPHIC_SURVEY_DATAKEY).then((lastSurvey) => {
      return EnketoSurveyLaunch
        .launch($rootScope, 'UserProfileSurvey', {
          prefilledSurveyResponse: lastSurvey?.data?.xmlResponse,
          showBackButton: true, showFormFooterJumpNav: true
        })
        .then(result => {
          console.log("demographic survey result ", result);
        });
    });
  }

  return <SettingRow action={openPopover} iconName="account"
          textKey="control.edit-demographics" isToggle={false} />
};

export default DemographicsSettingRow;
