import React, { useEffect } from "react";
import { Modal,  useWindowDimensions } from "react-native";
import { Dialog, useTheme } from 'react-native-paper';
import PermissionsControls from "../appstatus/PermissionsControls";
import usePermissionStatus from "../usePermissionStatus";
import { settingStyles } from "./ProfileSettings";
//TODO -- import settings styles for dialog

const AppStatusModal = ({ permitVis, setPermitVis }) => {
    const { height: windowHeight } = useWindowDimensions();
    const { overallStatus, checkList } = usePermissionStatus();
    const { colors } = useTheme();

    /* Listen for permissions status changes to determine if we should show the modal. */
    useEffect(() => {
      if (overallStatus === false) {
          setPermitVis(true);
      }
  }, [overallStatus, checkList]);

    return (
        <Modal visible={permitVis} onRequestClose={() => {
            if(overallStatus){(setPermitVis(false))}
        }} 
        transparent={true}>
                <Dialog visible={permitVis} 
                        dismissable={overallStatus}
                        onDismiss={() => setPermitVis(false)} 
                        style={settingStyles.dialog(colors.elevation.level3)}>
                    <Dialog.Content  style={{maxHeight: windowHeight/1.5, paddingBottom: 0}}>
                            <PermissionsControls onAccept={() => setPermitVis(false)}></PermissionsControls>
                    </Dialog.Content>

                </Dialog>
        </Modal>
    )
}

export default AppStatusModal;
