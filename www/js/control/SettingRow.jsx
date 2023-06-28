import React from "react";
import { angularize} from "../angular-react-helper";
import { List, IconButton, Switch} from 'react-native-paper';
import { useTranslation } from "react-i18next";
import { string, func, bool} from "prop-types";

// const ToggleSwitch = ({onSwitch, switchVal}) => {
//     // const startResult = getVal();
//     const [isSwitchOn, setIsSwitchOn] = React.useState(true);
  
//     const onToggleSwitch = function() {
//         onSwitch();
//         setIsSwitchOn(!isSwitchOn);
//     };
  
//     return <Switch value={isSwitchOn} onValueChange={onToggleSwitch} />;
// };
// ToggleSwitch.propTypes = {
//     onSwitch: func,
//     startVal: func
// }

const SettingRow = ({textKey, iconName, action, switchValue}) => {
    const { t } = useTranslation(); //this accesses the translations

    let rightComponent;
    // will using switchValue here only render when the value is true?
    if (switchValue) {
        rightComponent = <Switch value={switchValue} onValueChange={(e) => action(e)}/>;
    } else {
        rightComponent = <IconButton icon={iconName} onPress={(e) => action(e)} />;
    }

    return (
        <List.Item
        title={t(textKey)}
        onPress={() => console.log("empty")}
        right={() => rightComponent}
        />
    );
};
SettingRow.propTypes = {
    textKey: string,
    iconName: string,
    action: func,
    switchValue: bool
}

angularize(SettingRow, 'emission.main.control.settingRow'); 
export default SettingRow;