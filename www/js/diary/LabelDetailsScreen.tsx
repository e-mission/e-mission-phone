import React, { useContext } from "react";
import { View } from "react-native";
import { Appbar, Text } from "react-native-paper";
import { LabelTabContext } from "./LabelTab";

const LabelScreenDetails = ({ navigation }) => {

  const {  } = useContext(LabelTabContext);

  return (<>
    <Appbar.Header statusBarHeight={12} elevated={true} style={{ height: 46, backgroundColor: 'white', elevation: 3 }}>
      <Appbar.BackAction onPress={() => { navigation.goBack() }} />
      <Appbar.Content title="Label Details" />
      <Appbar.Action icon="refresh" size={32} onPress={() => {}} />
    </Appbar.Header>
    <View style={{ flex: 1 }}>
      <Text>* Details will go here *</Text>
    </View>
  </>)
}

export default LabelScreenDetails;
