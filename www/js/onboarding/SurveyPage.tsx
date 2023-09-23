import React, { useState, useEffect, useContext, useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { ActivityIndicator, Button, Surface, Text } from "react-native-paper";
import EnketoModal from "../survey/enketo/EnketoModal";
import { DEMOGRAPHIC_SURVEY_DATAKEY, DEMOGRAPHIC_SURVEY_NAME } from "../control/DemographicsSettingRow";
import { loadPreviousResponseForSurvey } from "../survey/enketo/enketoHelper";
import { AppContext } from "../App";
import { markIntroDone } from "./onboardingHelper";
import { useTranslation } from "react-i18next";
import { DateTime } from "luxon";
import { onboardingStyles } from "./OnboardingStack";

const SurveyPage = () => {

  const { t } = useTranslation();
  const { refreshOnboardingState } = useContext(AppContext);
  const [surveyModalVisible, setSurveyModalVisible] = useState(false);
  const [prevSurveyResponse, setPrevSurveyResponse] = useState(null);
  const prevSurveyResponseDate = useMemo(() => {
    if (prevSurveyResponse) {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(prevSurveyResponse, "text/xml");
      const surveyEndDt = xmlDoc.querySelector('end')?.textContent; // ISO datetime of survey completion
      return DateTime.fromISO(surveyEndDt).toLocaleString(DateTime.DATE_FULL);
    }
  }, [prevSurveyResponse]);

  useEffect(() => {
    loadPreviousResponseForSurvey(DEMOGRAPHIC_SURVEY_DATAKEY).then((lastSurvey) => {
      if (lastSurvey?.data?.xmlResponse) {
        setPrevSurveyResponse(lastSurvey.data.xmlResponse);
      } else {
        setSurveyModalVisible(true);
      }
    });
  }, []);

  function onFinish() {
    setSurveyModalVisible(false);
    markIntroDone();
    refreshOnboardingState();
  }

  return (<>
    <Surface style={onboardingStyles.page}>
      {prevSurveyResponse ?
        <View style={{margin: 'auto'}}>
          <View style={{marginBottom: 20}}>
            <Text variant='bodyLarge' style={{fontWeight: '500'}}> {t('survey.prev-survey-found')} </Text>
            <Text> {prevSurveyResponseDate} </Text>
          </View>
          <View style={onboardingStyles.buttonRow}>
            <Button mode='contained' icon='pencil' onPress={() => setSurveyModalVisible(true)}>
              {t('survey.edit-response')}
            </Button>
            <Button mode='outlined' icon='chevron-right' onPress={onFinish}>
              {t('survey.use-prior-response')}
            </Button>
          </View>
        </View>
      : 
        <View style={{margin: 'auto'}}>
          <ActivityIndicator size='large' animating={true} />
          <Text style={{textAlign: 'center'}}>
            {t('survey.loading-prior-survey')}
          </Text>
        </View>
      }
    </Surface>
    <EnketoModal visible={surveyModalVisible} onDismiss={() => setSurveyModalVisible(false)}
      onResponseSaved={onFinish} surveyName={DEMOGRAPHIC_SURVEY_NAME}
      opts={{
        prefilledSurveyResponse: prevSurveyResponse,
        dataKey: DEMOGRAPHIC_SURVEY_DATAKEY,
      }} />
  </>);
};

export default SurveyPage;
