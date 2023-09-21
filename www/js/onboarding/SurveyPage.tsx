import React, { useState, useEffect, useContext } from "react";
import { StyleSheet } from "react-native";
import { ActivityIndicator, Button, Surface, Text } from "react-native-paper";
import EnketoModal from "../survey/enketo/EnketoModal";
import { DEMOGRAPHIC_SURVEY_DATAKEY, DEMOGRAPHIC_SURVEY_NAME } from "../control/DemographicsSettingRow";
import { loadPreviousResponseForSurvey } from "../survey/enketo/enketoHelper";
import { AppContext } from "../App";
import { markIntroDone } from "./onboardingHelper";

const SurveyPage = () => {

  const { refreshOnboardingState } = useContext(AppContext);
  const [surveyModalVisible, setSurveyModalVisible] = useState(false);
  const [prevSurveyResponse, setPrevSurveyResponse] = useState(null);

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
    <Surface style={s.page}>
      {prevSurveyResponse ? <>
        <Text>
          {'Found previous survey response. Edit?'}
        </Text>
        <Button onPress={() => setSurveyModalVisible(true)}>
          {'Edit'}
        </Button>
        <Button onPress={onFinish}>
          {'Skip'}
        </Button>
      </>
      :
        <ActivityIndicator animating={true} />
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

const s = StyleSheet.create({
  page: {
    flex: 1,
    paddingHorizontal: 15,
  },
});

export default SurveyPage;
