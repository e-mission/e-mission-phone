import React from "react";
import { angularize} from "../angular-react-helper";
import { List } from 'react-native-paper';
import { useTranslation } from "react-i18next";
import { array, func } from "prop-types";
import SettingRow from "./SettingRow";
import ControlDataTable from "./ControlDataTable";

const UserData = ({data, buttonAction}) => {
    const { t } = useTranslation(); //this accesses the translations
    const [expanded, setExpanded] = React.useState(false);

    const handlePress = () => setExpanded(!expanded);

  return (
    <List.Accordion
    title={t("control.user-data")}
    expanded={expanded}
    onPress={handlePress}>
        <SettingRow textKey="control.erase-data" iconName="delete-forever" action={buttonAction}></SettingRow>
        <ControlDataTable controlData={data}></ControlDataTable>
    </List.Accordion>
  );
};
UserData.propTypes = {
    data: array,
    buttonAction: func
}

angularize(UserData, 'emission.main.control.userData'); 
export default UserData;