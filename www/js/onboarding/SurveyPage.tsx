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

let preloadedResponsePromise: Promise<any> = null;
export const preloadDemoSurveyResponse = () => {
  if (!preloadedResponsePromise) {
    preloadedResponsePromise = loadPreviousResponseForSurvey(DEMOGRAPHIC_SURVEY_DATAKEY);
  }
  return preloadedResponsePromise;
}

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
    /* If we came from the SaveQrPage, we should have already initiated loading the previous survey
      response from there, and preloadDemographicsSurvey() will just return the promise that was
      already started.
      Otherwise, it will start a new promise. Either way, we wait for it to finish before proceeding. */
    preloadDemoSurveyResponse().then((lastSurvey) => {
      if (lastSurvey?.data?.xmlResponse) {
        setPrevSurveyResponse(lastSurvey.data.xmlResponse);
      } else {
        // if there is no prev response, we show the blank survey to be filled out for the first time
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
        /* If there is no prev response, we need an initial response from the user and should
          not allow them to dismiss the modal by the "<- Dismiss" button */
        undismissable: !prevSurveyResponse,
        prefilledSurveyResponse: prevSurveyResponse,
        dataKey: DEMOGRAPHIC_SURVEY_DATAKEY,
      }} />
  </>);
};

export default SurveyPage;
