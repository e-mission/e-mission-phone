import React, { useContext, useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { ActivityIndicator, Button, Surface, Text } from "react-native-paper";
import { registerUserDone, setRegisterUserDone, setSaveQrDone } from "./onboardingHelper";
import { AppContext } from "../App";
import { getAngularService } from "../angular-react-helper";
import { displayError, logDebug } from "../plugin/logger";
import { useTranslation } from "react-i18next";
import QrCode, { shareQR } from "../components/QrCode";
import { onboardingStyles } from "./OnboardingStack";
import { preloadDemoSurveyResponse } from "./SurveyPage";
import { resetDataAndRefresh } from "../config/dynamicConfig";
import i18next from "i18next";

const SaveQrPage = ({  }) => {

  const { t } = useTranslation();
  const { permissionStatus, onboardingState, refreshOnboardingState } = useContext(AppContext);
  const { overallStatus } = permissionStatus;

  useEffect(() => {
    if (overallStatus == true && !registerUserDone) {
      logDebug('permissions done, going to log in');
      login(onboardingState.opcode).then((response) => {
        logDebug('login done, refreshing onboarding state');
        setRegisterUserDone(true);
        preloadDemoSurveyResponse();
        refreshOnboardingState();
      });
    } else {
      logDebug('permissions not done, waiting');
    }
  }, [overallStatus]);

  function login(token) {
    const CommHelper = getAngularService('CommHelper');
    const KVStore = getAngularService('KVStore');
    const EXPECTED_METHOD = "prompted-auth";
    const dbStorageObject = {"token": token};
    logDebug("about to login with token");
    return KVStore.set(EXPECTED_METHOD, dbStorageObject).then((r) => {
      CommHelper.registerUser((successResult) => {
        logDebug("registered user in CommHelper result " + successResult);
        refreshOnboardingState();
      }, function(errorResult) {
        /* if registration fails, we should take the user back to the welcome page
          so they can try again with a valid token */
        displayError(errorResult, i18next.t('errors.registration-check-token'));
        resetDataAndRefresh();
      });
    }).catch((e) => {
      displayError(e, "Sign in error");
    });
  };

  function onFinish() {
    setSaveQrDone(true);
    refreshOnboardingState();
  }

  return (
    <Surface style={onboardingStyles.page}>
      <View style={onboardingStyles.pageSection}>
        <Text variant='headlineSmall' style={{textAlign: 'center'}}>
          {t('login.make-sure-save-your-opcode')}
        </Text>
        <Text variant='bodyMedium' style={{textAlign: 'center'}}>
          {t('login.cannot-retrieve')}
        </Text>
      </View>
      <View style={[onboardingStyles.pageSection, {paddingHorizontal: 20}]}>
        <QrCode value={onboardingState.opcode} style={{marginHorizontal: 8}} />
        <Text style={s.opcodeText}>
          {onboardingState.opcode}
        </Text>
      </View>
      <View style={onboardingStyles.buttonRow}>
        <Button mode='contained' icon='share' onPress={() => shareQR(onboardingState.opcode)}>
          {t('login.save')}
        </Button>
        <Button mode='outlined' icon='chevron-right' onPress={onFinish}>
          {t('login.continue')}
        </Button>
      </View>
    </Surface>
  );
}

const s = StyleSheet.create({
  opcodeText: {
    fontFamily: 'monospace',
    marginVertical: 8,
    maxWidth: '100%',
    wordBreak: 'break-all',
  },
});

export default SaveQrPage;
