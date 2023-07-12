import React from "react";
import { angularize} from "../angular-react-helper";
import { Modal } from 'react-native';
import { Text, IconButton, Dialog } from 'react-native-paper';
import { useTranslation } from "react-i18next";
import { bool, string, func } from "prop-types";
import QrCode from "../components/QrCode";

const PopOpCode = ({visibilityValue, tokenURL, action, setVis}) => {
    const { t } = useTranslation(); 
    
    return (
        <Modal visible={visibilityValue} onDismiss={() => setVis(false)}
        elevated={true}
        style={{ elevation: 3 }}
        transparent={true}>
            <Dialog visible={visibilityValue} onDismiss={() => setVis(false)}>
                <Dialog.Title>{t("general-settings.qrcode")}</Dialog.Title>
                <Dialog.Content>
                    <QrCode value={tokenURL}></QrCode>
                    <Text>{t("general-settings.qrcode-share-title")}</Text>
                    <IconButton icon="share" onPress={() => action()}/>
                </Dialog.Content>
            </Dialog>
        </Modal>
    )
}
PopOpCode.prototypes = {
    visibilityValue: bool,
    tokenURL: string,
    action: func,
    setVis: func
}

angularize(PopOpCode, '"popOpCode"', 'emission.main.control.popOpCode'); 
export default PopOpCode;