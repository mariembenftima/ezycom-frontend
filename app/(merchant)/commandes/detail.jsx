import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useGlobalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_URL } from '../../../config';
import { loadSession } from '../../../utils/auth';
import { loadDarkMode, saveDarkMode } from '../../../utils/darkMode';
import AppFooter from '../../components/AppFooter';
import AppHeader from '../../components/AppHeader';

const TEAL = '#29B6D8';

const LIGHT = { bg: '#F9FAFB', card: '#fff', border: '#E5E7EB', text: '#111827', sub: '#6B7280', searchBg: '#F3F4F6' };
const DARK  = { bg: '#0A1525', card: '#0F2035', border: '#1E3A50', text: '#E2EEF8', sub: '#5A8A9A', searchBg: '#152D42' };

const STATUTS = [
    { etat: null, label: 'Tous',       color: '#6B7280', bg: '#F3F4F6' },
    { etat: 0,    label: 'En attente', color: '#D97706', bg: '#FEF3C7' },
    { etat: 1,    label: 'Confirmée',  color: '#2563EB', bg: '#DBEAFE' },
    { etat: 2,    label: 'Dispatché',  color: '#7C3AED', bg: '#EDE9FE' },
    { etat: 5,    label: 'Livrée',     color: '#059669', bg: '#D1FAE5' },
    { etat: 7,    label: 'Annulée',    color: '#DC2626', bg: '#FEE2E2' },
];

const getStatut = (etat) => STATUTS.find(s => s.etat === parseInt(etat)) || STATUTS[0];

const CommandeCard = ({ item, T }) => {
    const statut = getStatut(item.etat);
    const date   = item.date_add ? new Date(item.date_add).toLocaleDateString('fr-FR') : '';
    const client = [item.nom, item.prenom].filter(Boolean).join(' ') || 'Client inconnu';
    const total  = item.prix ? `${parseFloat(item.prix).toFixed(3)} TND` : '—';

    return (
        <View style={[styles.card, { backgroundColor: T.card, borderColor: T.border }]}>
            <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.cardRef, { color: T.sub }]}>#{item.code_barre || item.id}</Text>
                    <Text style={[styles.cardClient, { color: T.text }]}>{client}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: statut.bg }]}>
                    <Text style={[styles.badgeText, { color: statut.color }]}>{statut.label}</Text>
                </View>
            </View>
            <View style={styles.cardBottom}>
                <Text style={[styles.cardMeta, { color: T.sub }]}>{item.nb_articles} article{item.nb_articles > 1 ? 's' : ''}</Text>
                <Text style={[styles.cardMeta, { color: T.sub }]}>{item.ville || '—'}</Text>
                <Text style={styles.cardTotal}>{total}</Text>
                <Text style={[styles.cardDate, { color: T.sub }]}>{date}</Text>
            </View>
        </View>
    );
};

export default function CommandesScreen() {
    const { etat: etatParam } = useGlobalSearchParams();

    const [session,     setSession]     = useState(null);
    const [darkMode,    setDarkMode]    = useState(false);
    const [token,       setToken]       = useState(null);
    const [commandes,   setCommandes]   = useState([]);
    const [stats,       setStats]       = useState({});
    const [loading,     setLoading]     = useState(true);
    const [refreshing,  setRefreshing]  = useState(false);
    const [search,      setSearch]      = useState('');
    const [filtreEtat,  setFiltreEtat]  = useState(etatParam !== undefined ? parseInt(etatParam) : null);
    const [page,        setPage]        = useState(1);
    const [hasMore,     setHasMore]     = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    const T = darkMode ? DARK : LIGHT;

    useEffect(() => { loadDarkMode().then(setDarkMode); }, []);

    useFocusEffect(
        useCallback(() => {
            (async () => {
                const s = await loadSession();
                if (!s?.token) { router.replace('/(auth)/login'); return; }
                setSession(s);
                setToken(s.token);
                const etat = etatParam !== undefined ? parseInt(etatParam) : null;
                setFiltreEtat(etat);
                fetchCommandes(s.token, 1, etat, '');
            })();
        }, [etatParam])
    );

    const fetchCommandes = async (tok, p = 1, etat = filtreEtat, q = search, append = false) => {
        if (!append) setLoading(true);
        else setLoadingMore(true);
        try {
            let url = `${API_URL}/api/orders/orders-list.php?page=${p}&limit=20`;
            if (etat !== null && etat !== undefined) url += `&etat=${etat}`;
            if (q) url += `&search=${encodeURIComponent(q)}`;
            const res  = await fetch(url, { headers: { 'X-Token': tok } });
            const data = await res.json();
            if (data.success) {
                const list = Array.isArray(data.data?.commandes) ? data.data.commandes : [];
                setCommandes(prev => append ? [...prev, ...list] : list);
                setStats(data.data?.stats || {});
                setHasMore(p < (data.data?.pages || 1));
                setPage(p);
            }
        } catch (_) {}
        finally { setLoading(false); setLoadingMore(false); setRefreshing(false); }
    };

    const onRefresh      = () => { setRefreshing(true); fetchCommandes(token, 1, filtreEtat, search); };
    const onFiltreChange = (etat) => { setFiltreEtat(etat); setCommandes([]); fetchCommandes(token, 1, etat, search); };
    const onSearchChange = (q) => { setSearch(q); if (q.length === 0 || q.length >= 3) fetchCommandes(token, 1, filtreEtat, q); };
    const loadMore       = () => { if (!hasMore || loadingMore) return; fetchCommandes(token, page + 1, filtreEtat, search, true); };

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]}>
            <AppHeader
                session={session} darkMode={darkMode}
                onToggleDark={() => { const next = !darkMode; setDarkMode(next); saveDarkMode(next); }}
                onLogout={() => router.replace('/(auth)/login')}
            />

            <View style={[styles.statsRow, { backgroundColor: T.card, borderBottomColor: T.border }]}>
                <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
                    <Text style={[styles.statVal, { color: '#D97706' }]}>{stats.en_attente || 0}</Text>
                    <Text style={[styles.statLbl, { color: T.sub }]}>En attente</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: '#DBEAFE' }]}>
                    <Text style={[styles.statVal, { color: '#2563EB' }]}>{stats.confirmee || 0}</Text>
                    <Text style={[styles.statLbl, { color: T.sub }]}>Confirmées</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: '#D1FAE5' }]}>
                    <Text style={[styles.statVal, { color: '#059669' }]}>{stats.livree || 0}</Text>
                    <Text style={[styles.statLbl, { color: T.sub }]}>Livrées</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: '#FEE2E2' }]}>
                    <Text style={[styles.statVal, { color: '#DC2626' }]}>{stats.annulee || 0}</Text>
                    <Text style={[styles.statLbl, { color: T.sub }]}>Annulées</Text>
                </View>
            </View>

            <View style={[styles.searchRow, { backgroundColor: T.card, borderBottomColor: T.border }]}>
                <View style={[styles.searchWrap, { backgroundColor: T.searchBg }]}>
                    <Ionicons name="search-outline" size={16} color={T.sub} style={{ marginRight: 6 }} />
                    <TextInput
                        style={[styles.searchInput, { color: T.text }]}
                        placeholder="Rechercher..."
                        placeholderTextColor={T.sub}
                        value={search}
                        onChangeText={onSearchChange}
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => onSearchChange('')}>
                            <Ionicons name="close-circle" size={16} color={T.sub} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.filtresRow, { backgroundColor: T.card, borderBottomColor: T.border }]} contentContainerStyle={{ gap: 8, paddingHorizontal: 12 }}>
                {STATUTS.map((s, i) => (
                    <TouchableOpacity
                        key={i}
                        style={[styles.filtreChip, { borderColor: T.border, backgroundColor: T.bg }, filtreEtat === s.etat && { backgroundColor: s.bg, borderColor: s.color }]}
                        onPress={() => onFiltreChange(s.etat)}
                    >
                        <Text style={[styles.filtreText, { color: T.sub }, filtreEtat === s.etat && { color: s.color, fontWeight: '700' }]}>
                            {s.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {loading ? (
                <View style={styles.center}><ActivityIndicator color={TEAL} size="large" /></View>
            ) : commandes.length === 0 ? (
                <View style={styles.center}>
                    <Ionicons name="clipboard-outline" size={48} color={T.border} />
                    <Text style={[styles.emptyText, { color: T.sub }]}>Aucune commande trouvée</Text>
                </View>
            ) : (
                <FlatList
                    data={commandes}
                    keyExtractor={item => String(item.id)}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TEAL} />}
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.3}
                    ListFooterComponent={loadingMore ? <ActivityIndicator color={TEAL} style={{ marginVertical: 12 }} /> : null}
                    renderItem={({ item }) => <CommandeCard item={item} T={T} />}
                />
            )}

            <AppFooter darkMode={darkMode} />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe:        { flex: 1 },
    statsRow:    { flexDirection: 'row', gap: 8, padding: 12, borderBottomWidth: 1 },
    statCard:    { flex: 1, borderRadius: 8, padding: 8, alignItems: 'center' },
    statVal:     { fontSize: 18, fontWeight: '700' },
    statLbl:     { fontSize: 9, marginTop: 2 },
    searchRow:   { paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1 },
    searchWrap:  { flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9 },
    searchInput: { flex: 1, fontSize: 13 },
    filtresRow:  { paddingVertical: 8, borderBottomWidth: 1, maxHeight: 52 },
    filtreChip:  { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
    filtreText:  { fontSize: 12 },
    list:        { padding: 12, gap: 10 },
    center:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
    emptyText:   { fontSize: 14 },
    card:        { borderRadius: 12, padding: 14, borderWidth: 1 },
    cardTop:     { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
    cardRef:     { fontSize: 12, marginBottom: 2 },
    cardClient:  { fontSize: 14, fontWeight: '600' },
    cardBottom:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
    cardMeta:    { fontSize: 11 },
    cardTotal:   { flex: 1, fontSize: 13, fontWeight: '700', color: TEAL, textAlign: 'right' },
    cardDate:    { fontSize: 11 },
    badge:       { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    badgeText:   { fontSize: 12, fontWeight: '600' },
});