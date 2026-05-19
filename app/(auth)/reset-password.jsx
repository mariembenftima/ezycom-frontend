import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  KeyboardAvoidingView, Platform,
  StyleSheet,
  Text, TextInput, TouchableOpacity,
  View,
} from 'react-native';

import { API_URL } from '../../config';

export default function ResetPassword() {
  const { email, code } = useLocalSearchParams();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleReset = async () => {
    if (!password || !confirm) { setError('Veuillez remplir tous les champs.'); return; }
    if (password.length < 8) { setError('Le mot de passe doit contenir au moins 8 caractères.'); return; }
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas.'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, password }),
      });
      const data = await res.json();
      if (res.ok) {
        router.replace('/(auth)/login');
      } else {
        setError(data.message || 'Une erreur est survenue.');
      }
    } catch {
      setError('Impossible de contacter le serveur.');
    } finally {
      setLoading(false);
    }
  };

  const getStrength = () => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  };
  const strength = getStrength();
  const strengthColors = ['#e53e3e', '#dd6b20', '#d69e2e', '#38a169'];
  const strengthLabels = ['Faible', 'Moyen', 'Bien', 'Fort'];

  return (
    <ImageBackground source={require('../../assets/images/stone.jpg')} style={styles.bg} resizeMode="cover">
      <View style={styles.overlay} />
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.card}>
          {/* Logo */}
          <View style={styles.logoRow}>
            <Text style={styles.logoEzy}>Ezy</Text>
            <View style={styles.logoOOm}>
              <View style={styles.circle} />
              <View style={[styles.circle, styles.circleOverlap]} />
            </View>
            <Text style={styles.logoM}>m</Text>
          </View>
          <Text style={styles.tagline}>Stock & Delivery</Text>

          <View style={styles.iconBox}>
            <Ionicons name="lock-closed" size={36} color="#29B6D8" />
          </View>

          <Text style={styles.title}>Nouveau mot de passe</Text>
          <Text style={styles.subtitle}>Choisissez un mot de passe sécurisé{'\n'}pour votre compte</Text>

          {!!error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color="#e53e3e" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Text style={styles.label}>Nouveau mot de passe</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#B0BCC8"
              secureTextEntry={!showPass}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPass(p => !p)} style={styles.eyeBtn}>
              <Ionicons name={showPass ? 'eye-off' : 'eye'} size={20} color="#8A9AAA" />
            </TouchableOpacity>
          </View>

          {password.length > 0 && (
            <View style={styles.strengthContainer}>
              <View style={styles.strengthBars}>
                {[0, 1, 2, 3].map(i => (
                  <View
                    key={i}
                    style={[
                      styles.strengthBar,
                      { backgroundColor: i < strength ? strengthColors[strength - 1] : '#E8EEF4' }
                    ]}
                  />
                ))}
              </View>
              <Text style={[styles.strengthLabel, { color: strengthColors[strength - 1] || '#8A9AAA' }]}>
                {password.length > 0 ? (strengthLabels[strength - 1] || 'Faible') : ''}
              </Text>
            </View>
          )}

          {/* Confirm Password */}
          <Text style={styles.label}>Confirmer le mot de passe</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#B0BCC8"
              secureTextEntry={!showConfirm}
              value={confirm}
              onChangeText={setConfirm}
            />
            <TouchableOpacity onPress={() => setShowConfirm(p => !p)} style={styles.eyeBtn}>
              <Ionicons name={showConfirm ? 'eye-off' : 'eye'} size={20} color="#8A9AAA" />
            </TouchableOpacity>
          </View>

          {confirm.length > 0 && (
            <View style={styles.matchRow}>
              <Ionicons
                name={password === confirm ? 'checkmark-circle' : 'close-circle'}
                size={16}
                color={password === confirm ? '#38a169' : '#e53e3e'}
              />
              <Text style={{ color: password === confirm ? '#38a169' : '#e53e3e', fontSize: 13, marginLeft: 4 }}>
                {password === confirm ? 'Les mots de passe correspondent' : 'Ne correspondent pas'}
              </Text>
            </View>
          )}

          <TouchableOpacity onPress={handleReset} disabled={loading} activeOpacity={0.85} style={{ width: '100%', marginTop: 8 }}>
            <LinearGradient colors={['#29B6D8', '#00D4F5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.button}>
              {loading ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Text style={styles.buttonText}>Réinitialiser</Text>
                  <Ionicons name="checkmark-done" size={20} color="#fff" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.divider} />
          <TouchableOpacity onPress={() => router.replace('/(auth)/login')} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={16} color="#8A9AAA" />
            <Text style={styles.backText}>Retour à la connexion</Text>
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
  tagline: { fontSize: 12, color: '#8A9AAA', marginBottom: 16, letterSpacing: 0.3 },
  iconBox: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#EAF8FC', justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 22, fontWeight: '800', color: '#29B6D8', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#8A9AAA', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff5f5',
    borderRadius: 10, padding: 10, marginBottom: 16, width: '100%', gap: 8,
  },
  errorText: { color: '#e53e3e', fontSize: 13, flex: 1 },
  label: { alignSelf: 'flex-start', fontWeight: '700', fontSize: 14, color: '#1A2940', marginBottom: 8 },
  inputWrapper: {
    width: '100%', borderWidth: 1.5, borderColor: '#DDE4EC',
    borderRadius: 14, marginBottom: 12, backgroundColor: '#F8FAFC',
    flexDirection: 'row', alignItems: 'center',
  },
  input: { flex: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#1A2940' },
  eyeBtn: { paddingHorizontal: 14 },
  strengthContainer: { flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: 16, gap: 8 },
  strengthBars: { flexDirection: 'row', gap: 4, flex: 1 },
  strengthBar: { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel: { fontSize: 12, fontWeight: '600', width: 40, textAlign: 'right' },
  matchRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginBottom: 8 },
  button: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, borderRadius: 50, paddingVertical: 16, marginBottom: 20,
  },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  divider: { width: '100%', height: 1, backgroundColor: '#E8EEF4', marginBottom: 16 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { fontSize: 14, color: '#8A9AAA' },
});