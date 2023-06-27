import React from "react";
import { angularize, getAngularService, createScopeWithVars } from "../angular-react-helper";
import { object } from "prop-types";
import ExpansionSection from "./ExpandMenu";
import SettingRow from "./SettingRow";
import ControlDataTable from "./ControlDataTable";
import DemographicsSettingRow from "./DemographicsSettingRow";

const ProfileSettings = ({ settingsScope }) => {

    // settingsScope is the $scope of general-settings.js
    // grab any variables or functions you need from it like this:
    const { logOut, viewPrivacyPolicy, viewQRCode, userStartStopTracking, 
        fixAppStatus, toggleLowAccuracy, changeCarbonDataset,
        forceSync, share, openDatePicker, uploadLog, emailLog,
        eraseUserData, userData, carbonString, settings } = settingsScope;

    return (
        <>
           {/* <SettingRow textKey={settings.auth.opcode} iconName='logout' action={logOut}></SettingRow> */}
           <DemographicsSettingRow></DemographicsSettingRow>
           <SettingRow textKey='control.view-privacy' iconName='eye' action={viewPrivacyPolicy}></SettingRow>
           <SettingRow textKey="control.view-qrc" iconName="grid" action={viewQRCode}></SettingRow>
           {/* this toggle only kinda works */}
           <SettingRow textKey="control.tracking" action={userStartStopTracking} isToggle={true}></SettingRow>
           <SettingRow textKey="control.app-status" iconName="check" action={fixAppStatus}></SettingRow>
           {/* this switch is also a troublemaker (it's just not fully implemented well yet) */}
           <SettingRow textKey="control.medium-accuracy" action={toggleLowAccuracy} isToggle={true}></SettingRow>
           <SettingRow textKey={carbonString} iconName="database-cog" action={changeCarbonDataset}></SettingRow>
           <SettingRow textKey="control.force-sync" iconName="sync" action={forceSync}></SettingRow>
           <SettingRow textKey="control.share" iconName="share" action={share}></SettingRow>
           <SettingRow textKey="control.download-json-dump" iconName="calendar" action={openDatePicker}></SettingRow>
           {/* this row missing condition!!! Should only show iff ui_config.profile_controls.support_upload == true */}
           <SettingRow textKey="control.upload-log" iconName="cloud" action={uploadLog}></SettingRow>
           <SettingRow textKey="control.email-log" iconName="email" action={emailLog}></SettingRow>

           <ExpansionSection>
               <SettingRow textKey="control.erase-data" iconName="delete-forever" action={eraseUserData}></SettingRow>
               <ControlDataTable controlData={userData}></ControlDataTable>
           </ExpansionSection>
        </>
    );
    };
 
  ProfileSettings.propTypes = {
      settingsScope: object
    }
   
  angularize(ProfileSettings, 'emission.main.control.profileSettings'); 
  export default ProfileSettings;
  