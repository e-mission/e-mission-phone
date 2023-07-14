import React from "react";
import { angularize} from "../angular-react-helper";
import { StyleSheet } from 'react-native';
import { List, useTheme } from 'react-native-paper';
import { useTranslation } from "react-i18next";
import { string } from "prop-types";

const ExpansionSection = (props) => {
    const { t } = useTranslation(); //this accesses the translations
    const { colors } = useTheme(); // use this to get the theme colors instead of hardcoded #hex colors
    const [expanded, setExpanded] = React.useState(false);

    const handlePress = () => setExpanded(!expanded);

  return (
    <List.Accordion
      style={styles.section(colors.surface)}
      title={t(props.sectionTitle)}
      titleStyle={styles.title}
      expanded={expanded}
      onPress={handlePress}>
        {props.children}
    </List.Accordion>
  );
};
const styles = StyleSheet.create({
  section: (surfaceColor) => ({
      justifyContent: 'space-between',
      backgroundColor: surfaceColor,
      margin: 1,
  }),
  title: {
      fontSize: 16,
      marginVertical: 2,
  },
});
ExpansionSection.propTypes = {
    sectionTitle: string
}

angularize(ExpansionSection, 'ExpansionSection', 'emission.main.control.expansionSection'); 
export default ExpansionSection;
