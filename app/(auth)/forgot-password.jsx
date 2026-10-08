import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
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
export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [darkMode, setDarkMode] = useState(false);

  const T = darkMode ? DARK : LIGHT;

  useEffect(() => { loadDarkMode().then(setDarkMode); }, []);

  const handleSend = async () => {
    if (!email.trim()) { setError('Veuillez entrer votre adresse email.'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/forgot-password.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push({ pathname: '/(auth)/verify-code', params: { email: email.trim() } });
      } else {
        setError(data.message || 'Une erreur est survenue.');
      }
    } catch {
      setError('Impossible de contacter le serveur.');
    } finally {
      setLoading(false);
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

          <Text style={styles.title}>Réinitialiser le mot de passe</Text>
          <Text style={[styles.subtitle, { color: T.sub }]}>
            Entrez votre email pour recevoir un{'\n'}lien de réinitialisation
          </Text>

          {!!error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color="#e53e3e" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Text style={[styles.label, { color: T.text }]}>Adresse Email</Text>
          <View style={[styles.inputWrapper, { backgroundColor: T.searchBg, borderColor: T.border }]}>
            <TextInput
              style={[styles.input, { color: T.text }]}
              placeholder="votre@email.com"
              placeholderTextColor={T.sub}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <TouchableOpacity onPress={handleSend} disabled={loading} activeOpacity={0.85} style={{ width: '100%' }}>
            <LinearGradient colors={['#29B6D8', '#00D4F5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.button}>
              {loading ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Text style={styles.buttonText}>Envoyer le lien</Text>
                  <Ionicons name="send" size={20} color="#fff" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: T.border }]} />
          <Text style={[styles.rememberText, { color: T.sub }]}>Vous vous souvenez de votre mot de passe ?</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.loginLink}>Se connecter</Text>
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
  logoEzy: { fontSize: 32, fontWeight: '800', color: '#1A2940' },
  logoOOm: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 6 },
  circle: { width: 26, height: 26, borderRadius: 13, borderWidth: 4, borderColor: '#29B6D8' },
  circleOverlap: { marginLeft: -10 },
  logoM: { fontSize: 32, fontWeight: '800', color: '#1A2940' },
  tagline: { fontSize: 13, color: '#8A9AAA', marginBottom: 24, letterSpacing: 0.3 },
  title: { fontSize: 22, fontWeight: '800', color: '#29B6D8', textAlign: 'center', marginBottom: 10 },
  subtitle: { fontSize: 14, color: '#8A9AAA', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff5f5',
    borderRadius: 10, padding: 10, marginBottom: 16, width: '100%', gap: 8,
  },
  errorText: { color: '#e53e3e', fontSize: 13, flex: 1 },
  label: { alignSelf: 'flex-start', fontWeight: '700', fontSize: 14, color: '#1A2940', marginBottom: 8 },
  inputWrapper: {
    width: '100%', borderWidth: 1.5, borderColor: '#DDE4EC',
    borderRadius: 14, marginBottom: 20, backgroundColor: '#F8FAFC',
  },
  input: { paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#1A2940' },
  button: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, borderRadius: 50, paddingVertical: 16, marginBottom: 24,
  },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  divider: { width: '100%', height: 1, backgroundColor: '#E8EEF4', marginBottom: 20 },
  rememberText: { fontSize: 14, color: '#8A9AAA', textAlign: 'center', marginBottom: 6 },
  loginLink: { fontSize: 15, color: '#29B6D8', fontWeight: '700', textAlign: 'center' },
});