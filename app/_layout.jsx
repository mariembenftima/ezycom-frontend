import { Slot } from 'expo-router';
import { useEffect } from 'react';
import { setupNotificationListeners } from '../utils/notifications';

export default function RootLayout() {
  useEffect(() => {
    const unsubscribe = setupNotificationListeners();
    return () => unsubscribe();
  }, []);

  return <Slot />;
}
