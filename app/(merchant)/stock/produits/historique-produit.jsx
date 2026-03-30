import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { API_URL } from '../../../../config';
import { loadSession } from '../../../../utils/auth';
import AppFooter from '../../../components/AppFooter';
import AppHeader from '../../../components/AppHeader';

const TEAL = '#29B6D8';
const DARK_BG = '#0F1B2D';

export default function HistoriqueProduitScreen() {
  const { id, nom } = useLocalSearchParams();
  const [session, setSession]     = useState(null);
  const [darkMode, setDarkMode]   = useState(false);
  const [loading, setLoading]     = useState(true);
  const [mouvements, setMouvements] = useState([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit]                   = useState(4);
  const [search, setSearch]       = useState('');

  const bg   = darkMode ? DARK_BG  : '#EEF4F8';
  const card = darkMode ? '#1A2A3D' : '#FFFFFF';
  const txt  = darkMode ? '#FFFFFF' : '#0D1B2A';
  const sub  = darkMode ? '#8899AA' : '#6A7A8A';

  useEffect(() => {
    loadSession().then(s => {
      setSession(s);
      if (s && id) fetchHistorique(s.token, 1);
    });
  }, []);

  const authHeaders = token => ({ 'X-Token': token, 'Content-Type': 'application/json' });

  const fetchHistorique = async (token, p = 1, q = search) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, limit });
      if (q) params.append('search', q);

      const res = await fetch(`${API_URL}/api/products/${id}/historique?${params}`, {
        headers: authHeaders(token),
      });
      const json = await res.json();
      if (json.success) {
        setMouvements(json.data?.mouvements ?? []);
        setTotal(json.data?.total ?? 0);
        setTotalPages(json.data?.pages ?? 1);
        setPage(p);
      }
    } catch (_) {
      Alert.alert('Erreur', 'Impossible de charger l\'historique.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    const date = d.toISOString().split('T')[0];
    const time = d.toTimeString().slice(0, 8);
    return `${date}\n${time}`;
  };

  const MotifBadge = ({ motif }) => {
    const isEntree = motif == '1' || motif === 'Entrée stock';
    return (
      <View style={[
        styles.badge,
        { backgroundColor: isEntree ? '#E8F8F0' : '#FDEDEC', borderColor: isEntree ? '#A9DFBF' : '#F1948A' },
      ]}>
        <Text style={[styles.badgeTxt, { color: isEntree ? '#27AE60' : '#E74C3C' }]}>
          {isEntree ? 'Entrée stock' : 'Sortie de stock'}
        </Text>
      </View>
    );
  };

  const Pagination = () => {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) pages.push(i);
    return (
      <View style={styles.paginationRow}>
        <Text style={[styles.paginationInfo, { color: sub }]}>
          Showing 1 to {Math.min(limit, mouvements.length)} of {total} entries
        </Text>
        <View style={styles.paginationBtns}>
          {pages.map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.pageBtn, p === page && { backgroundColor: TEAL }]}
              onPress={() => fetchHistorique(session.token, p)}
            >
              <Text style={{ color: p === page ? '#fff' : txt, fontWeight: '600' }}>{p}</Text>
            </TouchableOpacity>
          ))}
          {page < totalPages && (
            <TouchableOpacity
              style={styles.pageBtn}
              onPress={() => fetchHistorique(session.token, page + 1)}
            >
              <Text style={{ color: txt, fontWeight: '600' }}>›</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
      <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} />
      <AppHeader
        session={session} darkMode={darkMode}
        onToggleDark={() => setDarkMode(d => !d)}
        onLogout={() => router.replace('/(auth)/login')}
      />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.breadcrumbRow}>
          <Text style={[styles.breadcrumb, { color: sub }]}>Ezycom › Stock › </Text>
          <Text style={[styles.breadcrumb, { color: TEAL, fontWeight: '700' }]}>Historique</Text>
        </View>
        <Text style={[styles.pageTitle, { color: txt }]}>Historique produit</Text>

        <View style={[styles.card, { backgroundColor: card }]}>
          <Text style={[styles.cardTitle, { color: txt }]}>Historique produit</Text>
          {nom ? <Text style={[styles.prodNomTxt, { color: TEAL }]}>{nom}</Text> : null}

          <View style={styles.filterRow}>
            <View style={[styles.limitBox, { borderColor: '#CBD5E0' }]}>
              <Text style={{ color: txt, fontSize: 13 }}>{limit}</Text>
              <Ionicons name="chevron-down" size={13} color={sub} />
            </View>
            <Text style={[styles.filterLabel, { color: sub }]}>entries per page</Text>
            <View style={[styles.searchBox, { borderColor: '#CBD5E0', backgroundColor: card }]}>
              <TextInput
                style={[styles.searchInput, { color: txt }]}
                placeholder="Search..."
                placeholderTextColor={sub}
                value={search}
                onChangeText={setSearch}
                onSubmitEditing={() => fetchHistorique(session?.token, 1)}
                returnKeyType="search"
              />
              <Ionicons name="search-outline" size={16} color={sub} />
            </View>
          </View>

          <View style={[styles.colHeader, { borderBottomColor: '#E2E8F0' }]}>
            <Text style={[styles.colTxt, { color: sub, flex: 2 }]}>Date</Text>
            <Text style={[styles.colTxt, { color: sub, flex: 2 }]}>Motif</Text>
            <Text style={[styles.colTxt, { color: sub, flex: 2.5 }]}>Raison</Text>
            <Text style={[styles.colTxt, { color: sub, flex: 0.8, textAlign: 'right' }]}>Qté</Text>
          </View>

          {loading ? (
            <ActivityIndicator color={TEAL} style={{ marginVertical: 30 }} />
          ) : mouvements.length === 0 ? (
            <Text style={[styles.emptyTxt, { color: sub }]}>Aucun mouvement de stock trouvé.</Text>
          ) : (
            mouvements.map(m => (
              <View key={m.id} style={[styles.mvtRow, { borderBottomColor: '#E2E8F0' }]}>
                <Text style={[styles.dateTxt, { color: txt, flex: 2 }]}>{formatDate(m.date)}</Text>
                <View style={{ flex: 2 }}>
                  <MotifBadge motif={m.motif} />
                </View>
                <Text style={[styles.raisonTxt, { color: txt, flex: 2.5 }]} numberOfLines={2}>
                  {m.raison || '—'}
                </Text>
                <Text style={[styles.qteTxt, { color: txt, flex: 0.8 }]}>{m.qte}</Text>
              </View>
            ))
          )}

          <Pagination />
        </View>
      </ScrollView>
      <AppFooter />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:           { flex: 1 },
  scroll:         { paddingHorizontal: 16, paddingBottom: 80 },
  breadcrumbRow:  { flexDirection: 'row', marginTop: 14, marginBottom: 4 },
  breadcrumb:     { fontSize: 12 },
  pageTitle:      { fontSize: 22, fontWeight: '800', marginBottom: 14 },
  card:           { borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  cardTitle:      { fontSize: 17, fontWeight: '800', marginBottom: 4 },
  prodNomTxt:     { fontSize: 13, fontWeight: '600', marginBottom: 14 },
  filterRow:      { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 8 },
  limitBox:       { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, gap: 4 },
  filterLabel:    { fontSize: 13 },
  searchBox:      { flex: 1, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  searchInput:    { flex: 1, fontSize: 13 },
  colHeader:      { flexDirection: 'row', paddingBottom: 8, borderBottomWidth: 1, marginBottom: 4 },
  colTxt:         { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  emptyTxt:       { textAlign: 'center', marginVertical: 30, fontSize: 14 },
  mvtRow:         { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1 },
  dateTxt:        { fontSize: 12, lineHeight: 18 },
  raisonTxt:      { fontSize: 13 },
  qteTxt:         { fontSize: 15, fontWeight: '800', textAlign: 'right' },
  badge:          { borderRadius: 20, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start' },
  badgeTxt:       { fontSize: 11, fontWeight: '700' },
  paginationRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  paginationInfo: { fontSize: 12 },
  paginationBtns: { flexDirection: 'row', gap: 6 },
  pageBtn:        { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0F4F8' },
});