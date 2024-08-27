import React, { useContext, useEffect } from 'react';
import { Modal, useWindowDimensions } from 'react-native';
import { Dialog, useTheme } from 'react-native-paper';
import PermissionsControls from './appstatus/PermissionsControls';
import { settingStyles } from './control/ProfileSettings';
import { AppContext } from './App';

const AppStatusModal = () => {
  const { height: windowHeight } = useWindowDimensions();
  const { permissionStatus, permissionsPopupVis, setPermissionsPopupVis } = useContext(AppContext);
  const { overallStatus, checkList, refreshAllChecks } = permissionStatus;
  const { colors } = useTheme();

  /* Listen for permissions status changes to determine if we should show the modal. */
  useEffect(() => {
    if (overallStatus === false) {
      setPermissionsPopupVis(true);
    }
  }, [overallStatus, checkList]);

  return (
    <Modal
      visible={permissionsPopupVis}
      onRequestClose={() => {
        if (overallStatus) {
          setPermissionsPopupVis(false);
        }
      }}
      transparent={true}>
      <Dialog
        visible={permissionsPopupVis}
        dismissable={overallStatus}
        onDismiss={() => setPermissionsPopupVis(false)}
        style={settingStyles.dialog(colors.elevation.level3)}>
        <Dialog.Content style={{ maxHeight: windowHeight / 1.5, paddingBottom: 0 }}>
          <PermissionsControls
            onAccept={() => setPermissionsPopupVis(false)}
            refreshAllChecks={refreshAllChecks}
          />
        </Dialog.Content>
      </Dialog>
    </Modal>
  );
};

export default AppStatusModal;
