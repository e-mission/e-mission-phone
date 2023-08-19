import React from "react";
import { Modal, Snackbar} from 'react-native-paper';
import { useTranslation } from "react-i18next";

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
  
export default AlertBar;