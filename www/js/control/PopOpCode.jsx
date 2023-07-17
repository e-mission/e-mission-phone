import React from "react";
import { angularize} from "../angular-react-helper";
import { Modal, StyleSheet } from 'react-native';
import { Button, Text, IconButton, Dialog, useTheme } from 'react-native-paper';
import { useTranslation } from "react-i18next";
import { bool, string, func } from "prop-types";
import QrCode from "../components/QrCode";

const PopOpCode = ({visibilityValue, tokenURL, action, setVis}) => {
    const { t } = useTranslation(); 
    const { colors } = useTheme();
    
    return (
        <Modal visible={visibilityValue} onDismiss={() => setVis(false)}
        transparent={true}>
            <Dialog visible={visibilityValue} 
            onDismiss={() => setVis(false)}
            style={styles.dialog(colors.elevation.level3)}>
                <Dialog.Title>{t("general-settings.qrcode")}</Dialog.Title>
                <Dialog.Content style={styles.content}>
                    <QrCode value={tokenURL}></QrCode>
                    <Text>{t("general-settings.qrcode-share-title")}</Text>
                    <IconButton icon="share" onPress={() => action()} style={styles.button}/>
                </Dialog.Content>
                <Dialog.Actions>
                    <Button onPress={() => setVis(false)}>{t('general-settings.cancel')}</Button>
                </Dialog.Actions>
            </Dialog>
        </Modal>
    )
}
const styles = StyleSheet.create({
    dialog: (surfaceColor) => ({
        backgroundColor: surfaceColor,
        margin: 1,
    }),
    title:
    {
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        alignItems: 'center',
        justifyContent: 'center', 
    },
    button: {
        margin: 'auto',
    }
  });
PopOpCode.prototypes = {
    visibilityValue: bool,
    tokenURL: string,
    action: func,
    setVis: func
}

angularize(PopOpCode, '"popOpCode"', 'emission.main.control.popOpCode'); 
export default PopOpCode;