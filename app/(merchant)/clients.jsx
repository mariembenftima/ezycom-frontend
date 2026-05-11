import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
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
import AppFooter from '../components/AppFooter';
import AppHeader from '../components/AppHeader';

const TEAL    = '#29B6D8';
const TEAL_BG = '#E8F8FC';
const BORDER  = '#E5E7EB';
const GRAY    = '#6B7280';

const ClientCard = ({ item }) => {
    const nom   = [item.nom, item.prenom].filter(Boolean).join(' ') || 'Client inconnu';
    const total = item.total_achats ? `${parseFloat(item.total_achats).toFixed(3)} TND` : '0.000 TND';
    const date  = item.derniere_commande
        ? new Date(item.derniere_commande).toLocaleDateString('fr-FR')
        : '—';

    const handleAppel = () => {
        if (item.tel) Linking.openURL(`tel:${item.tel}`);
    };

    return (
        <View style={styles.card}>
            <View style={styles.cardTop}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                        {(item.nom?.[0] || '?').toUpperCase()}
                    </Text>
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.cardNom}>{nom}</Text>
                    {item.tel ? <Text style={styles.cardTel}>{item.tel}</Text> : null}
                    {item.ville ? (
                        <Text style={styles.cardVille}>
                            <Ionicons name="location-outline" size={11} color={GRAY} /> {item.ville}
                            {item.gouvernerat ? `, ${item.gouvernerat}` : ''}
                        </Text>
                    ) : null}
                </View>
                {item.tel ? (
                    <TouchableOpacity style={styles.callBtn} onPress={handleAppel} activeOpacity={0.7}>
                        <Ionicons name="call-outline" size={18} color={TEAL} />
                    </TouchableOpacity>
                ) : null}
            </View>

            <View style={styles.cardStats}>
                <View style={styles.statItem}>
                    <Text style={styles.statVal}>{item.nb_commandes || 0}</Text>
                    <Text style={styles.statLbl}>Commandes</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={[styles.statVal, { color: '#059669' }]}>{item.nb_livrees || 0}</Text>
                    <Text style={styles.statLbl}>Livrées</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={[styles.statVal, { color: '#DC2626' }]}>{item.nb_annulees || 0}</Text>
                    <Text style={styles.statLbl}>Annulées</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={[styles.statVal, { color: TEAL, fontSize: 12 }]}>{total}</Text>
                    <Text style={styles.statLbl}>Total achats</Text>
                </View>
            </View>

            <Text style={styles.cardDate}>Dernière commande : {date}</Text>
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
            let url = `${API_URL}/api/clients?page=${p}&limit=20`;
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
        } catch (_) {}
        finally { setLoading(false); setLoadingMore(false); setRefreshing(false); }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchClients(token, 1, search);
    };

    const onSearchChange = (q) => {
        setSearch(q);
        if (q.length === 0 || q.length >= 3) fetchClients(token, 1, q);
    };

    const loadMore = () => {
        if (!hasMore || loadingMore) return;
        fetchClients(token, page + 1, search, true);
    };

    const ca = stats.chiffre_affaires ? parseFloat(stats.chiffre_affaires).toFixed(3) : '0.000';

    return (
        <SafeAreaView style={styles.safe}>
            <AppHeader
                session={session}
                darkMode={darkMode}
                onToggleDark={() => setDarkMode(d => !d)}
                onLogout={() => router.replace('/(auth)/login')}
            />

            <View style={styles.statsRow}>
                <View style={[styles.statCard, { backgroundColor: TEAL_BG }]}>
                    <Text style={[styles.statCardVal, { color: TEAL }]}>{stats.total_clients || 0}</Text>
                    <Text style={styles.statCardLbl}>Clients</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: '#D1FAE5' }]}>
                    <Text style={[styles.statCardVal, { color: '#059669', fontSize: 13 }]}>{ca}</Text>
                    <Text style={styles.statCardLbl}>CA (TND)</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: '#F3F4F6' }]}>
                    <Text style={[styles.statCardVal, { color: GRAY }]}>{stats.total_commandes || 0}</Text>
                    <Text style={styles.statCardLbl}>Commandes</Text>
                </View>
            </View>

            <View style={styles.searchRow}>
                <View style={styles.searchWrap}>
                    <Ionicons name="search-outline" size={16} color={GRAY} style={{ marginRight: 6 }} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Rechercher (nom, tél, email...)"
                        placeholderTextColor="#9CA3AF"
                        value={search}
                        onChangeText={onSearchChange}
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => onSearchChange('')}>
                            <Ionicons name="close-circle" size={16} color={GRAY} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator color={TEAL} size="large" />
                </View>
            ) : clients.length === 0 ? (
                <View style={styles.center}>
                    <Ionicons name="people-outline" size={48} color={BORDER} />
                    <Text style={styles.emptyText}>Aucun client trouvé</Text>
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
                    ListFooterComponent={loadingMore
                        ? <ActivityIndicator color={TEAL} style={{ marginVertical: 12 }} />
                        : null}
                    renderItem={({ item }) => <ClientCard item={item} />}
                />
            )}

            <AppFooter darkMode={darkMode} />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe:         { flex: 1, backgroundColor: '#F9FAFB' },
    statsRow:     { flexDirection: 'row', gap: 8, padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: BORDER },
    statCard:     { flex: 1, borderRadius: 8, padding: 10, alignItems: 'center' },
    statCardVal:  { fontSize: 18, fontWeight: '700' },
    statCardLbl:  { fontSize: 10, color: GRAY, marginTop: 2 },
    searchRow:    { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: BORDER },
    searchWrap:   { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9 },
    searchInput:  { flex: 1, fontSize: 13, color: '#111827' },
    list:         { padding: 12, gap: 10 },
    center:       { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
    emptyText:    { fontSize: 14, color: GRAY },
    card:         { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: BORDER },
    cardTop:      { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    avatar:       { width: 44, height: 44, borderRadius: 22, backgroundColor: TEAL_BG, alignItems: 'center', justifyContent: 'center' },
    avatarText:   { fontSize: 18, fontWeight: '700', color: TEAL },
    cardNom:      { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 2 },
    cardTel:      { fontSize: 12, color: GRAY },
    cardVille:    { fontSize: 11, color: GRAY, marginTop: 2 },
    callBtn:      { width: 38, height: 38, borderRadius: 19, backgroundColor: TEAL_BG, alignItems: 'center', justifyContent: 'center' },
    cardStats:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 8, padding: 10, marginBottom: 8 },
    statItem:     { flex: 1, alignItems: 'center' },
    statVal:      { fontSize: 15, fontWeight: '700', color: '#111827' },
    statLbl:      { fontSize: 9, color: GRAY, marginTop: 2 },
    statDivider:  { width: 1, height: 28, backgroundColor: BORDER },
    cardDate:     { fontSize: 11, color: GRAY, textAlign: 'right' },
});