import React, { useContext, useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { ActivityIndicator, Button, Surface, Text } from "react-native-paper";
import { registerUserDone, setRegisterUserDone, setSaveQrDone } from "./onboardingHelper";
import { AppContext } from "../App";
import usePermissionStatus from "../usePermissionStatus";
import { getAngularService } from "../angular-react-helper";
import { displayError, logDebug } from "../plugin/logger";
import { useTranslation } from "react-i18next";
import QrCode, { shareQR } from "../components/QrCode";

const SaveQrPage = ({  }) => {

  const { t } = useTranslation();
  const { pendingOnboardingState, refreshOnboardingState } = useContext(AppContext);
  const { overallStatus } = usePermissionStatus();

  useEffect(() => {
    if (overallStatus == true && !registerUserDone) {
      logDebug('permissions done, going to log in');
      login(pendingOnboardingState.opcode).then((response) => {
        logDebug('login done, refreshing onboarding state');
        setRegisterUserDone(true);
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
    return KVStore.set(EXPECTED_METHOD, dbStorageObject).then((r) => {
      CommHelper.registerUser((successResult) => {
        refreshOnboardingState();
      }, function(errorResult) {
        displayError(errorResult, "User registration error");
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
    <Surface style={s.page}>
      <View style={s.pageSection}>
        <Text variant='headlineSmall'> {t('login.make-sure-save-your-opcode')} </Text>
        <Text variant='bodyMedium'> {t('login.cannot-retrieve')} </Text>
      </View>
      <View style={s.pageSection}>
        <QrCode value={pendingOnboardingState.opcode} style={{marginHorizontal: 8}} />
        <Text style={{fontFamily: 'monospace', marginVertical: 8}}> {pendingOnboardingState.opcode} </Text>
      </View>
      <View style={[s.pageSection, {flexDirection: 'row', justifyContent: 'center', gap: 8}]}>
        <Button mode='contained' icon='share' onPress={() => shareQR(pendingOnboardingState.opcode)}>
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
  page: {
    flex: 1,
    paddingHorizontal: 15,
    paddingVertical: 20,
  },
  pageSection: {
    marginVertical: 15,
    alignItems: 'center',
  }
});

export default SaveQrPage;
