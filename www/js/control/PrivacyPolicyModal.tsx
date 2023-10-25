import React from "react";
import { Modal,  useWindowDimensions, ScrollView } from "react-native";
import { Dialog, Button, useTheme } from 'react-native-paper';
import { useTranslation } from "react-i18next";
import PrivacyPolicy from "../onboarding/PrivacyPolicy";
import { settingStyles } from "./ProfileSettings";

const PrivacyPolicyModal = ({ privacyVis, setPrivacyVis }) => {
    const { height: windowHeight } = useWindowDimensions();
    const { t } = useTranslation();
    const { colors } = useTheme();

    return (
        <>
            <Modal visible={privacyVis} onDismiss={() => setPrivacyVis(false)} transparent={true}>
                <Dialog visible={privacyVis} 
                        onDismiss={() => setPrivacyVis(false)} 
                        style={settingStyles.dialog(colors.elevation.level3)}>
                    <Dialog.Content style={{maxHeight: windowHeight/1.5, paddingBottom: 0}}>
                        <ScrollView>
                            <PrivacyPolicy></PrivacyPolicy>
                        </ScrollView>
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
