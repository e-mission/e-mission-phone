import React from "react";
import { angularize} from "../angular-react-helper";
import { StyleSheet } from 'react-native';
import { Modal, Snackbar} from 'react-native-paper';
import { useTranslation } from "react-i18next";
import { string, func, bool} from "prop-types";

const AlertBar = ({visible, setVisible, messageKey}) => {
    const { t } = useTranslation(); 
    const onDismissSnackBar = () => setVisible(false);
  
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
          {t(messageKey)}
        </Snackbar>
    </Modal>
    );
  };
AlertBar.prototypes = {
    visible: bool,
    setVisible: func,
    messageKey: string
}
  
export default AlertBar;