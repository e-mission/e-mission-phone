import React from "react";
import { Modal, Snackbar} from 'react-native-paper';
import { useTranslation } from "react-i18next";

const AlertBar = ({visible, setVisible, messageKey, messageAddition}) => {
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
      <Modal visible={visible} onDismiss={() => setVisible(false)}>
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
    </Modal>
    );
  };
  
export default AlertBar;