import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Circle, Defs, Line, LinearGradient, Polyline, Rect, Stop, Svg, Text as SvgText } from 'react-native-svg';
import api from '../../utils/api';
import { loadSession } from '../../utils/auth';
import { loadDarkMode, saveDarkMode } from '../../utils/darkMode';
import { BAR_COLORS, DARK, LIGHT, TEAL, TEAL_BG } from '../../utils/theme';
import AppFooter from '../components/AppFooter';
import AppHeader from '../components/AppHeader';
const PERIODES = [{ label: '7 j', value: 7 }, { label: '30 j', value: 30 }, { label: '90 j', value: 90 }];
const STATUT_MAP = {
    0: { label: 'En attente', color: '#D97706' },
    1: { label: 'Confirmée', color: '#2563EB' },
    2: { label: 'Dispatché', color: '#7C3AED' },
    5: { label: 'Livrée', color: '#059669' },
    7: { label: 'Annulée', color: '#DC2626' },
};
const { width: SW } = Dimensions.get('window');
const LineBarChart = ({ data, labelKey, valueKey, chartColor, height = 140, T }) => {
    const W = SW - 64, H = height, PAD_TOP = 20, PAD_BOT = 22, innerH = H - PAD_TOP - PAD_BOT;
    const gridColor = T ? T.border : '#E5E7EB';
    const labelColor = T ? T.sub : '#6B7280';
    if (!data || data.length === 0) return <View style={{ height: H, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: labelColor, fontSize: 12 }}>Aucune donnée</Text></View>;
    const values = data.map(d => parseFloat(d[valueKey] || 0));
    const maxVal = Math.max(...values, 1);
    const barW = Math.max(8, Math.floor((W - data.length * 4) / data.length));
    const gap = (W - data.length * barW) / (data.length - 1 || 1);
    const points = data.map((d, i) => ({ x: i * (barW + gap) + barW / 2, y: PAD_TOP + innerH - (parseFloat(d[valueKey] || 0) / maxVal) * innerH }));
    const polyPoints = points.map(p => `${p.x},${p.y}`).join(' ');
    return (
        <View style={{ height: H }}>
            <Svg width={W} height={H}>
                <Defs>{data.map((_, i) => <LinearGradient key={i} id={`sg${i}`} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={BAR_COLORS[i % BAR_COLORS.length]} stopOpacity="1" /><Stop offset="1" stopColor={BAR_COLORS[i % BAR_COLORS.length]} stopOpacity="0.4" /></LinearGradient>)}</Defs>
                {[0.25, 0.5, 0.75, 1].map((pct, i) => <Line key={i} x1="0" y1={PAD_TOP + innerH * (1 - pct)} x2={W} y2={PAD_TOP + innerH * (1 - pct)} stroke={gridColor} strokeWidth="1" strokeDasharray="4,4" />)}
                {data.map((d, i) => { const x = i * (barW + gap), val = parseFloat(d[valueKey] || 0), h = Math.max(val > 0 ? 4 : 0, (val / maxVal) * innerH), y = PAD_TOP + innerH - h; return <Rect key={i} x={x} y={y} width={barW} height={h} rx={4} fill={`url(#sg${i})`} />; })}
                {data.length > 1 && <Polyline points={polyPoints} fill="none" stroke={chartColor || TEAL} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}
                {points.map((p, i) => <Circle key={i} cx={p.x} cy={p.y} r={3.5} fill="#fff" stroke={chartColor || TEAL} strokeWidth="2" />)}
                {data.map((d, i) => { const x = i * (barW + gap) + barW / 2, val = parseFloat(d[valueKey] || 0), y = PAD_TOP + innerH - (val / maxVal) * innerH - 6; if (val === 0) return null; return <SvgText key={i} x={x} y={y} fontSize="7" fill={BAR_COLORS[i % BAR_COLORS.length]} textAnchor="middle" fontWeight="700">{Math.round(val)}</SvgText>; })}
            </Svg>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
                {data.map((d, i) => <Text key={i} style={{ fontSize: 7, color: labelColor, width: barW + gap, textAlign: 'center' }} numberOfLines={1}>{d[labelKey] || ''}</Text>)}
            </View>
        </View>
    );
};

const HorizBar = ({ label, value, max, color = TEAL, suffix = '', T }) => {
    const pct = max > 0 ? (value / max) * 100 : 0;
    return (
        <View style={styles.hBarRow}>
            <Text style={[styles.hBarLabel, { color: T.text }]} numberOfLines={1}>{label}</Text>
            <View style={[styles.hBarTrack, { backgroundColor: T.border }]}>
                <View style={[styles.hBarFill, { width: `${pct}%`, backgroundColor: color }]} />
            </View>
            <Text style={[styles.hBarVal, { color: T.sub }]}>{value}{suffix}</Text>
        </View>
    );
};

const KpiCard = ({ icon, label, value, color = TEAL, bg = TEAL_BG, sub }) => (
    <View style={[styles.kpiCard, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={22} color={color} style={{ marginBottom: 6 }} />
        <Text style={[styles.kpiVal, { color }]}>{value}</Text>
        <Text style={[styles.kpiLbl, { color: sub }]}>{label}</Text>
    </View>
);

export default function StatistiquesScreen() {
    const [session, setSession] = useState(null);
    const [darkMode, setDarkMode] = useState(false);
    const [token, setToken] = useState(null);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [periode, setPeriode] = useState(30);

    const T = darkMode ? DARK : LIGHT;

    useEffect(() => { loadDarkMode().then(setDarkMode); }, []);

    useFocusEffect(useCallback(() => {
        (async () => {
            const s = await loadSession();
            if (!s?.token) { router.replace('/(auth)/login'); return; }
            setSession(s);
            fetchStats(30);
        })();
    }, []));

    const fetchStats = async (p) => {
        setLoading(true);
        try {
            const json = await api.get(`/api/statistiques/statistique.php?periode=${p}`);
            if (json.success) setData(json.data);
        } catch (e) {
            console.error('Erreur chargement:', e.message);
        }
        finally { setLoading(false); }
    };

    const onPeriodeChange = (p) => { setPeriode(p); fetchStats(p); };

    const kpis = data?.kpis || {};
    const caJours = data?.ca_jours || [];
    const parStatut = data?.par_statut || [];
    const topProduits = data?.top_produits || [];
    const topVilles = data?.top_villes || [];
    const ca = kpis.ca_total ? parseFloat(kpis.ca_total).toFixed(3) : '0.000';
    const taux = kpis.taux_livraison ?? 0;
    const maxProd = topProduits.length ? Math.max(...topProduits.map(p => parseInt(p.total_vendus || 0))) : 1;
    const maxVille = topVilles.length ? Math.max(...topVilles.map(v => parseInt(v.nb_commandes || 0))) : 1;
    const caFormatted = caJours.map(d => ({ label: d.jour ? d.jour.slice(5) : '', ca: d.ca }));

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]}>
            <AppHeader
                session={session} darkMode={darkMode}
                onToggleDark={() => { const next = !darkMode; setDarkMode(next); saveDarkMode(next); }}
                onLogout={() => router.replace('/(auth)/login')}
            />

            <View style={[styles.periodeRow, { backgroundColor: T.card, borderBottomColor: T.border }]}>
                {PERIODES.map(p => (
                    <TouchableOpacity key={p.value}
                        style={[styles.periodeChip, { borderColor: T.border, backgroundColor: T.chipBg }, periode === p.value && { backgroundColor: TEAL_BG, borderColor: TEAL }]}
                        onPress={() => onPeriodeChange(p.value)}
                    >
                        <Text style={[styles.periodeText, { color: T.sub }, periode === p.value && { color: TEAL, fontWeight: '700' }]}>{p.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {loading ? (
                <View style={styles.center}><ActivityIndicator color={TEAL} size="large" /></View>
            ) : (
                <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                    <Text style={[styles.sectionTitle, { color: T.text }]}>Vue d'ensemble</Text>
                    <View style={styles.kpiGrid}>
                        <KpiCard icon="cash-outline" label="CA (TND)" value={ca} color={TEAL} bg={TEAL_BG} sub={T.sub} />
                        <KpiCard icon="cart-outline" label="Commandes" value={kpis.total_commandes || 0} color="#2563EB" bg="#DBEAFE" sub={T.sub} />
                        <KpiCard icon="checkmark-circle-outline" label="Livrées" value={kpis.livrees || 0} color="#059669" bg="#D1FAE5" sub={T.sub} />
                        <KpiCard icon="close-circle-outline" label="Annulées" value={kpis.annulees || 0} color="#DC2626" bg="#FEE2E2" sub={T.sub} />
                        <KpiCard icon="people-outline" label="Clients" value={kpis.nb_clients || 0} color="#7C3AED" bg="#EDE9FE" sub={T.sub} />
                        <KpiCard icon="trending-up-outline" label="Taux liv." value={`${taux}%`} color="#D97706" bg="#FEF3C7" sub={T.sub} />
                    </View>

                    <Text style={[styles.sectionTitle, { color: T.text }]}>Chiffre d'affaires (TND)</Text>
                    <View style={[styles.section, { backgroundColor: T.card, borderColor: T.border }]}>
                        <LineBarChart data={caFormatted} labelKey="label" valueKey="ca" chartColor={TEAL} T={T} />
                    </View>

                    <Text style={[styles.sectionTitle, { color: T.text }]}>Répartition par statut</Text>
                    <View style={[styles.section, { backgroundColor: T.card, borderColor: T.border }]}>
                        {parStatut.length === 0 ? <Text style={[styles.emptyText, { color: T.sub }]}>Aucune donnée</Text>
                            : parStatut.map((s, i) => {
                                const st = STATUT_MAP[parseInt(s.etat)] || { label: `Statut ${s.etat}`, color: '#6B7280' };
                                const maxSt = Math.max(...parStatut.map(x => parseInt(x.nb)));
                                return <HorizBar key={i} label={st.label} value={parseInt(s.nb)} max={maxSt} color={st.color} T={T} />;
                            })}
                    </View>

                    <Text style={[styles.sectionTitle, { color: T.text }]}>Top 5 produits vendus</Text>
                    <View style={[styles.section, { backgroundColor: T.card, borderColor: T.border }]}>
                        {topProduits.length === 0 ? <Text style={[styles.emptyText, { color: T.sub }]}>Aucune donnée</Text>
                            : topProduits.map((p, i) => <HorizBar key={i} label={p.produit} value={parseInt(p.total_vendus)} max={maxProd} color={BAR_COLORS[i]} suffix=" ventes" T={T} />)}
                    </View>

                    <Text style={[styles.sectionTitle, { color: T.text }]}>Top 5 villes</Text>
                    <View style={[styles.section, { backgroundColor: T.card, borderColor: T.border }]}>
                        {topVilles.length === 0 ? <Text style={[styles.emptyText, { color: T.sub }]}>Aucune donnée</Text>
                            : topVilles.map((v, i) => <HorizBar key={i} label={v.ville} value={parseInt(v.nb_commandes)} max={maxVille} color={BAR_COLORS[i]} suffix=" cmd" T={T} />)}
                    </View>
                    <View style={{ height: 24 }} />
                </ScrollView>
            )}

            <AppFooter darkMode={darkMode} />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1 },
    scroll: { padding: 16 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    periodeRow: { flexDirection: 'row', gap: 8, padding: 12, borderBottomWidth: 1 },
    periodeChip: { paddingHorizontal: 18, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
    periodeText: { fontSize: 13, fontWeight: '500' },
    sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 10, marginTop: 4 },
    section: { borderRadius: 12, padding: 14, borderWidth: 1, marginBottom: 16 },
    emptyText: { fontSize: 13, textAlign: 'center', paddingVertical: 8 },
    kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
    kpiCard: { width: (SW - 48) / 3 - 4, borderRadius: 12, padding: 12, alignItems: 'center' },
    kpiVal: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
    kpiLbl: { fontSize: 10, color: '#6B7280', textAlign: 'center' },
    hBarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
    hBarLabel: { width: 90, fontSize: 12 },
    hBarTrack: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
    hBarFill: { height: 8, borderRadius: 4 },
    hBarVal: { width: 60, fontSize: 11, textAlign: 'right' },
});