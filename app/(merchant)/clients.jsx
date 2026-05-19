import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Linking,
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
import { loadDarkMode, saveDarkMode } from '../../utils/darkMode';
import AppFooter from '../components/AppFooter';
import AppHeader from '../components/AppHeader';

const TEAL    = '#29B6D8';
const TEAL_BG = '#E8F8FC';

const LIGHT = { bg: '#F9FAFB', card: '#fff', border: '#E5E7EB', text: '#111827', sub: '#6B7280', statBg: '#F3F4F6', searchBg: '#F3F4F6' };
const DARK  = { bg: '#0A1525', card: '#0F2035', border: '#1E3A50', text: '#E2EEF8', sub: '#5A8A9A', statBg: '#152D42', searchBg: '#152D42' };

const ClientCard = ({ item, T }) => {
    const nom   = [item.nom, item.prenom].filter(Boolean).join(' ') || 'Client inconnu';
    const total = item.total_achats ? `${parseFloat(item.total_achats).toFixed(3)} TND` : '0.000 TND';
    const date  = item.derniere_commande
        ? new Date(item.derniere_commande).toLocaleDateString('fr-FR') : '—';

    return (
        <View style={[styles.card, { backgroundColor: T.card, borderColor: T.border }]}>
            <View style={styles.cardTop}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{(item.nom?.[0] || '?').toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.cardNom, { color: T.text }]}>{nom}</Text>
                    {item.tel ? <Text style={[styles.cardTel, { color: T.sub }]}>{item.tel}</Text> : null}
                    {item.ville ? (
                        <Text style={[styles.cardVille, { color: T.sub }]}>
                            <Ionicons name="location-outline" size={11} color={T.sub} /> {item.ville}
                            {item.gouvernerat ? `, ${item.gouvernerat}` : ''}
                        </Text>
                    ) : null}
                </View>
                {item.tel ? (
                    <TouchableOpacity style={styles.callBtn} onPress={() => Linking.openURL(`tel:${item.tel}`)} activeOpacity={0.7}>
                        <Ionicons name="call-outline" size={18} color={TEAL} />
                    </TouchableOpacity>
                ) : null}
            </View>

            <View style={[styles.cardStats, { backgroundColor: T.statBg }]}>
                <View style={styles.statItem}>
                    <Text style={[styles.statVal, { color: T.text }]}>{item.nb_commandes || 0}</Text>
                    <Text style={[styles.statLbl, { color: T.sub }]}>Commandes</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: T.border }]} />
                <View style={styles.statItem}>
                    <Text style={[styles.statVal, { color: '#059669' }]}>{item.nb_livrees || 0}</Text>
                    <Text style={[styles.statLbl, { color: T.sub }]}>Livrées</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: T.border }]} />
                <View style={styles.statItem}>
                    <Text style={[styles.statVal, { color: '#DC2626' }]}>{item.nb_annulees || 0}</Text>
                    <Text style={[styles.statLbl, { color: T.sub }]}>Annulées</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: T.border }]} />
                <View style={styles.statItem}>
                    <Text style={[styles.statVal, { color: TEAL, fontSize: 12 }]}>{total}</Text>
                    <Text style={[styles.statLbl, { color: T.sub }]}>Total achats</Text>
                </View>
            </View>

            <Text style={[styles.cardDate, { color: T.sub }]}>Dernière commande : {date}</Text>
        </View>
    );
};

export default function ClientsScreen() {
    const [session,     setSession]     = useState(null);
    const [darkMode,    setDarkMode]    = useState(false);
    const [token,       setToken]       = useState(null);
    const [clients,     setClients]     = useState([]);
    const [stats,       setStats]       = useState({});
    const [loading,     setLoading]     = useState(true);
    const [refreshing,  setRefreshing]  = useState(false);
    const [search,      setSearch]      = useState('');
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
                fetchClients(s.token, 1, '');
            })();
        }, [])
    );

    const fetchClients = async (tok, p = 1, q = search, append = false) => {
        if (!append) setLoading(true);
        else setLoadingMore(true);
        try {
            let url = `${API_URL}/api/clients/list.php?page=${p}&limit=20`;
            if (q) url += `&search=${encodeURIComponent(q)}`;
            const res  = await fetch(url, { headers: { 'X-Token': tok } });
            const data = await res.json();
            if (data.success) {
                const list = Array.isArray(data.data?.clients) ? data.data.clients : [];
                setClients(prev => append ? [...prev, ...list] : list);
                setStats(data.data?.stats || {});
                setHasMore(p < (data.data?.pages || 1));
                setPage(p);
            }
        } catch (e) { console.log('CLIENTS ERROR:', e); }
        finally { setLoading(false); setLoadingMore(false); setRefreshing(false); }
    };

    const onRefresh      = () => { setRefreshing(true); fetchClients(token, 1, search); };
    const onSearchChange = (q) => { setSearch(q); if (q.length === 0 || q.length >= 3) fetchClients(token, 1, q); };
    const loadMore       = () => { if (!hasMore || loadingMore) return; fetchClients(token, page + 1, search, true); };

    const ca = stats.chiffre_affaires ? parseFloat(stats.chiffre_affaires).toFixed(3) : '0.000';

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]}>
            <AppHeader
                session={session} darkMode={darkMode}
                onToggleDark={() => { const next = !darkMode; setDarkMode(next); saveDarkMode(next); }}
                onLogout={() => router.replace('/(auth)/login')}
            />

            <View style={[styles.statsRow, { backgroundColor: T.card, borderBottomColor: T.border }]}>
                <View style={[styles.statCard, { backgroundColor: TEAL_BG }]}>
                    <Text style={[styles.statCardVal, { color: TEAL }]}>{stats.total_clients || 0}</Text>
                    <Text style={[styles.statCardLbl, { color: T.sub }]}>Clients</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: '#D1FAE5' }]}>
                    <Text style={[styles.statCardVal, { color: '#059669', fontSize: 13 }]}>{ca}</Text>
                    <Text style={[styles.statCardLbl, { color: T.sub }]}>CA (TND)</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: T.statBg }]}>
                    <Text style={[styles.statCardVal, { color: T.sub }]}>{stats.total_commandes || 0}</Text>
                    <Text style={[styles.statCardLbl, { color: T.sub }]}>Commandes</Text>
                </View>
            </View>

            <View style={[styles.searchRow, { backgroundColor: T.card, borderBottomColor: T.border }]}>
                <View style={[styles.searchWrap, { backgroundColor: T.searchBg }]}>
                    <Ionicons name="search-outline" size={16} color={T.sub} style={{ marginRight: 6 }} />
                    <TextInput
                        style={[styles.searchInput, { color: T.text }]}
                        placeholder="Rechercher (nom, tél, email...)"
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

            {loading ? (
                <View style={styles.center}><ActivityIndicator color={TEAL} size="large" /></View>
            ) : clients.length === 0 ? (
                <View style={styles.center}>
                    <Ionicons name="people-outline" size={48} color={T.border} />
                    <Text style={[styles.emptyText, { color: T.sub }]}>Aucun client trouvé</Text>
                </View>
            ) : (
                <FlatList
                    data={clients}
                    keyExtractor={(item, index) => item.tel || item.client_key || String(index)}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TEAL} />}
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.3}
                    ListFooterComponent={loadingMore ? <ActivityIndicator color={TEAL} style={{ marginVertical: 12 }} /> : null}
                    renderItem={({ item }) => <ClientCard item={item} T={T} />}
                />
            )}

            <AppFooter darkMode={darkMode} />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe:         { flex: 1 },
    statsRow:     { flexDirection: 'row', gap: 8, padding: 12, borderBottomWidth: 1 },
    statCard:     { flex: 1, borderRadius: 8, padding: 10, alignItems: 'center' },
    statCardVal:  { fontSize: 18, fontWeight: '700' },
    statCardLbl:  { fontSize: 10, marginTop: 2 },
    searchRow:    { paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1 },
    searchWrap:   { flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9 },
    searchInput:  { flex: 1, fontSize: 13 },
    list:         { padding: 12, gap: 10 },
    center:       { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
    emptyText:    { fontSize: 14 },
    card:         { borderRadius: 12, padding: 14, borderWidth: 1 },
    cardTop:      { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    avatar:       { width: 44, height: 44, borderRadius: 22, backgroundColor: TEAL_BG, alignItems: 'center', justifyContent: 'center' },
    avatarText:   { fontSize: 18, fontWeight: '700', color: TEAL },
    cardNom:      { fontSize: 14, fontWeight: '700', marginBottom: 2 },
    cardTel:      { fontSize: 12 },
    cardVille:    { fontSize: 11, marginTop: 2 },
    callBtn:      { width: 38, height: 38, borderRadius: 19, backgroundColor: TEAL_BG, alignItems: 'center', justifyContent: 'center' },
    cardStats:    { flexDirection: 'row', alignItems: 'center', borderRadius: 8, padding: 10, marginBottom: 8 },
    statItem:     { flex: 1, alignItems: 'center' },
    statVal:      { fontSize: 15, fontWeight: '700' },
    statLbl:      { fontSize: 9, marginTop: 2 },
    statDivider:  { width: 1, height: 28 },
    cardDate:     { fontSize: 11, textAlign: 'right' },
});