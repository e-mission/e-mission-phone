import React from "react";
import { angularize} from "../angular-react-helper";
import { List, IconButton} from 'react-native-paper';
import { useTranslation } from "react-i18next";
import { string, func} from "prop-types";

const SettingRow = ({textKey, iconName, action}) => {
    const { t } = useTranslation(); //this accesses the translations

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
};
SettingRow.propTypes = {
    textKey: string,
    iconName: string,
    action: func
}

angularize(SettingRow, 'emission.main.control.settingRow'); 
export default SettingRow;