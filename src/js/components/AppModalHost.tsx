import React, { useLayoutEffect, useState } from 'react';
import { Popup, setAppModalListener } from './alerts';

const AppModalHost = () => {
  const [popup, setPopup] = useState<Popup | null>(null);

  useLayoutEffect(() => {
    setAppModalListener(setPopup);
    return () => setAppModalListener(undefined);
  }, []);

  if (!popup?.Modal) return null;

  return <popup.Modal visible={true} onDismiss={() => setPopup(null)} {...popup.modalProps} />;
};

export default AppModalHost;
