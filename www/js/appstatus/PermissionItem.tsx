import React from "react";
import { List, Button } from 'react-native-paper';
import { useTranslation } from "react-i18next";

const PermissionItem = ({ check }) => {
    const { t } = useTranslation(); 

    return (
        <List.Item 
            title={t(check.name)}
            description={t(check.desc)}
            descriptionNumberOfLines={5}
            left={() => <List.Icon icon={check.statusIcon} color={check.statusColor}/>} 
            right={() => <Button onPress={()=>check.fix()}>
                {t('intro.appstatus.fix')}
                </Button>}
        />
    );
};
  
export default PermissionItem;