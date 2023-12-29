import React, { useState, useContext } from 'react';
import SettingRow from './SettingRow';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  ScrollView,
} from 'react-native';
import { Icon, TextInput, Dialog, Button, useTheme, Divider } from 'react-native-paper';
import { AppContext } from '../App';
import { useTranslation } from 'react-i18next';
import { insertUserCustomMode } from '../services/commHelper';
import { displayErrorMsg, logDebug } from '../plugin/logger';
import { labelKeyToReadable, readableLabelToKey } from '../survey/multilabel/confirmHelper';

const CustomModesSettingRow = () => {
  const [isCustomModesModalOpen, setIsCustomModesModalOpen] = useState(false);
  const { customModes, setCustomModes } = useContext(AppContext);
  const [isAddModeOn, setIsAddModeOn] = useState(false);
  const [text, setText] = useState('');
  const { t } = useTranslation(); //this accesses the translations
  const { colors } = useTheme(); // use this to get the theme colors instead of hardcoded #hex colors
  const { height } = useWindowDimensions();
  const onDeleteMode = (mode) => {};

  const onSaveMode = async () => {
    const newMode = readableLabelToKey(text);
    if (customModes.indexOf(newMode) > -1) {
      return;
    }
    try {
      const res = await insertUserCustomMode(newMode);
      if (res) {
        setText('');
        setCustomModes(res['modes'] as string[]);
        setIsAddModeOn(false);
        logDebug('Successfuly stored custom mode ' + JSON.stringify(res));
      }
    } catch (e) {
      displayErrorMsg(e, 'Create Mode Error');
    }
  };

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
          <Dialog.Title>
            <Text>{t('trip-confirm.custom-mode')}</Text>
            <TouchableOpacity
              style={{ position: 'absolute', right: 0 }}
              onPress={() => setIsAddModeOn(true)}>
              <Icon source="plus-circle" size={24} />
            </TouchableOpacity>
          </Dialog.Title>
          <Dialog.Content>
            {isAddModeOn && (
              <>
                <TextInput
                  label={t('trip-confirm.services-please-fill-in', {
                    text: 'mode',
                  })}
                  value={text}
                  onChangeText={setText}
                  maxLength={25}
                />
                <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'flex-end' }}>
                  <Button onPress={() => setIsAddModeOn(false)}>
                    {t('trip-confirm.services-cancel')}
                  </Button>
                  <Button onPress={onSaveMode}>{t('trip-confirm.services-save')}</Button>
                </View>
              </>
            )}
            <ScrollView contentContainerStyle={{ maxHeight: height / 2 }}>
              {customModes.map((mode, idx) => {
                return (
                  <View
                    key={mode + idx}
                    style={[styles.itemWrapper, { borderBottomColor: colors.outline }]}>
                    <Text>{labelKeyToReadable(mode)}</Text>
                    <TouchableOpacity onPress={() => onDeleteMode(mode)}>
                      <Icon source="trash-can" size={20} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setIsCustomModesModalOpen(false)}>
              {t('trip-confirm.services-cancel')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  itemWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  iconWrapper: {},
});

export default CustomModesSettingRow;
