import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  TOKEN: 'ezycom_token',
  USER:  'ezycom_user',
  SHOP:  'ezycom_shop',
};

export const saveSession = async ({ token, user, shop }) => {
  await AsyncStorage.multiSet([
    [KEYS.TOKEN, token],
    [KEYS.USER,  JSON.stringify(user)],
    [KEYS.SHOP,  JSON.stringify(shop)],
  ]);
};

export const loadSession = async () => {
  const [[, token], [, user], [, shop]] = await AsyncStorage.multiGet([
    KEYS.TOKEN, KEYS.USER, KEYS.SHOP,
  ]);
  if (!token) return null;
  return {
    token,
    user: user ? JSON.parse(user) : null,
    shop: shop ? JSON.parse(shop) : null,
  };
};

export const clearSession = async () => {
  await AsyncStorage.multiRemove([KEYS.TOKEN, KEYS.USER, KEYS.SHOP]);
};

export const authHeaders = (token) => ({
  'Content-Type': 'application/json',
  'X-Token': token,
});