import React, { useContext } from "react";
import { AppContext } from "../app";
import { Button, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

const OnboardingStack = () => {
  const { setFinishedOnboarding } = useContext(AppContext);

  return (
    <SafeAreaView>
      <Text style={{textAlign: 'center'}}>(Onboarding Placeholder)</Text>
      <Button onPress={() => setFinishedOnboarding(true)}>Mark Onboarding Finished</Button>
    </SafeAreaView>
   );
}

export default OnboardingStack
