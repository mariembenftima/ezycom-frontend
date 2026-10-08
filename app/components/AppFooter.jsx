import { StyleSheet, Text, View } from 'react-native';
import { DARK, LIGHT } from '../../utils/theme';

export default function AppFooter({ darkMode }) {
  const T = darkMode ? DARK : LIGHT;
  return (
    <View style={[s.footer, { backgroundColor: T.header, borderTopColor: T.headerBorder }]}>
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