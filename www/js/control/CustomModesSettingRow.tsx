import React, { useState, useContext } from 'react';
import SettingRow from './SettingRow';
import { Modal } from 'react-native';
import { List, Dialog, Button } from 'react-native-paper';
import { AppContext } from '../App';

const CustomModesSettingRow = () => {
  const [isCustomModesModalOpen, setIsCustomModesModalOpen] = useState(false);
  const { customModes, setCustomModes } = useContext(AppContext);

  return (
    <>
      <SettingRow
        textKey="control.edit-custom-modes"
        iconName="label-multiple"
        action={() => setIsCustomModesModalOpen(true)}></SettingRow>
      <Modal
        visible={isCustomModesModalOpen}
        onDismiss={() => setIsCustomModesModalOpen(false)}
        transparent={true}>
        <Dialog visible={isCustomModesModalOpen} onDismiss={() => setIsCustomModesModalOpen(false)}>
          <Dialog.Title>Custom Modes</Dialog.Title>
          <Dialog.Content>
            {customModes.map((mode, idx) => {
              return <List.Item key={mode + idx} title={mode} onPress={(e) => console.log(e)} />;
            })}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setIsCustomModesModalOpen(false)}>Close</Button>
          </Dialog.Actions>
        </Dialog>
      </Modal>
    </>
  );
};

export default CustomModesSettingRow;
