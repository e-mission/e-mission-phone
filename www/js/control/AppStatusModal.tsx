//this comes up for checkAppStatus, and when needed?
//currently lacking the parts that actually show permissions
//will probably change when we update introduction
import React from "react";
import { Modal } from "react-native";
import { Dialog, Button, Text } from 'react-native-paper';
import { useTranslation } from "react-i18next";

const AppStatusModal = ({permitVis, setPermitVis, status, dialogStyle}) => {
    const { t } = useTranslation();

    return (
        <Modal visible={permitVis} onDismiss={() => setPermitVis(false)} transparent={true}>
                <Dialog visible={permitVis} 
                        onDismiss={() => setPermitVis(false)} 
                        style={dialogStyle}>
                    <Dialog.Title>{t('consent.permissions')}</Dialog.Title>
                    <Dialog.Content>
                        <Text variant="">{t('intro.appstatus.overall-description')}</Text>
                        {/* <permissioncheck overallstatus="overallAppStatus"></permissioncheck> */}
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button 
                            onPress={() => setPermitVis(false)}
                            disabled={status}>
                            {t('control.button-accept')}
                        </Button>
                    </Dialog.Actions>
                </Dialog>
            </Modal>
    )
}

export default AppStatusModal;