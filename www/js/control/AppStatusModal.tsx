import React, { useEffect } from "react";
import { Modal,  useWindowDimensions } from "react-native";
import { Dialog  } from 'react-native-paper';
import PermissionsControls from "../appstatus/PermissionsControls";
import usePermissionStatus from "../usePermissionStatus";
//TODO -- import settings styles for dialog

const AppStatusModal = ({permitVis, setPermitVis, dialogStyle}) => {
    const { height: windowHeight } = useWindowDimensions();
    const { overallStatus } = usePermissionStatus();

    //anytime the status changes, may need to show modal
    useEffect(() => {
        let currentlyOpen = window?.appStatusModalOpened;
        if(!currentlyOpen && overallStatus == false) { //trying to block early cases from throwing modal
            window.appStatusModalOpened = true;
            setPermitVis(true);
        }
    }, [overallStatus]);

    useEffect (() => {
        if(!permitVis) {
            window.appStatusModalOpened = false;
        }
    }, [permitVis]);

    return (
        <Modal visible={permitVis} onDismiss={() => setPermitVis(false)} transparent={true}>
                <Dialog visible={permitVis} 
                        onDismiss={() => setPermitVis(false)} 
                        style={dialogStyle}>
                    <Dialog.Content  style={{maxHeight: windowHeight/1.5, paddingBottom: 0}}>
                            <PermissionsControls onAccept={() => setPermitVis(false)}></PermissionsControls>
                    </Dialog.Content>

                </Dialog>
        </Modal>
    )
}

export default AppStatusModal;