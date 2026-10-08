import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  KeyboardAvoidingView, Platform,
  StyleSheet,
  Text, TextInput, TouchableOpacity,
  View,
} from 'react-native';

import { API_URL } from '../../config';
import { loadDarkMode } from '../../utils/darkMode';
import { DARK, LIGHT } from '../../utils/theme';

export default function VerifyCode() {
  const { email } = useLocalSearchParams();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const inputs = useRef([]);

  const T = darkMode ? DARK : LIGHT;

  useEffect(() => { loadDarkMode().then(setDarkMode); }, []);

  const handleChange = (val, index) => {
    const newCode = [...code];
    newCode[index] = val.replace(/[^0-9]/g, '');
    setCode(newCode);
    if (val && index < 5) inputs.current[index + 1]?.focus();
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const fullCode = code.join('');
    if (fullCode.length < 6) { setError('Entrez le code à 6 chiffres.'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/verify-reset-code.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: fullCode }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push({ pathname: '/(auth)/reset-password', params: { email, code: fullCode } });
      } else {
        setError(data.message || 'Code invalide ou expiré.');
      }
    } catch {
      setError('Impossible de contacter le serveur.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    setError('');
    try {
      await fetch(`${API_URL}/api/auth/forgot-password.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <ImageBackground source={require('../../assets/images/stone.jpg')} style={styles.bg} resizeMode="cover">
      <View style={styles.overlay} />
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.card, { backgroundColor: T.card }]}>
          <View style={styles.logoRow}>
            <Text style={[styles.logoEzy, { color: T.text }]}>Ezy</Text>
            <View style={styles.logoOOm}>
              <View style={styles.circle} />
              <View style={[styles.circle, styles.circleOverlap]} />
            </View>
            <Text style={[styles.logoM, { color: T.text }]}>m</Text>
          </View>
          <Text style={[styles.tagline, { color: T.sub }]}>Stock & Delivery</Text>

          <View style={styles.iconBox}>
            <Ionicons name="mail-open" size={36} color="#29B6D8" />
          </View>

          <Text style={styles.title}>Vérification</Text>
          <Text style={[styles.subtitle, { color: T.sub }]}>
            Un code à 6 chiffres a été envoyé à{'\n'}
            <Text style={[styles.emailHighlight, { color: T.text }]}>{email}</Text>
          </Text>

          {!!error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color="#e53e3e" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.otpRow}>
            {code.map((digit, i) => (
              <TextInput
                key={i}
                ref={r => inputs.current[i] = r}
                style={[styles.otpInput, { borderColor: T.border, backgroundColor: T.searchBg, color: T.text }, digit ? styles.otpFilled : null]}
                value={digit}
                onChangeText={val => handleChange(val, i)}
                onKeyPress={e => handleKeyPress(e, i)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
              />
            ))}
          </View>

          <TouchableOpacity onPress={handleVerify} disabled={loading} activeOpacity={0.85} style={{ width: '100%' }}>
            <LinearGradient colors={['#29B6D8', '#00D4F5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.button}>
              {loading ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Text style={styles.buttonText}>Vérifier le code</Text>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: T.border }]} />

          <Text style={[styles.resendText, { color: T.sub }]}>Vous n'avez pas reçu le code ?</Text>
          <TouchableOpacity onPress={handleResend} disabled={resendLoading}>
            {resendLoading
              ? <ActivityIndicator size="small" color="#29B6D8" />
              : <Text style={styles.resendLink}>Renvoyer le code</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={16} color={T.sub} />
            <Text style={[styles.backText, { color: T.sub }]}>Retour</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: {
    backgroundColor: '#fff', borderRadius: 24, padding: 32,
    width: '100%', maxWidth: 380, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25, shadowRadius: 20, elevation: 10,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  logoEzy: { fontSize: 28, fontWeight: '800', color: '#1A2940' },
  logoOOm: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 5 },
  circle: { width: 22, height: 22, borderRadius: 11, borderWidth: 3.5, borderColor: '#29B6D8' },
  circleOverlap: { marginLeft: -8 },
  logoM: { fontSize: 28, fontWeight: '800', color: '#1A2940' },
  tagline: { fontSize: 12, color: '#8A9AAA', marginBottom: 20, letterSpacing: 0.3 },
  iconBox: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#EAF8FC', justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 22, fontWeight: '800', color: '#29B6D8', textAlign: 'center', marginBottom: 10 },
  subtitle: { fontSize: 14, color: '#8A9AAA', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  emailHighlight: { color: '#1A2940', fontWeight: '700' },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff5f5',
    borderRadius: 10, padding: 10, marginBottom: 16, width: '100%', gap: 8,
  },
  errorText: { color: '#e53e3e', fontSize: 13, flex: 1 },
  otpRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  otpInput: {
    width: 46, height: 56, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#DDE4EC',
    textAlign: 'center', fontSize: 22, fontWeight: '700',
    color: '#1A2940', backgroundColor: '#F8FAFC',
  },
  otpFilled: { borderColor: '#29B6D8', backgroundColor: '#EAF8FC' },
  button: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, borderRadius: 50, paddingVertical: 16, marginBottom: 24,
  },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  divider: { width: '100%', height: 1, backgroundColor: '#E8EEF4', marginBottom: 16 },
  resendText: { fontSize: 14, color: '#8A9AAA', textAlign: 'center', marginBottom: 6 },
  resendLink: { fontSize: 15, color: '#29B6D8', fontWeight: '700', textAlign: 'center', marginBottom: 16 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { fontSize: 14, color: '#8A9AAA' },
});