//component to view and manage permission settings
import React, { useState } from "react";
import { StyleSheet, ScrollView, View } from "react-native";
import { Button, Text } from 'react-native-paper';
import { useTranslation } from "react-i18next";
import PermissionItem from "./PermissionItem";
import usePermissionStatus, { refreshAllChecks } from "../usePermissionStatus";
import ExplainPermissions from "./ExplainPermissions";
import AlertBar from "../control/AlertBar";

const PermissionsControls = ({ onAccept }) => {
    const { t } = useTranslation();
    const [explainVis, setExplainVis] = useState<boolean>(false);
    const { checkList, overallStatus, error, errorVis, setErrorVis, explanationList } = usePermissionStatus();

    return (
        <>
            <Text style={styles.title}>{t('consent.permissions')}</Text>
            <ScrollView persistentScrollbar={true}>
                <Text>{t('intro.appstatus.overall-description')}</Text>
                <Button 
                    onPress={() => setExplainVis(true)}>
                    {t('intro.appstatus.explanation-title')}
                </Button>
                <ExplainPermissions explanationList={explanationList} visible={explainVis} setVisible={setExplainVis}></ExplainPermissions>
                {checkList?.map((lc) => 
                        <PermissionItem 
                            key={lc.name}
                            check = {lc}
                        >
                        </PermissionItem>
                    )}
            </ScrollView>
            <View style={styles.buttonBox}>
                <Button 
                    onPress={() => refreshAllChecks(checkList)}>
                    {t('intro.appstatus.refresh')}
                </Button>
                <Button 
                    onPress={onAccept}
                    disabled={!overallStatus}>
                    {t('control.button-accept')}
                </Button>
            </View>

            <AlertBar visible={errorVis} setVisible={setErrorVis} messageKey={"Error "} messageAddition={error}></AlertBar>
        </>
    )
}

const styles = StyleSheet.create({
    title: {
        fontWeight: "bold",
        fontSize: 22,
        paddingBottom: 10
    }, 
    buttonBox: {
        paddingHorizontal: 15,
        paddingVertical: 10,
        flexDirection: "row",
        justifyContent: "space-evenly"
    }
  });

export default PermissionsControls;