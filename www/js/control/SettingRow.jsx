import React from "react";
import { angularize} from "../angular-react-helper";
import { List, IconButton, Switch} from 'react-native-paper';
import { useTranslation } from "react-i18next";
import { string, func, bool} from "prop-types";

const ToggleSwitch = ({onSwitch, getVal}) => {
    // const startResult = getVal();
    const [isSwitchOn, setIsSwitchOn] = React.useState(true);
  
    const onToggleSwitch = function() {
        onSwitch();
        setIsSwitchOn(!isSwitchOn);
    };
  
    return <Switch value={isSwitchOn} onValueChange={onToggleSwitch} />;
};
ToggleSwitch.propTypes = {
    onSwitch: func,
    startVal: func
}

const SettingRow = ({textKey, iconName, action, isToggle, toggleVal}) => {
    const { t } = useTranslation(); //this accesses the translations
    if(!isToggle)
    {
        return (
            <List.Item
            title={t(textKey)}
            onPress={() => console.log("empty")}
            right={() => (
                <IconButton
                icon={iconName}
                onPress={(e) => action(e)}
                />
            )}
            />
        );
    }
   else{
        return (
            <List.Item
            title={t(textKey)}
            onPress={() => console.log("empty")}
            right={() => (
                <ToggleSwitch
                onSwitch={action}
                getVal={toggleVal}
                />
            )}
            />
        );
    }
};
SettingRow.propTypes = {
    textKey: string,
    iconName: string,
    action: func,
    isToggle: bool,
    toggleVal: func
}

angularize(SettingRow, 'emission.main.control.settingRow'); 
export default SettingRow;