import React from "react";
import { angularize } from "../angular-react-helper";
import { List } from 'react-native-paper';
import { useTranslation } from "react-i18next";
import { string, func} from "prop-types";

const SettingRow = ({textKey, iconName}) => {
    const { t } = useTranslation(); //this accesses the translations
    // console.log("row created!!!!!", "translate hard-code" + t('general-settings.are-you-sure') + "translate via param" + t(textKey)+ " and the icon (plain string) " + iconName);
    
    return (
       <List.Item
       title = {t(textKey)}
       description = {iconName}
       ></List.Item>
    );
};
SettingRow.propTypes = {
    textKey: string,
    iconName: string
}

/*
tinkered with the idea of a mapped solution, but didn't get any further
*/

// const dummyData = [{textKey: "control.view-privacy", actionFcn:"viewPrivacyPolicy($event)", iconName: "eye"}]

// const SettingList = ({settingParams}) => {
//     <List>
//     {settingParams.map((setting) =>
//         {
//             return (<SettingRow 
//             textKey={setting.textKey}
//             actionFcn={setting.actionFcn}
//             iconName={setting.iconName}>
//             </SettingRow>);
//         })
//     }
//     </List>
// };
// SettingList.propTypes = {
//     settingParams: array
// }

angularize(SettingRow, 'emission.main.control.settingRow'); 
export default SettingRow;