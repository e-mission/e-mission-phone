import React from "react";
import { List, Button } from 'react-native-paper';
import { useTranslation } from "react-i18next";

const PermissionItem = ({name, fixAction, refreshAction, statusIcon }) => {
    const { t } = useTranslation(); 

  
    return (
        <>
            <List.Item 
                title={t(name)}
                description="Item description"
                left={() => <List.Icon icon={statusIcon}/>} 
            />
            <Button onPress={()=>fixAction()}>
                {t('intro.appstatus.fix')}
            </Button>
            <Button onPress={()=>refreshAction()}>
                {t('intro.appstatus.refresh')}
            </Button>
        </>
    );
};
  
export default PermissionItem;