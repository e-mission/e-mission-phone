import React, { useContext, useEffect } from "react";
import { StyleSheet } from "react-native";
import { ActivityIndicator, Button, Surface, Text } from "react-native-paper";
import { registerUserDone, setRegisterUserDone, setSaveQrDone } from "./onboardingHelper";
import { AppContext } from "../App";
import usePermissionStatus from "../usePermissionStatus";
import { getAngularService } from "../angular-react-helper";
import { displayError, logDebug } from "../plugin/logger";

const SaveQrPage = ({  }) => {

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
      <Text>
        {'Save your QR Code'}
      </Text>
      <Button onPress={onFinish}>
        {'Done'}
      </Button>
    </Surface>
  );
}

const s = StyleSheet.create({
  page: {
    flex: 1,
    paddingHorizontal: 15,
  },
});

export default SaveQrPage;
