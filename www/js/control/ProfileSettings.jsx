import React from "react";
import { angularize} from "../angular-react-helper";
import { List, IconButton, Switch} from 'react-native-paper';
import { useTranslation } from "react-i18next";
import { string, func, bool} from "prop-types";
import ExpansionSection from "./ExpandMenu";
import SettingRow from "./SettingRow";
import ControlDataTable from "./ControlDataTable";


const ProfileSettings = ({ }) => {
    return (
        <>
            {/* <div ng-if="settings.notification.prefReminderTime" class="control-list-item">
                <div class="control-icon-button" style="position: relative">
                    <i class="ion-clock"></i>
                    <input type="time" name="timeOfDay" value="{{settings.notification.prefReminderTimeOnLoad}}"
                    ng-model="settings.notification.prefReminderTimeVal" ng-change="updatePrefReminderTime()" ng-blur="updatePrefReminderTime()"
                    style="position: absolute; height: 100%; inset: 0; display: flex; opacity: 0;"></input>
                </div>
            </div> */}
            <enketo-demographics-button></enketo-demographics-button>
            <SettingRow textKey="control.view-privacy" iconName="'eye'" action = "viewPrivacyPolicy" isToggle="False"></SettingRow>
        </>
    );
  };
 
  ProfileSettings.propTypes = {
      
    }
   
  angularize(ProfileSettings, 'emission.main.control.profileSettings'); 
  export default ProfileSettings;
  