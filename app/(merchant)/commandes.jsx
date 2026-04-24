// app/(merchant)/commandes.jsx
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_URL } from '../../config';
import { loadSession } from '../../utils/auth';
import AppFooter from '../components/AppFooter';
import AppHeader from '../components/AppHeader';

const TEAL = '#29B6D8';
const TEAL_BG = '#E8F8FC';
const BORDER = '#E5E7EB';
const GRAY = '#6B7280';

// ── Statuts ───────────────────────────────────────────────────────────────────
const STATUTS = [
    { etat: null, label: 'Tous', color: GRAY, bg: '#F3F4F6' },
    { etat: 0, label: 'En attente', color: '#D97706', bg: '#FEF3C7' },
    { etat: 1, label: 'Confirmée', color: '#2563EB', bg: '#DBEAFE' },
    { etat: 2, label: 'Dispatché', color: '#7C3AED', bg: '#EDE9FE' },
    { etat: 5, label: 'Livrée', color: '#059669', bg: '#D1FAE5' },
    { etat: 7, label: 'Annulée', color: '#DC2626', bg: '#FEE2E2' },
];

const getStatut = (etat) => STATUTS.find(s => s.etat === etat) || STATUTS[0];

// ── Composant carte commande ──────────────────────────────────────────────────
const CommandeCard = ({ item, onPress }) => {
    const statut = getStatut(item.etat);
    const date = item.date_add ? new Date(item.date_add).toLocaleDateString('fr-FR') : '';
    const client = [item.nom, item.prenom].filter(Boolean).join(' ') || 'Client inconnu';
    const total = item.prix ? `${parseFloat(item.prix).toFixed(3)} TND` : '—';

    return (
        <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
            <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.cardRef}>#{item.code_barre || item.id}</Text>
                    <Text style={styles.cardClient}>{client}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: statut.bg }]}>
                    <Text style={[styles.badgeText, { color: statut.color }]}>{statut.label}</Text>
                </View>
            </View>
            <View style={styles.cardBottom}>
                <Text style={styles.cardMeta}>{item.nb_articles} article{item.nb_articles > 1 ? 's' : ''}</Text>
                <Text style={styles.cardMeta}>{item.ville || '—'}</Text>
                <Text style={styles.cardTotal}>{total}</Text>
                <Text style={styles.cardDate}>{date}</Text>
            </View>
        </TouchableOpacity>
    );
};

// ── Écran principal ───────────────────────────────────────────────────────────
export default function CommandesScreen() {
    const [session, setSession] = useState(null);
    const [darkMode, setDarkMode] = useState(false);
    const [token, setToken] = useState(null);
    const [commandes, setCommandes] = useState([]);
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [filtreEtat, setFiltreEtat] = useState(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    const { etat: etatParam } = useLocalSearchParams();

    useFocusEffect(
        useCallback(() => {
            (async () => {
                const session = await loadSession();
                if (!session?.token) { router.replace('/(auth)/login'); return; }
                setSession(session);
                setToken(session.token);
                const etatInitial = etatParam !== undefined ? parseInt(etatParam) : null;
                setFiltreEtat(etatInitial);
                fetchCommandes(session.token, 1, etatInitial, '');
            })();
        }, [])
    );

    const fetchCommandes = async (tok, p = 1, etat = filtreEtat, q = search, append = false) => {
        if (!append) setLoading(true);
        else setLoadingMore(true);
        try {
            let url = `${API_URL}/api/orders?page=${p}&limit=20`;
            if (etat !== null) url += `&etat=${etat}`;
            if (q) url += `&search=${encodeURIComponent(q)}`;

            const res = await fetch(url, { headers: { 'X-Token': tok } });
            const data = await res.json();

            if (data.success) {
                const list = Array.isArray(data.data?.commandes) ? data.data.commandes : [];
                setCommandes(prev => append ? [...prev, ...list] : list);
                setStats(data.data?.stats || {});
                setHasMore(p < (data.data?.pages || 1));
                setPage(p);
            }
        } catch (_) { }
        finally { setLoading(false); setLoadingMore(false); setRefreshing(false); }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchCommandes(token, 1, filtreEtat, search);
    };

    const onFiltreChange = (etat) => {
        setFiltreEtat(etat);
        setCommandes([]);
        fetchCommandes(token, 1, etat, search);
    };

    const onSearchChange = (q) => {
        setSearch(q);
        if (q.length === 0 || q.length >= 3) {
            fetchCommandes(token, 1, filtreEtat, q);
        }
    };

    const loadMore = () => {
        if (!hasMore || loadingMore) return;
        fetchCommandes(token, page + 1, filtreEtat, search, true);
    };

    return (
        <SafeAreaView style={styles.safe}>
            <AppHeader
                session={session}
                darkMode={darkMode}
                onToggleDark={() => setDarkMode(d => !d)}
                onLogout={() => router.replace('/(auth)/login')}
            />

            {/* Stats rapides */}
            <View style={styles.statsRow}>
                <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
                    <Text style={[styles.statVal, { color: '#D97706' }]}>{stats.en_attente || 0}</Text>
                    <Text style={styles.statLbl}>En attente</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: '#DBEAFE' }]}>
                    <Text style={[styles.statVal, { color: '#2563EB' }]}>{stats.confirmee || 0}</Text>
                    <Text style={styles.statLbl}>Confirmées</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: '#D1FAE5' }]}>
                    <Text style={[styles.statVal, { color: '#059669' }]}>{stats.livree || 0}</Text>
                    <Text style={styles.statLbl}>Livrées</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: '#FEE2E2' }]}>
                    <Text style={[styles.statVal, { color: '#DC2626' }]}>{stats.annulee || 0}</Text>
                    <Text style={styles.statLbl}>Annulées</Text>
                </View>
            </View>

            {/* Barre de recherche */}
            <View style={styles.searchRow}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Rechercher (nom, tél, code...)"
                    placeholderTextColor="#9CA3AF"
                    value={search}
                    onChangeText={onSearchChange}
                />
            </View>

            {/* Filtres statut */}
            <FlatList
                horizontal
                data={STATUTS}
                keyExtractor={s => String(s.etat)}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filtresRow}
                renderItem={({ item: s }) => (
                    <TouchableOpacity
                        style={[styles.filtreChip, filtreEtat === s.etat && { backgroundColor: s.bg, borderColor: s.color }]}
                        onPress={() => onFiltreChange(s.etat)}
                    >
                        <Text style={[styles.filtreText, filtreEtat === s.etat && { color: s.color, fontWeight: '600' }]}>
                            {s.label}
                        </Text>
                    </TouchableOpacity>
                )}
            />

            {/* Liste */}
            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator color={TEAL} size="large" />
                </View>
            ) : commandes.length === 0 ? (
                <View style={styles.center}>
                    <Text style={styles.emptyText}>Aucune commande trouvée</Text>
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
                    renderItem={({ item }) => (
                        <CommandeCard
                            item={item}
                            onPress={() => router.push({ pathname: '/(merchant)/commandes/detail', params: { id: item.id } })}
                        />
                    )}
                />
            )}
            <AppFooter darkMode={darkMode} />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#F9FAFB' },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    badgeText: { fontSize: 12, fontWeight: '600' },
    statsRow: { flexDirection: 'row', gap: 8, padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: BORDER },
    statCard: { flex: 1, borderRadius: 8, padding: 8, alignItems: 'center' },
    statVal: { fontSize: 18, fontWeight: '700' },
    statLbl: { fontSize: 9, color: GRAY, marginTop: 2 },
    searchRow: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: BORDER },
    searchInput: { backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, color: '#111827' },
    filtresRow: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
    filtreChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: BORDER, backgroundColor: '#F9FAFB' },
    filtreText: { fontSize: 12, color: GRAY },
    list: { padding: 12, gap: 10 },
    card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: BORDER },
    cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
    cardRef: { fontSize: 12, color: GRAY, marginBottom: 2 },
    cardClient: { fontSize: 14, fontWeight: '600', color: '#111827' },
    cardBottom: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    cardMeta: { fontSize: 11, color: GRAY },
    cardTotal: { flex: 1, fontSize: 13, fontWeight: '700', color: TEAL, textAlign: 'right' },
    cardDate: { fontSize: 11, color: GRAY },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    emptyText: { fontSize: 14, color: GRAY },
});