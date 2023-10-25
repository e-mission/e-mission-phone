import React from "react";
import { Modal } from "react-native";
import { Dialog, Button, useTheme } from "react-native-paper";
import { useTranslation } from "react-i18next";
import { settingStyles } from "../control/ProfileSettings";

const ActionMenu = ({vis, setVis, title, actionSet, onAction, onExit}) => {

    const { t } = useTranslation();
    const { colors } = useTheme();

    return (
        <Modal visible={vis} onDismiss={() => setVis(false)}
        transparent={true}>
            <Dialog visible={vis}
                onDismiss={() => setVis(false)}
                style={settingStyles.dialog(colors.elevation.level3)}>
                <Dialog.Title>{title}</Dialog.Title>
                <Dialog.Content>
                    {actionSet?.map((e) =>
                        <Button key={e.text}
                        onPress={() =>  { 
                            onAction(e); 
                            setVis(false);
                        }}>
                            {e.text}
                        </Button>
                    )}
                </Dialog.Content>
                <Dialog.Actions>
                    <Button onPress={() => {setVis(false);
                                            onExit();}}>{
                        t('general-settings.cancel')}
                    </Button>
                </Dialog.Actions>
            </Dialog>
        </Modal>
    )
}

export default ActionMenu;