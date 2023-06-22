import React from "react";
import { angularize} from "../angular-react-helper";
import { List } from 'react-native-paper';
import { useTranslation } from "react-i18next";
import { string, func, object} from "prop-types";

const SettingRow = ({textKey, iconName, action}) => {
    const { t } = useTranslation(); //this accesses the translations

    function clickTest()
    {
        console.log("pressed");
        {action()};
    }
    return (
       <List.Item
       title = {t(textKey)}
       description = {iconName}
       onPress = {clickTest}
       >
       </List.Item>
    );
};
SettingRow.propTypes = {
    textKey: string,
    iconName: string,
    action: func
}

angularize(SettingRow, 'emission.main.control.settingRow'); 
export default SettingRow;