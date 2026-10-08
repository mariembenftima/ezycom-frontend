import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  StatusBar,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { registerFcmToken } from '../../utils/notifications';

const { width } = Dimensions.get('window');

const PLAN_COLORS = {
  gratuit:    '#64748b',
  essor:      '#29B6D8',
  prosperite: '#a855f7',
  empire:     '#e85d3a',
};

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function WelcomeScreen() {
  const params    = useLocalSearchParams();
  const userName  = params.name     || 'Utilisateur';
  const shopName  = params.shopName || 'Ma Boutique';
  const plan      = params.plan     || 'gratuit';
  const initials  = getInitials(userName);
  const planColor = PLAN_COLORS[plan] ?? '#29B6D8';

  useEffect(() => {
    registerFcmToken();
  }, []);

  const logoOpacity   = useRef(new Animated.Value(0)).current;
  const cardTranslate = useRef(new Animated.Value(60)).current;
  const cardOpacity   = useRef(new Animated.Value(0)).current;
  const avatarScale   = useRef(new Animated.Value(0.4)).current;
  const nameOpacity   = useRef(new Animated.Value(0)).current;
  const statsOpacity  = useRef(new Animated.Value(0)).current;
  const progressWidth = useRef(new Animated.Value(0)).current;
  const dot1          = useRef(new Animated.Value(0.3)).current;
  const dot2          = useRef(new Animated.Value(0.3)).current;
  const dot3          = useRef(new Animated.Value(0.3)).current;
  const ringScale     = useRef(new Animated.Value(0.8)).current;
  const ringOpacity   = useRef(new Animated.Value(0)).current;

  const [progressDone, setProgressDone] = useState(false);

  useEffect(() => {
    if (progressDone) {
      const nav = setTimeout(() => router.replace('/(merchant)/dashboard'), 500);
      return () => clearTimeout(nav);
    }
  }, [progressDone]);

  useEffect(() => {
    const dotLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(dot1, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(dot2, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(dot3, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(dot1, { toValue: 0.3, duration: 400, useNativeDriver: true }),
        Animated.timing(dot2, { toValue: 0.3, duration: 400, useNativeDriver: true }),
        Animated.timing(dot3, { toValue: 0.3, duration: 400, useNativeDriver: true }),
      ])
    );

    Animated.sequence([
      Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.parallel([
        Animated.spring(cardTranslate, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
        Animated.timing(cardOpacity,   { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
      Animated.spring(avatarScale, { toValue: 1, tension: 80, friction: 6, useNativeDriver: true }),
      Animated.timing(nameOpacity,  { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(statsOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(ringScale,    { toValue: 1, tension: 60, friction: 7, useNativeDriver: true }),
        Animated.timing(ringOpacity,  { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
    ]).start(() => {
      dotLoop.start();
      Animated.timing(progressWidth, {
        toValue: width - 80,
        duration: 3700,
        useNativeDriver: false,
      }).start(() => {
        dotLoop.stop();
        setProgressDone(true);
      });
    });
  }, []);

  return (
    <LinearGradient colors={['#0a1628', '#0f2540', '#1a3a5c']} style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <Animated.View style={[styles.logoRow, { opacity: logoOpacity }]}>
        <Text style={styles.logoEzy}>Ezy</Text>
        <Text style={styles.logoCom}>com</Text>
        <Text style={styles.logoTag}>  Stock & Delivery</Text>
      </Animated.View>

      <Animated.View style={[styles.card, { opacity: cardOpacity, transform: [{ translateY: cardTranslate }] }]}>

        <View style={styles.avatarWrap}>
          <Animated.View style={[styles.ring, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]} />
          <Animated.View style={[styles.avatar, { transform: [{ scale: avatarScale }] }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </Animated.View>
        </View>

        <Animated.View style={{ opacity: nameOpacity, alignItems: 'center' }}>
          <Text style={styles.welcomeLabel}>Bienvenue,</Text>
          <Text style={styles.userName}>{userName}</Text>
          <View style={[styles.planBadge, { backgroundColor: planColor + '22', borderColor: planColor }]}>
            <Text style={[styles.planText, { color: planColor }]}>{plan.toUpperCase()}</Text>
          </View>
        </Animated.View>

        <Animated.View style={[styles.shopRow, { opacity: statsOpacity }]}>
          <Text style={styles.shopIcon}>🏪</Text>
          <Text style={styles.shopName}>{shopName}</Text>
        </Animated.View>

        <View style={styles.progressWrap}>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressBar, { width: progressWidth, backgroundColor: planColor }]} />
          </View>
          <View style={styles.dotsRow}>
            {[dot1, dot2, dot3].map((dot, i) => (
              <Animated.View key={i} style={[styles.dot, { opacity: dot, backgroundColor: planColor }]} />
            ))}
          </View>
          <Text style={styles.loadingText}>Chargement de votre espace...</Text>
        </View>

      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  logoRow:   { flexDirection: 'row', alignItems: 'baseline', marginBottom: 40 },
  logoEzy:   { fontSize: 34, fontWeight: '800', color: '#fff' },
  logoCom:   { fontSize: 34, fontWeight: '800', color: '#29B6D8' },
  logoTag:   { fontSize: 11, color: '#4a7a9a', marginLeft: 6 },
  card: {
    width: '100%', backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 28, padding: 32, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  avatarWrap:  { position: 'relative', marginBottom: 20, alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute', width: 100, height: 100, borderRadius: 50,
    borderWidth: 2, borderColor: 'rgba(41,182,216,0.4)',
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#29B6D8', alignItems: 'center', justifyContent: 'center',
  },
  avatarText:   { fontSize: 28, fontWeight: '800', color: '#fff' },
  welcomeLabel: { fontSize: 14, color: '#8ab0c8', marginBottom: 4 },
  userName:     { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 10 },
  planBadge:    { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 4, borderWidth: 1.5, marginBottom: 20 },
  planText:     { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  shopRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 32 },
  shopIcon:     { fontSize: 18 },
  shopName:     { fontSize: 15, color: '#c8dde8', fontWeight: '600' },
  progressWrap: { width: '100%', alignItems: 'center' },
  progressTrack:{ width: '100%', height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden', marginBottom: 12 },
  progressBar:  { height: '100%', borderRadius: 2 },
  dotsRow:      { flexDirection: 'row', gap: 6, marginBottom: 8 },
  dot:          { width: 7, height: 7, borderRadius: 4 },
  loadingText:  { fontSize: 12, color: '#5a8a9a' },
});