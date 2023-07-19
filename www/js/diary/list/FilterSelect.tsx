/* A component wrapped around a <select> element that allows the user to pick a filter,
    used in the Label screen.
  This is a temporary solution; this component includes HTML and we will need to be rewritten
    when we have fully migrated to React Native.
*/

import React, { useState, useMemo } from "react";
import { Modal } from "react-native";
import { useTranslation } from "react-i18next";
import NavBarButton from "../../components/NavBarButton";
import { RadioButton, Text, Dialog } from "react-native-paper";

const FilterSelect = ({ filters, setFilters, numListDisplayed, numListTotal }) => {

  const { t } = useTranslation();
  const [modalVisible, setModalVisible] = useState(false);
  const selectedFilter = useMemo(() => filters?.find(f => f.state)?.key || 'show-all', [filters]);
  const labelDisplayText = useMemo(() => {
    if (!filters)
      return '...';
    const selectedFilterObj = filters?.find(f => f.state);
    if (!selectedFilterObj) return t('diary.show-all') + ` (${numListTotal||0})`;
    return selectedFilterObj.text + ` (${numListDisplayed||0}/${numListTotal||0})`;
  }, [filters, numListDisplayed, numListTotal]);

  function chooseFilter(filterKey) {
    if (filterKey == 'show-all') {
      setFilters(filters.map(f => ({ ...f, state: false })));
    } else {
      setFilters(filters.map(f => {
        if (f.key === filterKey) {
          return { ...f, state: true };
        } else {
          return { ...f, state: false };
        }
      }));
    }
    /* We must wait to close the modal until this function is done running,
      else the click event might leak to the content behind the modal */
    setTimeout(() => setModalVisible(false)); /* setTimeout with no delay defers the call until
                                                  the next event loop cycle */
  }

  return (<>
    <NavBarButton icon={filters ? "chevron-down" : null} onPressAction={() => setModalVisible(true)}>
      <Text>
        {labelDisplayText}
      </Text>
    </NavBarButton>
    <Modal visible={modalVisible} transparent={true} onDismiss={() => setModalVisible(false)}>
      <Dialog visible={modalVisible} onDismiss={() => setModalVisible(false)}>
        {/* TODO - add title */}
        {/* <Dialog.Title>{t('diary.filter-travel')}</Dialog.Title> */}
        <Dialog.Content>
          <RadioButton.Group onValueChange={k => chooseFilter(k)} value={selectedFilter}>
            {filters.map(f => (
              <RadioButton.Item key={f.key} label={f.text} value={f.key} />
            ))}
            <RadioButton.Item label={t('diary.show-all') + ' ('+numListTotal+')'}
             value="show-all" />
          </RadioButton.Group>
        </Dialog.Content>
      </Dialog>
    </Modal>
  </>);
};

export default FilterSelect;
