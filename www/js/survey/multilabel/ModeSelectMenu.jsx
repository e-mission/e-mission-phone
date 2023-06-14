/* A scrollable popover menu for choosing the mode when labeling trips */

import React, { } from "react";
import { angularize } from "../../angular-react-helper";
import { func } from "prop-types";
import { ScrollView } from "react-native";
import { Menu } from "react-native-paper";
import { useTranslation } from "react-i18next";

const ModeSelectMenu = ({ anchor, visible, inputParams, chooseFn }) => {
  const { t } = useTranslation();

  return (
    <Menu visible={visible} anchor={anchor}>
      <ScrollView>
        {inputParams?.MODE?.options.map((mode) => {
          return (
            <Menu.Item
              key={mode}
              onPress={() => chooseFn('MODE', mode)}
              title={t(mode.text)}
            />
          );
        })}
      </ScrollView>
    </Menu>
  );
};

ModeSelectMenu.propTypes = {
  chooseFn: func,
}

angularize(ModeSelectMenu, 'emission.main.diary.modeselectmenu');
export default ModeSelectMenu;
