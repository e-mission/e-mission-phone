import React from "react";
import { angularize} from "../angular-react-helper";
import { List } from 'react-native-paper';
import { useTranslation } from "react-i18next";
import { array, string } from "prop-types";
import SettingRow from "./SettingRow";
import ControlDataTable from "./ControlDataTable";

/* hoping for a dropdown that is parameterized
some sort of object passed in that dicates everything
each "thing" in the list will either be a dataTable
or a settingRow
and needs to be handled accordingly */

/*
    {type: row/table
     data: []
     titleKey: ''
     action: function
     iconName: ''
     isToggle: bool}
*/

//any pure functions can go outside

const ExpansionSection = (props) => {
    const { t } = useTranslation(); //this accesses the translations
    const [expanded, setExpanded] = React.useState(false);

    const handlePress = () => setExpanded(!expanded);

    // anything that mutates must go in --- depend on props or state...

  return (
    <List.Accordion
    title={t(props.sectionTitle)}
    expanded={expanded}
    onPress={handlePress}>
        {props.children}
    </List.Accordion>
  );
};
ExpansionSection.propTypes = {
    sectionContents: array,
    sectionTitle: string
}

angularize(ExpansionSection, 'emission.main.control.expansionSection'); 
export default ExpansionSection;