import React, { useState, useEffect, useMemo } from "react";
import { Modal,  useWindowDimensions, ScrollView, View } from "react-native";
import { Dialog, Button, Text, useTheme } from 'react-native-paper';
import PermissionsControls from "../appstatus/PermissionsControls";
//TODO -- import settings styles for dialog

const AppStatusModal = ({permitVis, setPermitVis, dialogStyle}) => {
    const {colors} = useTheme();
    const { height: windowHeight } = useWindowDimensions();

    return (
        <Modal visible={permitVis} onDismiss={() => setPermitVis(false)} transparent={true}>
                <Dialog visible={permitVis} 
                        onDismiss={() => setPermitVis(false)} 
                        style={dialogStyle}>
                    <Dialog.Content  style={{maxHeight: windowHeight/1.5, paddingBottom: 0}}>
                            <PermissionsControls permitVis={permitVis} setPermitVis={setPermitVis}></PermissionsControls>
                    </Dialog.Content>

                </Dialog>
        </Modal>
    )
}

export default AppStatusModal;