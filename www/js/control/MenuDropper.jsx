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


const ExpansionSection = ({sectionTitle, sectionContents}) => {
    const { t } = useTranslation(); //this accesses the translations
    const [expanded, setExpanded] = React.useState(false);

    const handlePress = () => setExpanded(!expanded);

  return (
    <List.Accordion
    title={t(sectionTitle)}
    expanded={expanded}
    onPress={handlePress}>
        {sectionContents?.map((item) =>
            {
                if(item.type == "row")
                {
                    return (<SettingRow key={item.textKey} textKey={item.textKey} iconName={item.iconName} action={item.action} isToggle={item.isToggle}></SettingRow> );
                }
                else
                {
                    return (<ControlDataTable controlData={item.data}></ControlDataTable>)
                }
            }
      )}
    </List.Accordion>
  );
};
ExpansionSection.propTypes = {
    sectionContents: array,
    sectionTitle: string
}

angularize(ExpansionSection, 'emission.main.control.expansionSection'); 
export default ExpansionSection;