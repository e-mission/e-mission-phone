import React from 'react';
import { Modal, ScrollView, useWindowDimensions, View } from 'react-native';
import { Dialog, Button, Switch, Text, useTheme, TextInput, RadioButton } from 'react-native-paper';
import { settingStyles } from './ProfileSettings';
import { ParseKeys } from 'i18next';
import { useTranslation } from 'react-i18next';

type Config = {
  [k: string]: number | boolean;
};
type Options = { [option: string]: number };

type Props = {
  editVis: boolean;
  setEditVis: (vis: boolean) => void;
  titleKey: ParseKeys;
  localConfig: Config;
  setLocalConfig: (config) => void;
  appConfigOverrides?: Partial<Config>;
  saveAndReload: () => void;
  fieldsOptions?: { [field: string]: Options };
};
const EditConfigModal = ({
  editVis,
  setEditVis,
  titleKey,
  localConfig,
  setLocalConfig,
  appConfigOverrides,
  saveAndReload,
  fieldsOptions,
}: Props) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { height: windowHeight } = useWindowDimensions();

  function onToggle(config_key) {
    let tempConfig = { ...localConfig } as Config;
    tempConfig[config_key] = !(localConfig as Config)[config_key];
    setLocalConfig(tempConfig);
  }

  function onChangeText(newText, config_key) {
    let tempConfig = { ...localConfig } as Config;
    tempConfig[config_key] = parseInt(newText);
    setLocalConfig(tempConfig);
  }

  return (
    <Modal visible={editVis} onDismiss={() => setEditVis(false)} transparent={true}>
      <Dialog
        visible={editVis}
        onDismiss={() => setEditVis(false)}
        style={settingStyles.dialog(colors.elevation.level3)}>
        <Dialog.Title>{t(titleKey)}</Dialog.Title>
        <ScrollView>
          <Dialog.Content style={{ maxHeight: windowHeight / 1.5 }}>
            {Object.entries(localConfig).map(([key, value]) => {
              const disabled = appConfigOverrides?.[key] != undefined;
              if (typeof value == 'boolean') {
                return (
                  <View
                    key={key}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      marginVertical: 12,
                    }}>
                    <Text variant="labelMedium">{key}</Text>
                    <Switch value={value} onValueChange={() => onToggle(key)} disabled={disabled} />
                  </View>
                );
              } else if (typeof value == 'number') {
                if (fieldsOptions && Object.keys(fieldsOptions).includes(key)) {
                  return (
                    <View key={key} style={{ marginVertical: 8 }}>
                      <Text variant="labelMedium">{key}</Text>
                      <RadioButton.Group
                        onValueChange={(v) => onChangeText(v, key)}
                        value={'' + value}>
                        {Object.entries(fieldsOptions[key]).map(([text, value]) => (
                          <RadioButton.Item
                            key={value}
                            label={text}
                            value={'' + value}
                            disabled={disabled}
                            labelVariant="bodySmall"
                            style={{ paddingVertical: 4 }}
                          />
                        ))}
                      </RadioButton.Group>
                    </View>
                  );
                } else {
                  return (
                    <TextInput
                      label={<Text variant="labelMedium">{key}</Text>}
                      value={value?.toString()}
                      disabled={disabled}
                      onChangeText={(text) => onChangeText(text, key)}
                      style={{ marginVertical: 8 }}
                    />
                  );
                }
              } else {
                return <Text variant="bodyMedium">{value}</Text>;
              }
            })}
          </Dialog.Content>
        </ScrollView>
        <Dialog.Actions>
          <Button onPress={() => saveAndReload()}>Save</Button>
          <Button onPress={() => setEditVis(false)}>Cancel</Button>
        </Dialog.Actions>
      </Dialog>
    </Modal>
  );
};

export default EditConfigModal;
