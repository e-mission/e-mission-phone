import React from "react";
import { angularize } from "../angular-react-helper";
import { Text } from 'react-native-paper';
import { useTranslation } from "react-i18next";
import { string, func, object} from "prop-types";

/*
biggest struggle here is how to pass i18n keys as parameters (or strings in general)
*/

const SettingRow = ({textKey, iconName}) => {
    const { t } = useTranslation(); //this accesses the translations
    console.log("row created!!!!!", "translate hard-code" + t('general-settings.are-you-sure') + "translate via param" + t(textKey)+ " and the icon (plain string) " + iconName);
    //from the above print statement the textKey is "0" and iconName is "undefined" but the hard-coded translation key works great!
    return (
        <Text variant="headlineSmall">
        {"translated text" + t(textKey)} 
        </Text>
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