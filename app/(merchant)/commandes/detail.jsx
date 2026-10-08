import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useGlobalSearchParams } from 'expo-router';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
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
import api from '../../../utils/api';
import { loadSession } from '../../../utils/auth';
import { loadDarkMode, saveDarkMode } from '../../../utils/darkMode';
import { DARK, LIGHT, TEAL } from '../../../utils/theme';
import { ORDER_STATUS } from '../../../utils/orderStatus';
import AppFooter from '../../components/AppFooter';
import AppHeader from '../../components/AppHeader';

const STATUTS = [
    { etat: null, label: 'Tous', color: '#6B7280', bg: '#F3F4F6' },
    ...Object.entries(ORDER_STATUS).map(([etat, s]) => ({ etat: parseInt(etat), ...s })),
];

const getStatut = (etat) => STATUTS.find(s => s.etat === parseInt(etat)) || STATUTS[0];

const CommandeCard = memo(({ item, T }) => {
    const statut = getStatut(item.etat);
    const date   = item.date_add ? new Date(item.date_add).toLocaleDateString('fr-FR') : '';
    const client = [item.nom, item.prenom].filter(Boolean).join(' ') || 'Client inconnu';
    const total  = item.prix ? `${parseFloat(item.prix).toFixed(3)} TND` : '—';

    return (
        <TouchableOpacity
            style={[styles.card, { backgroundColor: T.card, borderColor: T.border }]}
            onPress={() => router.push(`/(merchant)/commandes/commande-detail?id=${item.id}`)}
            activeOpacity={0.8}
        >
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
        </TouchableOpacity>
    );
});

export default function CommandesScreen() {
    const { etat: etatParam } = useGlobalSearchParams();

    const [session,     setSession]     = useState(null);
    const [darkMode,    setDarkMode]    = useState(false);
    const [commandes,   setCommandes]   = useState([]);
    const [stats,       setStats]       = useState({});
    const [loading,     setLoading]     = useState(true);
    const [refreshing,  setRefreshing]  = useState(false);
    const [search,      setSearch]      = useState('');
    const [filtreEtat,  setFiltreEtat]  = useState(etatParam !== undefined ? parseInt(etatParam) : null);
    const [page,        setPage]        = useState(1);
    const [hasMore,     setHasMore]     = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const isLoadingRef = useRef(false);

    const T = darkMode ? DARK : LIGHT;

    useEffect(() => { loadDarkMode().then(setDarkMode); }, []);

    useFocusEffect(
        useCallback(() => {
            (async () => {
                const s = await loadSession();
                if (!s?.token) { router.replace('/(auth)/login'); return; }
                setSession(s);
                const etat = etatParam !== undefined ? parseInt(etatParam) : null;
                setFiltreEtat(etat);
                fetchCommandes(1, etat, '');
            })();
        }, [etatParam])
    );

    const fetchCommandes = async (p = 1, etat = filtreEtat, q = search, append = false) => {
        if (!append) setLoading(true);
        else setLoadingMore(true);
        try {
            let path = `/api/orders/orders-list.php?page=${p}&limit=20`;
            if (etat !== null && etat !== undefined) path += `&etat=${etat}`;
            if (q) path += `&search=${encodeURIComponent(q)}`;
            const data = await api.get(path);
            if (data.success) {
                const list = Array.isArray(data.data?.commandes) ? data.data.commandes : [];
                setCommandes(prev => {
                    if (!append) return list;
                    const map = new Map(prev.map(c => [c.id, c]));
                    list.forEach(c => map.set(c.id, c));
                    return Array.from(map.values());
                });
                setStats(data.data?.stats || {});
                setHasMore(p < (data.data?.pages || 1));
                setPage(p);
            }
        } catch (_) {}
        finally {
            setLoading(false);
            setLoadingMore(false);
            setRefreshing(false);
            isLoadingRef.current = false;
        }
    };

    const onRefresh      = () => { setRefreshing(true); fetchCommandes(1, filtreEtat, search); };
    const onFiltreChange = (etat) => { setFiltreEtat(etat); setCommandes([]); fetchCommandes(1, etat, search); };
    const onSearchChange = (q) => { setSearch(q); if (q.length === 0 || q.length >= 3) fetchCommandes(1, filtreEtat, q); };
    const loadMore       = () => {
        if (!hasMore || loadingMore || isLoadingRef.current) return;
        isLoadingRef.current = true;
        fetchCommandes(page + 1, filtreEtat, search, true);
    };

    const renderItem = useCallback(({ item }) => <CommandeCard item={item} T={T} />, [T]);

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
                        style={[styles.filtreChip, { borderColor: T.border, backgroundColor: T.card }, filtreEtat === s.etat && { backgroundColor: s.color, borderColor: s.color }]}
                        onPress={() => onFiltreChange(s.etat)}
                    >
                        <Text style={{ fontSize: 12, fontWeight: filtreEtat === s.etat ? '700' : '500', color: filtreEtat === s.etat ? '#fff' : (darkMode ? '#E2EEF8' : '#1A2940') }}>
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
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={loadingMore ? <ActivityIndicator color={TEAL} style={{ marginVertical: 12 }} /> : null}
                    renderItem={renderItem}
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
    filtresRow:  { paddingVertical: 8, borderBottomWidth: 1, maxHeight: 60, minHeight: 61 },
    filtreChip:  { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, height: 36, justifyContent: 'center', alignItems: 'center' },
    filtreText:  { fontSize: 12, fontWeight: '500', includeFontPadding: false },
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