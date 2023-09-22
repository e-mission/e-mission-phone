import React, { useContext } from "react";
import { StyleSheet } from "react-native";
import { ActivityIndicator, Button, Surface, Text } from "react-native-paper";
import { setSaveQrDone } from "./onboardingHelper";
import { AppContext } from "../App";

const SaveQrPage = ({  }) => {

  const { refreshOnboardingState } = useContext(AppContext);

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
