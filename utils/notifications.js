import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import api from './api';

// Chargement conditionnel de Firebase Messaging
// (module natif non disponible dans Expo Go)
let messaging = null;
try {
    messaging = require('@react-native-firebase/messaging').default;
} catch (e) {
    // Firebase Messaging non disponible (Expo Go)
}

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

export async function requestNotificationPermission() {
    if (!messaging) return false;
    if (!Device.isDevice) return false;
    try {
        const authStatus = await messaging().requestPermission();
        return (
            authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
            authStatus === messaging.AuthorizationStatus.PROVISIONAL
        );
    } catch (e) {
        console.log('Permission FCM refusée ou indisponible:', e.message);
        return false;
    }
}

export async function getFcmToken() {
    if (!messaging) return null;
    try {
        const granted = await requestNotificationPermission();
        if (!granted) return null;
        const token = await messaging().getToken();
        return token;
    } catch (e) {
        console.error('Erreur récupération FCM token:', e.message);
        return null;
    }
}

export async function registerFcmToken() {
    if (!messaging) return;
    try {
        const granted = await requestNotificationPermission();
        if (!granted) return;
        const token = await messaging().getToken();
        if (!token) return;
        await api.post('/api/users/fcm-token.php', { fcm_token: token });
    } catch (e) {
        console.error('Erreur enregistrement FCM token:', e.message);
    }
}

export function setupNotificationListeners() {
    if (!messaging) return () => {};

    const unsubscribeForeground = messaging().onMessage(async remoteMessage => {
        await Notifications.scheduleNotificationAsync({
            content: {
                title: remoteMessage.notification?.title || 'Nouvelle notification',
                body: remoteMessage.notification?.body || '',
                data: remoteMessage.data || {},
            },
            trigger: null,
        });
    });

    messaging().setBackgroundMessageHandler(async remoteMessage => {
        console.log('Notification en arrière-plan:', remoteMessage.notification?.title);
    });

    return unsubscribeForeground;
}
