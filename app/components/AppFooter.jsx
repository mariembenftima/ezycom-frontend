import { StyleSheet, Text, View } from 'react-native';

const LIGHT = { bg: '#fff', border: '#E8EEF4' };
const DARK  = { bg: '#0F2035', border: '#1E3A50' };

export default function AppFooter({ darkMode }) {
  const T = darkMode ? DARK : LIGHT;
  return (
    <View style={[s.footer, { backgroundColor: T.bg, borderTopColor: T.border }]}>
      <Text style={s.left}>© 2026 Ezycom</Text>
      <Text style={s.right}>Design with <Text style={s.heart}>♥</Text> by Ezycom</Text>
    </View>
  );
}

const s = StyleSheet.create({
  footer: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1,
  },
  left:  { fontSize: 11, color: '#B0BCC8' },
  right: { fontSize: 11, color: '#B0BCC8' },
  heart: { color: '#e53e3e' },
});