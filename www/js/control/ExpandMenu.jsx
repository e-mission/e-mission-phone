import React from "react";
import { angularize} from "../angular-react-helper";
import { List } from 'react-native-paper';
import { useTranslation } from "react-i18next";
import { array, string } from "prop-types";

const ExpansionSection = (props) => {
    const { t } = useTranslation(); //this accesses the translations
    const [expanded, setExpanded] = React.useState(false);

    const handlePress = () => setExpanded(!expanded);

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
    sectionTitle: string
}

angularize(ExpansionSection, 'ExpansionSection', 'emission.main.control.expansionSection'); 
export default ExpansionSection;