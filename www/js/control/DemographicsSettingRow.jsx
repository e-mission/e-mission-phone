import React from "react";
import { angularize } from "../angular-react-helper";
import { getAngularService } from "../angular-react-helper";
import SettingRow from "./SettingRow";

const DemographicsSettingRow = ({ }) => {

  const EnketoDemographicsService = getAngularService('EnketoDemographicsService');
  const EnketoSurveyLaunch = getAngularService('EnketoSurveyLaunch');
  const $rootScope = getAngularService('$rootScope');

  // copied from /js/survey/enketo/enketo-demographics.js
  function openPopover() {
    return EnketoDemographicsService.loadPriorDemographicSurvey().then((lastSurvey) => {
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

angularize(DemographicsSettingRow, 'DemographicsSettingRow','emission.main.control.demographicsSettingRow');
export default DemographicsSettingRow;