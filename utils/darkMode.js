import AsyncStorage from '@react-native-async-storage/async-storage';

export const loadDarkMode = async () => {
  const val = await AsyncStorage.getItem('darkMode');
  return val === 'true';
};

export const saveDarkMode = async (value) => {
  await AsyncStorage.setItem('darkMode', String(value));
};