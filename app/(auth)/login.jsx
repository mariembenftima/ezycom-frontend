import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { API_URL } from '../../config';
import { loadSession, saveSession } from '../../utils/auth';
const { height } = Dimensions.get('window');
const stoneTexture = require('../../assets/images/stone.jpg');

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioEnabled, setBioEnabled] = useState(false);

  const router = useRouter();

  const blockAnims = useRef([
    new Animated.Value(-300),
    new Animated.Value(-300),
    new Animated.Value(-300),
    new Animated.Value(-300),
  ]).current;

  useEffect(() => {
    Animated.stagger(120, blockAnims.map(anim =>
      Animated.spring(anim, { toValue: 0, tension: 60, friction: 7, useNativeDriver: true })
    )).start();
    (async () => {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      const enabled = await AsyncStorage.getItem('biometric_enabled');
      setBioAvailable(hasHardware && enrolled);
      setBioEnabled(enabled === 'true');
    })();
  }, []);

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      console.log('CALLING:', `${API_URL}/api/auth/login.php`);
      const res = await fetch(`${API_URL}/api/auth/login.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      console.log('STATUS:', res.status);
      const text = await res.text();
      console.log('RESPONSE:', text);
      const data = JSON.parse(text);

      if (data.success) {
        await saveSession({
          token: data.data.token,
          user: data.data.user,
          shop: data.data.shop,
        });
        router.push({
          pathname: '/(auth)/welcome',
          params: {
            name: data.data.user.name,
            shopName: data.data.shop.name,
            plan: data.data.shop.plan,
          },
        });
      } else {
        setError(data.message);
      }
    } catch (e) {
      console.log('LOGIN ERROR:', e);
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometric = async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Connectez-vous avec votre empreinte',
      fallbackLabel: 'Utiliser le mot de passe',
      cancelLabel: 'Annuler',
    });
    if (result.success) {
      const session = await loadSession();
      if (session?.token) {
        router.push({
          pathname: '/(auth)/welcome',
          params: {
            name: session.user?.name || '',
            shopName: session.shop?.name || '',
            plan: session.shop?.plan || '',
          },
        });
      } else {
        setError("Aucune session sauvegardée. Connectez-vous d'abord.");
      }
    }
  };

  return (
    <>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

        <ImageBackground source={stoneTexture} style={styles.topSection} resizeMode="cover" imageStyle={styles.stoneImage}>
          <View style={styles.topOverlay} />
          <View style={styles.blocksRow}>
            {['S', 'A', 'L', 'E'].map((letter, index) => (
              <Animated.View key={letter} style={{ transform: [{ translateY: blockAnims[index] }] }}>
                <View style={[styles.woodBlock, { marginBottom: index * 6 }]}>
                  <View style={styles.blockTop} />
                  <Text style={styles.blockLetter}>{letter}</Text>
                </View>
              </Animated.View>
            ))}
          </View>
          <View style={styles.blockShadow} />
        </ImageBackground>

        <View style={styles.card}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            <View style={styles.logoRow}>
              <Text style={styles.logoEzy}>Ezy</Text>
              <Text style={styles.logoCom}>com</Text>
            </View>
            <Text style={styles.logoSub}>Stock & Delivery</Text>

            <Text style={styles.heading}>Se connecter</Text>
            <Text style={styles.subheading}>Connectez vous et boostez votre business</Text>

            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Votre identifiant"
                placeholderTextColor="#BDC3C7"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <View style={styles.inputIcon}>
                <View style={styles.envelopeOuter}><View style={styles.envelopeLine} /></View>
              </View>
            </View>

            <Text style={styles.label}>Mot de passe</Text>
            <View style={[styles.inputWrapper, styles.inputWrapperActive]}>
              <TextInput
                style={styles.input}
                placeholder="Mot de passe"
                placeholderTextColor="#BDC3C7"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
              />
              <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.inputIcon}>
                {showPass
                  ? <Text style={styles.eyeIcon}>👁</Text>
                  : <View style={styles.lockIcon}>
                    <View style={styles.lockBody} />
                    <View style={styles.lockShackle} />
                  </View>
                }
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.forgotRow} onPress={() => router.push('/(auth)/forgot-password')}>
              <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
            </TouchableOpacity>

            {error ? (
              <View style={styles.errorBox}><Text style={styles.errorText}>⚠ {error}</Text></View>
            ) : null}

            <TouchableOpacity onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
              <LinearGradient
                colors={['#29B6D8', '#00D4F5']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.button}
              >
                {loading
                  ? <ActivityIndicator color="white" size="small" />
                  : <View style={styles.buttonInner}>
                    <Text style={styles.buttonText}>Connexion</Text>
                    <Text style={styles.buttonArrow}>→</Text>
                  </View>
                }
              </LinearGradient>
            </TouchableOpacity>

            {bioAvailable && bioEnabled && (
              <TouchableOpacity style={styles.bioBtn} onPress={handleBiometric} activeOpacity={0.8}>
                <Text style={styles.bioIcon}>🪪</Text>
                <Text style={styles.bioText}>Connexion par empreinte digitale</Text>
              </TouchableOpacity>
            )}

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>ou</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.signupText}>
                Vous êtes nouveau et vous n'avez pas de compte ?{' '}
                <Text style={styles.signupLink}>Créer un compte</Text>
              </Text>
            </TouchableOpacity>

          </ScrollView>
        </View>

      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  topSection: { height: height * 0.46, alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' },
  stoneImage: { opacity: 0.85 },
  topOverlay: { position: 'absolute', width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.35)' },
  blocksRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 35, gap: 8 },
  woodBlock: { width: 64, height: 64, borderRadius: 7, backgroundColor: '#e8a820', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 2, height: 4 }, shadowOpacity: 0.5, shadowRadius: 4, elevation: 8 },
  blockTop: { position: 'absolute', top: 0, width: '100%', height: '50%', borderRadius: 7, backgroundColor: 'rgba(240,184,48,0.6)' },
  blockLetter: { fontSize: 32, fontWeight: 'bold', color: '#4a2e00', opacity: 0.9 },
  blockShadow: { width: 280, height: 14, borderRadius: 7, backgroundColor: 'rgba(0,0,0,0.4)', marginBottom: 8 },
  card: { flex: 1, backgroundColor: 'white', marginTop: -20, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 30, paddingTop: 28 },
  logoRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 2 },
  logoEzy: { fontSize: 30, fontWeight: '700', color: '#2d3436', letterSpacing: -0.5 },
  logoCom: { fontSize: 30, fontWeight: '700', color: '#29B6D8', letterSpacing: -0.5 },
  logoSub: { textAlign: 'center', fontSize: 11, color: '#95a5a6', letterSpacing: 1, marginBottom: 16 },
  heading: { textAlign: 'center', fontSize: 22, fontWeight: '700', color: '#29B6D8', marginBottom: 6 },
  subheading: { textAlign: 'center', fontSize: 12, color: '#95a5a6', marginBottom: 24 },
  label: { fontSize: 13, fontWeight: '600', color: '#2d3436', marginBottom: 6 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#e0e0e0', borderRadius: 10, marginBottom: 16, backgroundColor: 'white', paddingHorizontal: 16, height: 48 },
  inputWrapperActive: { borderColor: '#29B6D8', borderWidth: 2 },
  input: { flex: 1, fontSize: 13, color: '#2d3436' },
  inputIcon: { padding: 4, opacity: 0.35 },
  envelopeOuter: { width: 18, height: 14, borderWidth: 1.5, borderColor: '#2d3436', borderRadius: 2, justifyContent: 'center', paddingHorizontal: 2 },
  envelopeLine: { width: '100%', height: 1.5, backgroundColor: '#2d3436', transform: [{ rotate: '15deg' }] },
  lockIcon: { alignItems: 'center' },
  lockBody: { width: 14, height: 10, borderRadius: 2, borderWidth: 1.5, borderColor: '#2d3436' },
  lockShackle: { width: 8, height: 6, borderTopLeftRadius: 4, borderTopRightRadius: 4, borderWidth: 1.5, borderBottomWidth: 0, borderColor: '#2d3436', marginBottom: -1 },
  eyeIcon: { fontSize: 16 },
  forgotRow: { alignItems: 'flex-end', marginBottom: 16, marginTop: -8 },
  forgotText: { fontSize: 12, color: '#95a5a6' },
  errorBox: { backgroundColor: '#fff0f0', borderWidth: 1, borderColor: '#ffcccc', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 12 },
  errorText: { color: '#e74c3c', fontSize: 13 },
  button: { borderRadius: 26, height: 52, alignItems: 'center', justifyContent: 'center', shadowColor: '#29B6D8', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 8 },
  buttonInner: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  buttonText: { color: 'white', fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },
  buttonArrow: { color: 'white', fontSize: 18, fontWeight: '300' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e0e0e0' },
  dividerText: { fontSize: 11, color: '#bdc3c7' },
  signupText: { textAlign: 'center', fontSize: 11.5, color: '#7f8c8d', marginBottom: 30 },
  signupLink: { color: '#29B6D8', fontWeight: '700' },
  bioBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 14, borderWidth: 1.5, borderColor: '#29B6D8', borderRadius: 26, height: 52 },
  bioIcon: { fontSize: 22 },
  bioText: { fontSize: 13, fontWeight: '600', color: '#29B6D8' },
});