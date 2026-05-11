import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
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
const { width: SW } = Dimensions.get('window');

const PERIODES = [
    { label: '7 j',  value: 7  },
    { label: '30 j', value: 30 },
    { label: '90 j', value: 90 },
];

const STATUT_MAP = {
    0: { label: 'En attente', color: '#D97706' },
    1: { label: 'Confirmée',  color: '#2563EB' },
    2: { label: 'Dispatché',  color: '#7C3AED' },
    5: { label: 'Livrée',     color: '#059669' },
    7: { label: 'Annulée',    color: '#DC2626' },
};

const BarChart = ({ data }) => {
    if (!data || data.length === 0) return (
        <View style={styles.chartEmpty}>
            <Text style={{ color: GRAY, fontSize: 13 }}>Aucune donnée</Text>
        </View>
    );

    const maxCa = Math.max(...data.map(d => parseFloat(d.ca || 0)), 1);
    const chartW = SW - 48;
    const barW   = Math.max(8, Math.floor((chartW - data.length * 4) / data.length));

    return (
        <View style={styles.chartWrap}>
            <View style={styles.chartBars}>
                {data.map((d, i) => {
                    const h     = Math.max(4, (parseFloat(d.ca || 0) / maxCa) * 100);
                    const label = d.jour ? d.jour.slice(5) : '';
                    return (
                        <View key={i} style={[styles.barCol, { width: barW }]}>
                            <Text style={styles.barVal} numberOfLines={1}>
                                {parseFloat(d.ca || 0) > 0 ? `${Math.round(parseFloat(d.ca))}` : ''}
                            </Text>
                            <View style={[styles.bar, { height: h, backgroundColor: TEAL }]} />
                            <Text style={styles.barLabel} numberOfLines={1}>{label}</Text>
                        </View>
                    );
                })}
            </View>
        </View>
    );
};

const HorizBar = ({ label, value, max, color = TEAL, suffix = '' }) => {
    const pct = max > 0 ? (value / max) * 100 : 0;
    return (
        <View style={styles.hBarRow}>
            <Text style={styles.hBarLabel} numberOfLines={1}>{label}</Text>
            <View style={styles.hBarTrack}>
                <View style={[styles.hBarFill, { width: `${pct}%`, backgroundColor: color }]} />
            </View>
            <Text style={styles.hBarVal}>{value}{suffix}</Text>
        </View>
    );
};

const KpiCard = ({ icon, label, value, color = TEAL, bg = TEAL_BG }) => (
    <View style={[styles.kpiCard, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={22} color={color} style={{ marginBottom: 6 }} />
        <Text style={[styles.kpiVal, { color }]}>{value}</Text>
        <Text style={styles.kpiLbl}>{label}</Text>
    </View>
);

export default function StatistiquesScreen() {
    const [session,  setSession]  = useState(null);
    const [darkMode, setDarkMode] = useState(false);
    const [token,    setToken]    = useState(null);
    const [data,     setData]     = useState(null);
    const [loading,  setLoading]  = useState(true);
    const [periode,  setPeriode]  = useState(30);

    useFocusEffect(
        useCallback(() => {
            (async () => {
                const s = await loadSession();
                if (!s?.token) { router.replace('/(auth)/login'); return; }
                setSession(s);
                setToken(s.token);
                fetchStats(s.token, 30);
            })();
        }, [])
    );

    const fetchStats = async (tok, p) => {
        setLoading(true);
        try {
            const res  = await fetch(`${API_URL}/api/statistiques?periode=${p}`, {
                headers: { 'X-Token': tok },
            });
            const json = await res.json();
            if (json.success) setData(json.data);
        } catch (_) {}
        finally { setLoading(false); }
    };

    const onPeriodeChange = (p) => {
        setPeriode(p);
        fetchStats(token, p);
    };

    const kpis        = data?.kpis         || {};
    const caJours     = data?.ca_jours      || [];
    const parStatut   = data?.par_statut    || [];
    const topProduits = data?.top_produits  || [];
    const topVilles   = data?.top_villes    || [];

    const ca       = kpis.ca_total ? parseFloat(kpis.ca_total).toFixed(3) : '0.000';
    const taux     = kpis.taux_livraison ?? 0;
    const maxProd  = topProduits.length ? Math.max(...topProduits.map(p => parseInt(p.total_vendus || 0))) : 1;
    const maxVille = topVilles.length   ? Math.max(...topVilles.map(v => parseInt(v.nb_commandes || 0)))  : 1;

    return (
        <SafeAreaView style={styles.safe}>
            <AppHeader
                session={session}
                darkMode={darkMode}
                onToggleDark={() => setDarkMode(d => !d)}
                onLogout={() => router.replace('/(auth)/login')}
            />

            <View style={styles.periodeRow}>
                {PERIODES.map(p => (
                    <TouchableOpacity
                        key={p.value}
                        style={[styles.periodeChip, periode === p.value && styles.periodeChipActive]}
                        onPress={() => onPeriodeChange(p.value)}
                    >
                        <Text style={[styles.periodeText, periode === p.value && styles.periodeTextActive]}>
                            {p.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator color={TEAL} size="large" />
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

                    <Text style={styles.sectionTitle}>Vue d'ensemble</Text>
                    <View style={styles.kpiGrid}>
                        <KpiCard icon="cash-outline"             label="CA (TND)"   value={ca}                        color={TEAL}    bg={TEAL_BG}  />
                        <KpiCard icon="cart-outline"             label="Commandes"  value={kpis.total_commandes || 0} color="#2563EB" bg="#DBEAFE"  />
                        <KpiCard icon="checkmark-circle-outline" label="Livrées"    value={kpis.livrees || 0}         color="#059669" bg="#D1FAE5"  />
                        <KpiCard icon="close-circle-outline"     label="Annulées"   value={kpis.annulees || 0}        color="#DC2626" bg="#FEE2E2"  />
                        <KpiCard icon="people-outline"           label="Clients"    value={kpis.nb_clients || 0}      color="#7C3AED" bg="#EDE9FE"  />
                        <KpiCard icon="trending-up-outline"      label="Taux liv."  value={`${taux}%`}                color="#D97706" bg="#FEF3C7"  />
                    </View>

                    <Text style={styles.sectionTitle}>Chiffre d'affaires (TND)</Text>
                    <View style={styles.section}>
                        <BarChart data={caJours} />
                    </View>

                    <Text style={styles.sectionTitle}>Répartition par statut</Text>
                    <View style={styles.section}>
                        {parStatut.length === 0 ? (
                            <Text style={styles.emptyText}>Aucune donnée</Text>
                        ) : parStatut.map((s, i) => {
                            const st     = STATUT_MAP[parseInt(s.etat)] || { label: `Statut ${s.etat}`, color: GRAY };
                            const maxSt  = Math.max(...parStatut.map(x => parseInt(x.nb)));
                            return (
                                <HorizBar key={i} label={st.label} value={parseInt(s.nb)} max={maxSt} color={st.color} />
                            );
                        })}
                    </View>

                    <Text style={styles.sectionTitle}>Top 5 produits vendus</Text>
                    <View style={styles.section}>
                        {topProduits.length === 0 ? (
                            <Text style={styles.emptyText}>Aucune donnée</Text>
                        ) : topProduits.map((p, i) => (
                            <HorizBar key={i} label={p.produit} value={parseInt(p.total_vendus)} max={maxProd} color={TEAL} suffix=" ventes" />
                        ))}
                    </View>

                    <Text style={styles.sectionTitle}>Top 5 villes</Text>
                    <View style={styles.section}>
                        {topVilles.length === 0 ? (
                            <Text style={styles.emptyText}>Aucune donnée</Text>
                        ) : topVilles.map((v, i) => (
                            <HorizBar key={i} label={v.ville} value={parseInt(v.nb_commandes)} max={maxVille} color="#7C3AED" suffix=" cmd" />
                        ))}
                    </View>

                    <View style={{ height: 24 }} />
                </ScrollView>
            )}

            <AppFooter darkMode={darkMode} />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe:              { flex: 1, backgroundColor: '#F9FAFB' },
    scroll:            { padding: 16 },
    center:            { flex: 1, alignItems: 'center', justifyContent: 'center' },
    periodeRow:        { flexDirection: 'row', gap: 8, padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: BORDER },
    periodeChip:       { paddingHorizontal: 18, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: BORDER, backgroundColor: '#F9FAFB' },
    periodeChipActive: { backgroundColor: TEAL_BG, borderColor: TEAL },
    periodeText:       { fontSize: 13, color: GRAY, fontWeight: '500' },
    periodeTextActive: { color: TEAL, fontWeight: '700' },
    sectionTitle:      { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 10, marginTop: 4 },
    section:           { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: BORDER, marginBottom: 16 },
    emptyText:         { fontSize: 13, color: GRAY, textAlign: 'center', paddingVertical: 8 },
    kpiGrid:           { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
    kpiCard:           { width: (SW - 48) / 3 - 4, borderRadius: 12, padding: 12, alignItems: 'center' },
    kpiVal:            { fontSize: 16, fontWeight: '700', marginBottom: 2 },
    kpiLbl:            { fontSize: 10, color: GRAY, textAlign: 'center' },
    chartWrap:         { overflow: 'hidden' },
    chartBars:         { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 130 },
    chartEmpty:        { height: 130, alignItems: 'center', justifyContent: 'center' },
    barCol:            { alignItems: 'center', justifyContent: 'flex-end' },
    bar:               { borderRadius: 4, minHeight: 4 },
    barVal:            { fontSize: 7, color: GRAY, marginBottom: 2 },
    barLabel:          { fontSize: 7, color: GRAY, marginTop: 3, width: 28, textAlign: 'center' },
    hBarRow:           { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
    hBarLabel:         { width: 90, fontSize: 12, color: '#111827' },
    hBarTrack:         { flex: 1, height: 8, backgroundColor: '#F3F4F6', borderRadius: 4, overflow: 'hidden' },
    hBarFill:          { height: 8, borderRadius: 4 },
    hBarVal:           { width: 60, fontSize: 11, color: GRAY, textAlign: 'right' },
});