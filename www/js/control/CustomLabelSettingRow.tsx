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
import {
  Icon,
  TextInput,
  Dialog,
  Button,
  useTheme,
  Divider,
  SegmentedButtons,
} from 'react-native-paper';
import { AppContext } from '../App';
import { useTranslation } from 'react-i18next';
import { deleteUserCustomLabel, insertUserCustomLabel } from '../services/commHelper';
import { displayErrorMsg, logDebug } from '../plugin/logger';
import { labelKeyToReadable, readableLabelToKey } from '../survey/multilabel/confirmHelper';

const CustomLabelSettingRow = () => {
  const [isCustomLabelModalOpen, setIsCustomLabelModalOpen] = useState(false);
  const { customLabel, setCustomLabel } = useContext(AppContext);
  const [isAddLabelOn, setIsAddLabelOn] = useState(false);
  const [text, setText] = useState('');
  const [key, setKey] = useState('mode');

  const { t } = useTranslation(); //this accesses the translations
  const { colors } = useTheme(); // use this to get the theme colors instead of hardcoded #hex colors
  const { height } = useWindowDimensions();

  const labelButton = [
    {
      value: 'mode',
      label: t('diary.mode'),
    },
    {
      value: 'purpose',
      label: t('diary.purpose'),
    },
    {
      value: 'replaced_mode',
      label: t('diary.replaces'),
    },
  ];
  const onDeleteLabel = async (label) => {
    const processedLabel = readableLabelToKey(label);
    try {
      const res = await deleteUserCustomLabel(key, processedLabel);
      if (res) {
        const updatedCustomLabel = {
          ...customLabel,
          [key]: res['label'],
        };
        setCustomLabel(updatedCustomLabel);
        logDebug(`Successfuly deleted custom ${key}, ${JSON.stringify(res)}`);
      }
    } catch (e) {
      displayErrorMsg(e, 'Create Mode Error');
    }
  };

  const onSaveLabel = async () => {
    const processedLabel = readableLabelToKey(text);
    if (customLabel[key].indexOf(processedLabel) > -1) {
      return;
    }
    try {
      const res = await insertUserCustomLabel(key, processedLabel);
      if (res) {
        setText('');
        const updatedCustomLabel = {
          ...customLabel,
          [key]: res['label'],
        };
        setCustomLabel(updatedCustomLabel);
        setIsAddLabelOn(false);
        logDebug(`Successfuly inserted custom ${key}, ${JSON.stringify(res)}`);
      }
    } catch (e) {
      displayErrorMsg(e, 'Create Mode Error');
    }
  };

  return (
    <>
      <SettingRow
        textKey="control.edit-custom-labels"
        iconName="label-multiple"
        action={() => setIsCustomLabelModalOpen(true)}></SettingRow>
      <Modal
        visible={isCustomLabelModalOpen}
        onDismiss={() => setIsCustomLabelModalOpen(false)}
        transparent={true}>
        <Dialog visible={isCustomLabelModalOpen} onDismiss={() => setIsCustomLabelModalOpen(false)}>
          <Dialog.Title>
            <Text>{t('trip-confirm.custom-labels')}</Text>
            <TouchableOpacity style={styles.plusIconWrapper} onPress={() => setIsAddLabelOn(true)}>
              <Icon source="plus-circle" size={24} />
            </TouchableOpacity>
          </Dialog.Title>
          <Dialog.Content>
            <SegmentedButtons
              style={{ marginBottom: 10 }}
              value={key}
              onValueChange={setKey}
              buttons={labelButton}
            />
            {isAddLabelOn && (
              <>
                <TextInput
                  label={t('trip-confirm.services-please-fill-in', {
                    text: 'mode',
                  })}
                  value={text}
                  onChangeText={setText}
                  maxLength={25}
                  style={{ marginTop: 10 }}
                />
                <View style={styles.saveButtonWrapper}>
                  <Button onPress={() => setIsAddLabelOn(false)}>
                    {t('trip-confirm.services-cancel')}
                  </Button>
                  <Button onPress={onSaveLabel}>{t('trip-confirm.services-save')}</Button>
                </View>
              </>
            )}
            <ScrollView contentContainerStyle={{ height: height / 2 }}>
              {customLabel[key].map((label, idx) => {
                return (
                  <View
                    key={label + idx}
                    style={[styles.itemWrapper, { borderBottomColor: colors.outline }]}>
                    <Text>{labelKeyToReadable(label)}</Text>
                    <TouchableOpacity onPress={() => onDeleteLabel(label)}>
                      <Icon source="trash-can" size={20} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setIsCustomLabelModalOpen(false)}>
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
  saveButtonWrapper: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  plusIconWrapper: {
    position: 'absolute',
    right: 0,
  },
});

export default CustomLabelSettingRow;
