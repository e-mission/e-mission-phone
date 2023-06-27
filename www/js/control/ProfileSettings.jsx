import React from "react";
import { angularize, getAngularService, createScopeWithVars } from "../angular-react-helper";
import { List, IconButton, Switch} from 'react-native-paper';
import { useTranslation } from "react-i18next";
import { object } from "prop-types";
import ExpansionSection from "./ExpandMenu";
import SettingRow from "./SettingRow";
import ControlDataTable from "./ControlDataTable";

const ProfileSettings = ({tempFuncBundle}) => {

    return (
        <>
           <SettingRow textKey={tempFuncBundle.opcode} iconName='logout' action={tempFuncBundle.logOut}></SettingRow>
           <SettingRow textKey='control.view-privacy' iconName='eye' action={tempFuncBundle.viewPrivacyPolicy}></SettingRow>
           <SettingRow textKey="control.view-qrc" iconName="grid" action={tempFuncBundle.viewQRCode}></SettingRow>
           {/* this toggle only kinda works */}
           <SettingRow textKey="control.tracking" action={tempFuncBundle.userStartStopTracking} isToggle={true}></SettingRow>
           <SettingRow textKey="control.app-status" iconName="check" action={tempFuncBundle.fixAppStatus}></SettingRow>
           {/* this switch is also a troublemaker (it's just not fully implemented well yet) */}
           <SettingRow textKey="control.medium-accuracy" action={tempFuncBundle.toggleLowAccuracy} isToggle={true}></SettingRow>
           <SettingRow textKey={tempFuncBundle.carbonString} iconName="database-cog" action={tempFuncBundle.changeCarbonDataset}></SettingRow>
           <SettingRow textKey="control.force-sync" iconName="sync" action={tempFuncBundle.forceSync}></SettingRow>
           <SettingRow textKey="control.share" iconName="share" action={tempFuncBundle.share}></SettingRow>
           <SettingRow textKey="control.download-json-dump" iconName="calendar" action={tempFuncBundle.openDatePicker}></SettingRow>
           {/* this row missing condition!!! Should only show iff ui_config.profile_controls.support_upload == true */}
           <SettingRow textKey="control.upload-log" iconName="cloud" action={tempFuncBundle.uploadLog}></SettingRow>
           <SettingRow textKey="control.email-log" iconName="email" action={tempFuncBundle.emailLog}></SettingRow>
        </>
    );
    };
 
  ProfileSettings.propTypes = {
      tempFuncBundle: object
    }
   
  angularize(ProfileSettings, 'emission.main.control.profileSettings'); 
  export default ProfileSettings;
  