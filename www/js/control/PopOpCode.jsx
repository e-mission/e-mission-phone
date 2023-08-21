import React from "react";
import { Modal, StyleSheet } from 'react-native';
import { Button, Text, IconButton, Dialog, useTheme } from 'react-native-paper';
import { useTranslation } from "react-i18next";
import QrCode from "../components/QrCode";

const PopOpCode = ({visibilityValue, tokenURL, action, setVis}) => {
    const { t } = useTranslation(); 
    const { colors } = useTheme();

    const opcodeList = tokenURL.split("=");
    const opcode = opcodeList[opcodeList.length - 1];
    console.log("is this an opcode", opcodeList, opcode);
    
    return (
        <Modal visible={visibilityValue} onDismiss={() => setVis(false)}
        transparent={true}>
            <Dialog visible={visibilityValue} 
            onDismiss={() => setVis(false)}
            style={styles.dialog(colors.elevation.level3)}>
                <Dialog.Title>{t("general-settings.qrcode")}</Dialog.Title>
                <Dialog.Content style={styles.content}>
                    <Text style={styles.opcode}>{opcode}</Text>
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
    },
    opcode: {
        fontWeight: 'bold'
    }
  });

export default PopOpCode;