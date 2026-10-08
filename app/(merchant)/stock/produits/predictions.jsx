import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import api from '../../../../utils/api';
import { loadSession } from '../../../../utils/auth';
import { loadDarkMode, saveDarkMode } from '../../../../utils/darkMode';
import { DARK_BG, TEAL } from '../../../../utils/theme';
import AppFooter from '../../../components/AppFooter';
import AppHeader from '../../../components/AppHeader';


const URGENCY = {
  critique: { label: 'Critique', icon: 'alert-circle', bg: '#FDECEA', dark: '#3A1D1B', border: '#E74C3C', text: '#C0392B', dot: '#E74C3C' },
  urgent: { label: 'Urgent', icon: 'warning', bg: '#FEF5E7', dark: '#3A2E1A', border: '#E67E22', text: '#B9770E', dot: '#E67E22' },
  'bientôt': { label: 'Bientôt', icon: 'time', bg: '#FEF9E7', dark: '#3A371A', border: '#F1C40F', text: '#9A7D0A', dot: '#F1C40F' },
  ok: { label: 'OK', icon: 'checkmark-circle', bg: '#EAFAF1', dark: '#1A3A2A', border: '#27AE60', text: '#1E8449', dot: '#27AE60' },
};

const MODEL_INFO = {
  prophet: { label: 'Prophet', icon: 'analytics', color: '#8E44AD' },
  linear: { label: 'Régression linéaire', icon: 'trending-up', color: '#2980B9' },
  moving_average: { label: 'Moyenne mobile', icon: 'stats-chart', color: '#16A085' },
  linear_prophet_rejected: { label: 'Régression (Prophet rejeté)', icon: 'shield-checkmark', color: '#D35400' },
  linear_prophet_failed: { label: 'Régression (fallback)', icon: 'warning', color: '#D35400' },
  none: { label: 'Aucun modèle', icon: 'help-circle', color: '#95A5A6' },
};

const CONFIDENCE_INFO = {
  'élevée': { label: 'Élevée', color: '#27AE60', dot: '#27AE60' },
  'moyenne': { label: 'Moyenne', color: '#F39C12', dot: '#F39C12' },
  'faible': { label: 'Faible', color: '#E67E22', dot: '#E67E22' },
  'très faible': { label: 'Très faible', color: '#E74C3C', dot: '#E74C3C' },
  'aucune': { label: 'Aucune', color: '#95A5A6', dot: '#95A5A6' },
};

export default function PredictionsScreen() {
  const [session, setSession] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [summary, setSummary] = useState({ critique: 0, urgent: 0, 'bientôt': 0, ok: 0 });
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('all');

  const bg = darkMode ? DARK_BG : '#EEF4F8';
  const card = darkMode ? '#1A2A3D' : '#FFFFFF';
  const txt = darkMode ? '#FFFFFF' : '#0D1B2A';
  const sub = darkMode ? '#8899AA' : '#6A7A8A';

  useFocusEffect(
    useCallback(() => {
      loadDarkMode().then(setDarkMode);
      loadSession().then(s => {
        setSession(s);
        if (s) fetchPredictions();
        else { setLoading(false); setError('Session introuvable.'); }
      });
    }, [])
  );

  const fetchPredictions = async () => {
    setError(null);
    try {
      const json = await api.get('/api/prediction/index.php?type=restock&days=30');
      if (json.success) {
        const data = json.data ?? {};
        setSummary(data.summary ?? { critique: 0, urgent: 0, 'bientôt': 0, ok: 0 });
        setItems(data.items ?? []);
      } else {
        setError(json.message ?? "Impossible de charger les prédictions.");
      }
    } catch (netErr) {
      setError("Service d'analyse indisponible: " + netErr.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    if (session) fetchPredictions();
  };

  const visibleItems = filter === 'all'
    ? items
    : items.filter(it => it.urgency === filter);

  const actionCount = (summary.critique ?? 0) + (summary.urgent ?? 0) + (summary['bientôt'] ?? 0);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
      <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} />
      <AppHeader
        session={session}
        darkMode={darkMode}
        onToggleDark={() => setDarkMode(d => { const nv = !d; saveDarkMode(nv); return nv; })}
        onLogout={() => router.replace('/(auth)/login')}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TEAL} />}
      >
        <View style={styles.titleRow}>
          <View style={styles.titleIcon}>
            <Ionicons name="sparkles" size={20} color={TEAL} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.pageTitle, { color: txt }]}>Prédictions IA</Text>
            <Text style={[styles.pageSub, { color: sub }]}>
              Réapprovisionnement intelligent basé sur vos ventes
            </Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color={TEAL} style={{ marginTop: 60 }} size="large" />
        ) : error ? (
          <View style={[styles.card, { backgroundColor: card }]}>
            <Ionicons name="cloud-offline-outline" size={40} color={sub} style={{ alignSelf: 'center' }} />
            <Text style={[styles.errorTxt, { color: sub }]}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={onRefresh}>
              <Text style={styles.retryTxt}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={[styles.banner, { backgroundColor: card }]}>
              <Text style={[styles.bannerBig, { color: actionCount > 0 ? '#E67E22' : '#27AE60' }]}>
                {actionCount}
              </Text>
              <Text style={[styles.bannerLabel, { color: txt }]}>
                {actionCount > 0
                  ? `produit${actionCount > 1 ? 's' : ''} à réapprovisionner`
                  : 'Tout est bien approvisionné'}
              </Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              <FilterChip
                active={filter === 'all'} onPress={() => setFilter('all')}
                label="Tous" count={items.length} color={TEAL} darkMode={darkMode}
              />
              {['critique', 'urgent', 'bientôt', 'ok'].map(k => (
                <FilterChip
                  key={k}
                  active={filter === k} onPress={() => setFilter(k)}
                  label={URGENCY[k].label} count={summary[k] ?? 0}
                  color={URGENCY[k].border} darkMode={darkMode}
                />
              ))}
            </ScrollView>

            {visibleItems.length === 0 ? (
              <Text style={[styles.emptyTxt, { color: sub }]}>Aucun produit dans cette catégorie.</Text>
            ) : (
              visibleItems.map(it => {
                const u = URGENCY[it.urgency] ?? URGENCY.ok;
                const cardBg = darkMode ? u.dark : u.bg;
                return (
                  <View key={it.id_prod} style={[styles.itemCard, { backgroundColor: card, borderLeftColor: u.border }]}>
                    <View style={styles.itemTop}>
                      <Text style={[styles.itemName, { color: txt }]} numberOfLines={1}>{it.nom}</Text>
                      <View style={[styles.badge, { backgroundColor: cardBg, borderColor: u.border }]}>
                        <Ionicons name={u.icon} size={12} color={u.text} />
                        <Text style={[styles.badgeTxt, { color: u.text }]}>{u.label}</Text>
                      </View>
                    </View>

                    <View style={styles.statRow}>
                      <Stat label="Stock actuel" value={fmtStock(it.current_stock)} sub={sub} txt={txt} />
                      <Stat label="Ventes/jour" value={String(it.daily_rate ?? 0)} sub={sub} txt={txt} />
                      <Stat
                        label="Rupture dans"
                        value={it.days_until_stockout != null ? `${it.days_until_stockout} j` : '—'}
                        sub={sub} txt={txt}
                      />
                    </View>

                    {it.model_used && it.model_used !== 'none' && (
                      <View style={styles.modelRow}>
                        <View style={styles.modelChip}>
                          <Ionicons
                            name={(MODEL_INFO[it.model_used] ?? MODEL_INFO.none).icon}
                            size={11}
                            color={(MODEL_INFO[it.model_used] ?? MODEL_INFO.none).color}
                          />
                          <Text style={[styles.modelChipTxt, { color: (MODEL_INFO[it.model_used] ?? MODEL_INFO.none).color }]}>
                            {(MODEL_INFO[it.model_used] ?? MODEL_INFO.none).label}
                          </Text>
                        </View>
                        <View style={styles.confChip}>
                          <View style={[styles.confDot, { backgroundColor: (CONFIDENCE_INFO[it.confidence] ?? CONFIDENCE_INFO.aucune).dot }]} />
                          <Text style={[styles.confTxt, { color: sub }]}>
                            Fiabilité : <Text style={{ color: (CONFIDENCE_INFO[it.confidence] ?? CONFIDENCE_INFO.aucune).color, fontWeight: '700' }}>
                              {(CONFIDENCE_INFO[it.confidence] ?? CONFIDENCE_INFO.aucune).label}
                            </Text>
                          </Text>
                        </View>
                      </View>
                    )}

                    {it.recommended_order_qty > 0 ? (
                      <View style={[styles.recoBox, { backgroundColor: cardBg }]}>
                        <Ionicons name="cart" size={16} color={u.text} />
                        <Text style={[styles.recoTxt, { color: u.text }]}>
                          Commander <Text style={{ fontWeight: '800' }}>{it.recommended_order_qty} unités</Text>
                        </Text>
                      </View>
                    ) : (
                      <View style={[styles.recoBox, { backgroundColor: darkMode ? '#1A3A2A' : '#EAFAF1' }]}>
                        <Ionicons name="checkmark-circle" size={16} color="#1E8449" />
                        <Text style={[styles.recoTxt, { color: '#1E8449' }]}>Stock suffisant</Text>
                      </View>
                    )}
                  </View>
                );
              })
            )}

            <Text style={[styles.footnote, { color: sub }]}>
              Prédictions calculées sur l'historique des ventes (hors commandes annulées).
              La fiabilité augmente avec le volume de données.
            </Text>
          </>
        )}
      </ScrollView>

      <AppFooter />
    </SafeAreaView>
  );
}

function FilterChip({ active, onPress, label, count, color, darkMode }) {
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        { borderColor: color, backgroundColor: active ? color : (darkMode ? '#1A2A3D' : '#FFFFFF') },
      ]}
      onPress={onPress}
    >
      <Text style={[styles.chipTxt, { color: active ? '#FFFFFF' : color }]}>
        {label} ({count})
      </Text>
    </TouchableOpacity>
  );
}

function Stat({ label, value, sub, txt }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statLabel, { color: sub }]}>{label}</Text>
      <Text style={[styles.statValue, { color: txt }]}>{value}</Text>
    </View>
  );
}

function fmtStock(v) {
  const n = Number(v ?? 0);
  return Number.isInteger(n) ? String(n) : n.toFixed(0);
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingBottom: 90 },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 16, gap: 12 },
  titleIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#E8F7FB', alignItems: 'center', justifyContent: 'center' },
  pageTitle: { fontSize: 22, fontWeight: '800' },
  pageSub: { fontSize: 12, marginTop: 2 },

  card: { borderRadius: 16, padding: 24, marginBottom: 16 },
  errorTxt: { textAlign: 'center', marginTop: 12, marginBottom: 16, fontSize: 14 },
  retryBtn: { alignSelf: 'center', backgroundColor: TEAL, borderRadius: 22, paddingHorizontal: 24, paddingVertical: 10 },
  retryTxt: { color: '#fff', fontWeight: '700' },

  banner: { borderRadius: 16, padding: 20, marginBottom: 14, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  bannerBig: { fontSize: 44, fontWeight: '900' },
  bannerLabel: { fontSize: 14, fontWeight: '600', marginTop: 2 },

  chipRow: { marginBottom: 16 },
  chip: { borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, marginRight: 8 },
  chipTxt: { fontSize: 13, fontWeight: '700' },

  itemCard: { borderRadius: 14, padding: 16, marginBottom: 12, borderLeftWidth: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  itemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  itemName: { fontSize: 15, fontWeight: '700', flex: 1, marginRight: 10 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4 },
  badgeTxt: { fontSize: 11, fontWeight: '700' },

  statRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  stat: { flex: 1 },
  statLabel: { fontSize: 11, marginBottom: 2 },
  statValue: { fontSize: 16, fontWeight: '800' },

  recoBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  recoTxt: { fontSize: 13, fontWeight: '600' },

  emptyTxt: { textAlign: 'center', marginVertical: 40, fontSize: 14 },
  footnote: { fontSize: 11, marginTop: 16, lineHeight: 16, fontStyle: 'italic' },

  modelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
    flexWrap: 'wrap'
  },
  modelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(142, 68, 173, 0.08)'
  },
  modelChipTxt: {
    fontSize: 11,
    fontWeight: '700'
  },
  confChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  confDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  confTxt: {
    fontSize: 11
  },
});