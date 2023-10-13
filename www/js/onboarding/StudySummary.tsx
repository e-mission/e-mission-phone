import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "react-native-paper";
import { useTranslation } from "react-i18next";
import useAppConfig from "../useAppConfig";

export function getTemplateText(configObject, lang) {
  if (configObject && (configObject.name)) {
    return configObject.intro.translated_text[lang];
  }
}

const StudySummary = () => {

  const { i18n } = useTranslation();
  const appConfig = useAppConfig();

  const templateText = useMemo(() => getTemplateText(appConfig, i18n.language), [appConfig]);

  return (<>
    <Text style={styles.title}>{templateText?.deployment_name}</Text>
    <Text style={styles.studyName}>{appConfig?.intro?.deployment_partner_name + " " + templateText?.deployment_name}</Text>
    <View>
      <Text style={styles.text}>{"✔️  " + templateText?.summary_line_1} </Text>
      <Text style={styles.text}>{"✔️  " + templateText?.summary_line_2} </Text>
      <Text style={styles.text}>{"✔️  " + templateText?.summary_line_3} </Text>
    </View>
  </>)
};

const styles = StyleSheet.create({
  title: {
    fontWeight: "bold",
    fontSize: 22,
    paddingBottom: 10,
    textAlign: "center"
  },
  text: {
    fontSize: 14,
  },
  studyName: {
    fontWeight: "bold",
    fontSize: 16
  },
});

export default StudySummary;
