import React from "react";
import { Modal } from "react-native";
import { Snackbar } from 'react-native-paper';
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";

const AlertBar = ({visible, setVisible, messageKey, messageAddition=undefined}) => {
    const { t } = useTranslation(); 
    const onDismissSnackBar = () => setVisible(false);

    let text = "";
    if(messageAddition){
      text = t(messageKey) + messageAddition;
    }
    else {
      text = t(messageKey);
    }
  
    return (
      <Modal visible={visible} onDismiss={() => setVisible(false)} transparent={true}>
        <SafeAreaView style={{flex: 1}}>
          <Snackbar
            visible={visible}
            onDismiss={onDismissSnackBar}
            action={{
              label: t("join.close"),
              onPress: () => {
                onDismissSnackBar()
              },
          }}>
            {text}
          </Snackbar>
        </SafeAreaView>
    </Modal>
    );
  };
  
export default AlertBar;