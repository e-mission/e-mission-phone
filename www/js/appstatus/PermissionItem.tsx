import React from "react";
import { List, Button } from 'react-native-paper';
import { useTranslation } from "react-i18next";

const PermissionItem = ({name, description, fixAction, statusIcon }) => {
    const { t } = useTranslation(); 

    return (
        <List.Item 
            title={t(name)}
            description={t(description)}
            descriptionNumberOfLines={5}
            left={() => <List.Icon icon={statusIcon}/>} 
            right={() => <Button onPress={()=>fixAction()}>
                {t('intro.appstatus.fix')}
                </Button>}
        />
    );
};
  
export default PermissionItem;