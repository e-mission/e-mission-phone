import React from "react";
import { Modal,  useWindowDimensions } from "react-native";
import { Dialog, useTheme, Button } from 'react-native-paper';
import { useTranslation } from "react-i18next";
import PrivacyPolicy from "../join/PrivacyPolicy";

const PrivacyPolicyModal = ({ privacyVis, setPrivacyVis, dialogStyle }) => {
    const { height: windowHeight } = useWindowDimensions();
    const { t } = useTranslation();

    return (
        <>
            <Modal visible={privacyVis} onDismiss={() => setPrivacyVis(false)} transparent={true}>
                <Dialog visible={privacyVis} 
                        onDismiss={() => setPrivacyVis(false)} 
                        style={dialogStyle}>
                    <Dialog.Content style={{maxHeight: windowHeight/1.5, paddingBottom: 0}}>
                        <PrivacyPolicy></PrivacyPolicy>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setPrivacyVis(false)}>
                            {t('join.close')}
                        </Button>
                    </Dialog.Actions>
                </Dialog>
            </Modal>
        </>
    )
}

export default PrivacyPolicyModal;