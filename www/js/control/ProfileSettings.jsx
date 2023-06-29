import React from "react";
import { angularize, getAngularService } from "../angular-react-helper";
import { object } from "prop-types";
import { useTranslation } from "react-i18next";
import ExpansionSection from "./ExpandMenu";
import SettingRow from "./SettingRow";
import ControlDataTable from "./ControlDataTable";
import DemographicsSettingRow from "./DemographicsSettingRow";

//any pure functions can go outside
const ProfileSettings = ({ settingsScope, settingsObject }) => {
    // anything that mutates must go in --- depend on props or state... 
    const { t } = useTranslation(); 

    // settingsScope is the $scope of general-settings.js
    // grab any variables or functions you need from it like this:


    //why is settings not defined but everything else is fine?
    const { logOut, viewPrivacyPolicy, viewQRCode, 
        fixAppStatus, changeCarbonDataset, userDataSaved,
        forceSync, share, openDatePicker,
        eraseUserData, userData,
        refreshScreen, endForceSync, checkConsent, dummyNotification, 
        invalidateCache, nukeUserCache, showLog, showSensed,
         parseState, } = settingsScope;

    console.log("settings?", settingsObject);
    let settings = settingsObject;
    console.log("settings", settings);
    
    const CarbonDatasetHelper = getAngularService('CarbonDatasetHelper');
    const UploadHelper = getAngularService('UploadHelper');
    const EmailHelper = getAngularService('EmailHelper');
    const ControlCollectionHelper = getAngularService('ControlCollectionHelper');
    const ControlSyncHelper = getAngularService('ControlSyncHelper');

    let carbonDatasetString = t('general-settings.carbon-dataset') + ": " + CarbonDatasetHelper.getCurrentCarbonDatasetCode();

    const uploadLog = function () {
        UploadHelper.uploadFile("loggerDB")
    };

    const emailLog = function () {
        // Passing true, we want to send logs
        EmailHelper.sendEmail("loggerDB")
    };

    const userStartStopTracking = function() {
        //note the dependency on the settings object (still passed in)
        if (settings.collect.trackingOn){
            return ControlCollectionHelper.forceTransition('STOP_TRACKING');
        } else {
            return ControlCollectionHelper.forceTransition('START_TRACKING');
        }
    }

    const forceState = ControlCollectionHelper.forceState;
    const editCollectionConfig = ControlCollectionHelper.editConfig;
    const editSyncConfig = ControlSyncHelper.editConfig;
    const toggleLowAccuracy = function() {
        console.log("change attempt in ProfileSettigns");
        //the function below is very broken!!
        ControlCollectionHelper.toggleLowAccuracy();
        settings.collect.lowAccuracy = ControlCollectionHelper.isMediumAccuracy();
    }

    let userDataSection;
    if(userDataSaved())
    {
        userDataSection = <ExpansionSection sectionTitle="control.user-data">
                            <SettingRow textKey="control.erase-data" iconName="delete-forever" action={eraseUserData}></SettingRow>
                            <ControlDataTable controlData={userData}></ControlDataTable>
                        </ExpansionSection>;
    }

    return (
        <>
           <SettingRow textKey="control.profile" iconName='logout' action={logOut} desc={settings?.auth?.opcode}></SettingRow>
           <DemographicsSettingRow></DemographicsSettingRow>
           <SettingRow textKey='control.view-privacy' iconName='eye' action={viewPrivacyPolicy}></SettingRow>
           <SettingRow textKey="control.view-qrc" iconName="grid" action={viewQRCode}></SettingRow>
           {/* this toggle only kinda works */}
           <SettingRow textKey="control.tracking" action={userStartStopTracking} switchValue={settings?.collect?.trackingOn}></SettingRow>
           <SettingRow textKey="control.app-status" iconName="check" action={fixAppStatus}></SettingRow>
           {/* this switch is also fussy */}
           <SettingRow textKey="control.medium-accuracy" action={toggleLowAccuracy} switchValue={settings?.collect?.lowAccuracy}></SettingRow>
           <SettingRow textKey={carbonDatasetString} iconName="database-cog" action={changeCarbonDataset}></SettingRow>
           <SettingRow textKey="control.force-sync" iconName="sync" action={forceSync}></SettingRow>
           <SettingRow textKey="control.share" iconName="share" action={share}></SettingRow>
           <SettingRow textKey="control.download-json-dump" iconName="calendar" action={openDatePicker}></SettingRow>
           {/* this row missing condition!!! Should only show iff ui_config.profile_controls.support_upload == true */}
           <SettingRow textKey="control.upload-log" iconName="cloud" action={uploadLog}></SettingRow>
           <SettingRow textKey="control.email-log" iconName="email" action={emailLog}></SettingRow>

            {userDataSection}
           
           <ExpansionSection sectionTitle="control.dev-zone">
               <SettingRow textKey="control.refresh" iconName="refresh" action={refreshScreen}></SettingRow>
               <SettingRow textKey="control.end-trip-sync" iconName="sync-alert" action={endForceSync}></SettingRow>
               <SettingRow textKey="control.check-consent" iconName="check" action={checkConsent}></SettingRow>
               <SettingRow textKey="control.dummy-notification" iconName="bell" action={dummyNotification}></SettingRow>
               {/* upcoming notifications seem to be undefined at time of render :( */}
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
               <ControlDataTable controlData={settings?.sync?.show_config}></ControlDataTable>
               <SettingRow textKey="control.app-version" iconName="application" action={()=>console.log("")} desc={settings?.clientAppVer}></SettingRow>
           </ExpansionSection>
        </>
    );
    };
  ProfileSettings.propTypes = {
      settingsScope: object,
      settingsObject: object
    }
   
  angularize(ProfileSettings, 'ProfileSettings', 'emission.main.control.profileSettings'); 
  export default ProfileSettings;
  