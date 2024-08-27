import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Icon, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import useAppConfig from '../useAppConfig';

const StudySummary = () => {
  const { i18n } = useTranslation();
  const appConfig = useAppConfig();

  const lang = i18n.resolvedLanguage || 'en';
  const templateText = appConfig?.intro?.translated_text[lang];

  return (
    <>
      <Text style={styles.title}>{templateText?.deployment_name}</Text>
      <Text style={styles.studyName}>
        {appConfig?.intro?.deployment_partner_name + ' ' + templateText?.deployment_name}
      </Text>
      <View style={{ display: 'flex', gap: 10 }}>
        {[
          templateText?.summary_line_1,
          templateText?.summary_line_2,
          templateText?.summary_line_3,
        ].map((line, i) =>
          line ? (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Icon source="check" size={24} />
              <Text style={styles.text}>{line}</Text>
            </View>
          ) : null,
        )}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  title: {
    fontWeight: 'bold',
    fontSize: 24,
    paddingBottom: 10,
    textAlign: 'center',
  },
  text: {
    fontSize: 15,
  },
  studyName: {
    fontWeight: 'bold',
    fontSize: 17,
  },
});

export default StudySummary;
