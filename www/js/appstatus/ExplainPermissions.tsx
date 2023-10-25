import React from "react";
import { Modal, ScrollView, useWindowDimensions, View } from "react-native";
import { Button, Dialog, Text } from 'react-native-paper';
import { useTranslation } from "react-i18next";

const ExplainPermissions = ({ explanationList, visible, setVisible }) => {
    const { t } = useTranslation(); 
    const { height: windowHeight } = useWindowDimensions();

    return (
        <Modal visible={visible} 
            onDismiss={() => setVisible(false)} >
            <Dialog visible={visible} 
                    onDismiss={() => setVisible(false)} >
                <Dialog.Title>{t('intro.appstatus.explanation-title')}</Dialog.Title>
                <Dialog.Content style={{maxHeight: windowHeight/1.5, paddingBottom: 0}}>
                    <ScrollView>
                        {explanationList?.map((li) => 
                            <View key={li.name}>
                                <Text variant="headlineSmall" key={li.name}>
                                    {li.name}
                                </Text>
                                <Text variant="bodyMedium">
                                    {li.desc}
                                </Text>
                            </View>
                        )}
                    </ScrollView>
                </Dialog.Content>
                <Dialog.Actions>
                    <Button 
                        onPress={() => setVisible(false)}>
                        {t('join.close')}
                    </Button>
                </Dialog.Actions>
            </Dialog>
        </Modal>
    );
};

export default ExplainPermissions;