import React from "react";
import { angularize } from "../angular-react-helper";
import { object } from "prop-types";
import ExpansionSection from "./ExpandMenu";
import SettingRow from "./SettingRow";
import ControlDataTable from "./ControlDataTable";
import DemographicsSettingRow from "./DemographicsSettingRow";

//any pure functions can go outside
const ProfileSettings = ({ settingsScope }) => {
    // anything that mutates must go in --- depend on props or state... 

    // settingsScope is the $scope of general-settings.js
    // grab any variables or functions you need from it like this:
    const { logOut, viewPrivacyPolicy, viewQRCode, userStartStopTracking, 
        fixAppStatus, toggleLowAccuracy, changeCarbonDataset,
        forceSync, share, openDatePicker, uploadLog, emailLog,
        eraseUserData, userData, carbonDatasetString, settings,
        refreshScreen, endForceSync, checkConsent, dummyNotification, 
        invalidateCache, nukeUserCache, showLog, showSensed,
        editCollectionConfig, editSyncConfig, parseState, forceState  } = settingsScope;

    // let opcode = settings.auth.opcode
    function getTracking(){
        if(settings?.collect?.trackingOn){
            return settings.collect.trackingOn;
        }
        else{
            return false;
        }
    }
    function getOpcode(){
        if(settings?.auth?.opcode){
            return settings.auth.opcode;
        }
        else{
            return "ERROR GETTING OPCODE";
        }
    }

    return (
        <>
           <SettingRow textKey={settings?.auth?.opcode} iconName='logout' action={logOut}></SettingRow>
           <DemographicsSettingRow></DemographicsSettingRow>
           <SettingRow textKey='control.view-privacy' iconName='eye' action={viewPrivacyPolicy}></SettingRow>
           <SettingRow textKey="control.view-qrc" iconName="grid" action={viewQRCode}></SettingRow>
           {/* this toggle only kinda works */}
           <SettingRow textKey="control.tracking" action={userStartStopTracking} switchValue={settings?.collect?.trackingOn}></SettingRow>
           <SettingRow textKey="control.app-status" iconName="check" action={fixAppStatus}></SettingRow>
           {/* this switch is also a troublemaker (it's just not fully implemented well yet) */}
           <SettingRow textKey="control.medium-accuracy" action={toggleLowAccuracy} switchValue={settings?.collect?.lowAccuracy}></SettingRow>
           <SettingRow textKey={carbonDatasetString} iconName="database-cog" action={changeCarbonDataset}></SettingRow>
           <SettingRow textKey="control.force-sync" iconName="sync" action={forceSync}></SettingRow>
           <SettingRow textKey="control.share" iconName="share" action={share}></SettingRow>
           <SettingRow textKey="control.download-json-dump" iconName="calendar" action={openDatePicker}></SettingRow>
           {/* this row missing condition!!! Should only show iff ui_config.profile_controls.support_upload == true */}
           <SettingRow textKey="control.upload-log" iconName="cloud" action={uploadLog}></SettingRow>
           <SettingRow textKey="control.email-log" iconName="email" action={emailLog}></SettingRow>

           <ExpansionSection sectionTitle="control.user-data">
               <SettingRow textKey="control.erase-data" iconName="delete-forever" action={eraseUserData}></SettingRow>
               <ControlDataTable controlData={userData}></ControlDataTable>
           </ExpansionSection>

           <ExpansionSection sectionTitle="control.dev-zone">
               <SettingRow textKey="control.refresh" iconName="refresh" action={refreshScreen}></SettingRow>
               <SettingRow textKey="control.end-trip-sync" iconName="sync-alert" action={endForceSync}></SettingRow>
               <SettingRow textKey="control.check-consent" iconName="check" action={checkConsent}></SettingRow>
               <SettingRow textKey="control.dummy-notification" iconName="bell" action={dummyNotification}></SettingRow>
               <SettingRow textKey="control.upcoming-notifications" iconName="bell-check" action={()=>console.log("")}></SettingRow>
               <ControlDataTable controlData={settings?.notification?.scheduledNotifs}></ControlDataTable>
               <SettingRow textKey="control.invalidate-cached-docs" iconName="delete" action={invalidateCache}></SettingRow>
               <SettingRow textKey="control.nuke-all" iconName="delete-forever" action={nukeUserCache}></SettingRow>
               <SettingRow textKey={parseState(settings?.collect?.state)} iconName="pencil" action={forceState}></SettingRow>
               <SettingRow textKey="control.check-log" iconName="arrow-expand-right" action={showLog}></SettingRow>
               <SettingRow textKey="control.check-sensed-data" iconName="arrow-expand-right" action={showSensed}></SettingRow>
               <SettingRow textKey="control.collection" iconName="pencil" action={editCollectionConfig}></SettingRow>
               <ControlDataTable controlData={settings?.collect?.show_config}></ControlDataTable>
               <SettingRow textKey="control.sync" iconName="pencil" action={editSyncConfig}></SettingRow>
               <SettingRow textKey="control.app-version" iconName="application" action={()=>console.log("")}></SettingRow>
               <SettingRow textKey={settings?.clientAppVer} iconName="" action={()=>console.log("")}></SettingRow>
           </ExpansionSection>
        </>
    );
    };
 
  ProfileSettings.propTypes = {
      settingsScope: object
    }
   
  angularize(ProfileSettings, 'ProfileSettings', 'emission.main.control.profileSettings'); 
  export default ProfileSettings;
  