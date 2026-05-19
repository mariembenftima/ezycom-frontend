import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, Line, LinearGradient, Polyline, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { API_URL } from '../../config';
import { loadSession } from '../../utils/auth';
import { loadDarkMode, saveDarkMode } from '../../utils/darkMode';
import AppFooter from '../components/AppFooter';
import AppHeader from '../components/AppHeader';

const TEAL    = '#29B6D8';
const TEAL_BG = '#E8F8FC';
const BORDER  = '#E5E7EB';
const GRAY    = '#6B7280';
const { width: SW } = Dimensions.get('window');

const STATUT_MAP = {
    0: { label: 'En attente', color: '#D97706', bg: '#FEF3C7' },
    1: { label: 'Confirmée',  color: '#2563EB', bg: '#DBEAFE' },
    2: { label: 'Dispatché',  color: '#7C3AED', bg: '#EDE9FE' },
    5: { label: 'Livrée',     color: '#059669', bg: '#D1FAE5' },
    7: { label: 'Annulée',    color: '#DC2626', bg: '#FEE2E2' },
};

const MOIS_LABELS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
const BAR_COLORS  = ['#29B6D8','#7C3AED','#059669','#D97706','#2563EB','#DC2626','#0891B2','#9333EA','#16A34A','#B45309','#1D4ED8','#B91C1C'];

const KpiCard = ({ icon, label, value, color, bg, onPress }) => (
    <TouchableOpacity style={[styles.kpiCard, { backgroundColor: bg }]} onPress={onPress} activeOpacity={onPress ? 0.7 : 1} disabled={!onPress}>
        <Ionicons name={icon} size={22} color={color} style={{ marginBottom: 6 }} />
        <Text style={[styles.kpiVal, { color }]}>{value}</Text>
        <Text style={styles.kpiLbl}>{label}</Text>
    </TouchableOpacity>
);

const ProdCard = ({ icon, label, sub, value, color, bg, onPress }) => (
    <TouchableOpacity style={[styles.prodCard, { backgroundColor: bg }]} onPress={onPress} activeOpacity={onPress ? 0.7 : 1} disabled={!onPress}>
        <View style={styles.prodCardTop}>
            <View style={[styles.prodIconWrap, { backgroundColor: color + '22' }]}>
                <Ionicons name={icon} size={18} color={color} />
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={[styles.prodCardLabel, { color }]} numberOfLines={2}>{label}</Text>
                {sub ? <Text style={styles.prodCardSub}>{sub}</Text> : null}
            </View>
        </View>
        <Text style={[styles.prodCardVal, { color }]}>{value}</Text>
        <Text style={styles.prodCardUnit}>Produits</Text>
    </TouchableOpacity>
);

const LineBarChart = ({ data, labelKey, valueKey, chartColor, height = 140 }) => {
    const W = SW - 64, H = height, PAD_TOP = 20, PAD_BOT = 22, innerH = H - PAD_TOP - PAD_BOT;
    if (!data || data.length === 0) return <View style={{ height: H, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: GRAY, fontSize: 12 }}>Aucune donnée</Text></View>;
    const values = data.map(d => parseFloat(d[valueKey] || 0));
    const maxVal = Math.max(...values, 1);
    const barW   = Math.max(8, Math.floor((W - data.length * 4) / data.length));
    const gap    = (W - data.length * barW) / (data.length - 1 || 1);
    const points = data.map((d, i) => ({ x: i * (barW + gap) + barW / 2, y: PAD_TOP + innerH - (parseFloat(d[valueKey] || 0) / maxVal) * innerH }));
    const polyPoints = points.map(p => `${p.x},${p.y}`).join(' ');
    return (
        <View style={{ height: H }}>
            <Svg width={W} height={H}>
                <Defs>{data.map((_, i) => <LinearGradient key={i} id={`grad${i}`} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={BAR_COLORS[i % BAR_COLORS.length]} stopOpacity="1" /><Stop offset="1" stopColor={BAR_COLORS[i % BAR_COLORS.length]} stopOpacity="0.4" /></LinearGradient>)}</Defs>
                {[0.25,0.5,0.75,1].map((pct,i) => <Line key={i} x1="0" y1={PAD_TOP+innerH*(1-pct)} x2={W} y2={PAD_TOP+innerH*(1-pct)} stroke="#E5E7EB" strokeWidth="1" strokeDasharray="4,4" />)}
                {data.map((d,i) => { const x=i*(barW+gap),val=parseFloat(d[valueKey]||0),h=Math.max(val>0?4:0,(val/maxVal)*innerH),y=PAD_TOP+innerH-h; return <Rect key={i} x={x} y={y} width={barW} height={h} rx={4} fill={`url(#grad${i})`} />; })}
                {data.length>1 && <Polyline points={polyPoints} fill="none" stroke={chartColor||TEAL} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}
                {points.map((p,i) => <Circle key={i} cx={p.x} cy={p.y} r={3.5} fill="#fff" stroke={chartColor||TEAL} strokeWidth="2" />)}
                {data.map((d,i) => { const x=i*(barW+gap)+barW/2,val=parseFloat(d[valueKey]||0),y=PAD_TOP+innerH-(val/maxVal)*innerH-6; if(val===0)return null; return <SvgText key={i} x={x} y={y} fontSize="7" fill={BAR_COLORS[i%BAR_COLORS.length]} textAnchor="middle" fontWeight="700">{Math.round(val)}</SvgText>; })}
            </Svg>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
                {data.map((d,i) => <Text key={i} style={{ fontSize: 7, color: GRAY, width: barW+gap, textAlign: 'center' }} numberOfLines={1}>{d[labelKey]||''}</Text>)}
            </View>
        </View>
    );
};

const WeeklyChart = ({ data }) => {
    const formatted = (data||[]).map(d => ({ label: d.jour ? d.jour.slice(5) : '', ca: d.ca }));
    return <LineBarChart data={formatted} labelKey="label" valueKey="ca" chartColor="#29B6D8" />;
};

const AnnualChart = ({ data }) => {
    const slots = Array.from({ length: 12 }, (_, i) => {
        const found = (data||[]).find(d => parseInt((d.mois||'').split('-')[1]) - 1 === i);
        return { label: MOIS_LABELS[i], ca: found ? parseFloat(found.ca||0) : 0 };
    });
    const total = slots.reduce((s, d) => s + d.ca, 0);
    return (
        <View>
            <LineBarChart data={slots} labelKey="label" valueKey="ca" chartColor="#7C3AED" height={150} />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 11 }}>
                <Text style={{ fontSize: 11, color: GRAY }}>Total : </Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: TEAL }}>{total.toFixed(3)} TND</Text>
            </View>
        </View>
    );
};

export default function DashboardHome() {
    const [session,    setSession]    = useState(null);
    const [darkMode,   setDarkMode]   = useState(false);
    const [token,      setToken]      = useState(null);
    const [data,       setData]       = useState(null);
    const [loading,    setLoading]    = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => { loadDarkMode().then(setDarkMode); }, []);

    useFocusEffect(useCallback(() => {
        (async () => {
            const s = await loadSession();
            if (!s?.token) { router.replace('/(auth)/login'); return; }
            setSession(s); setToken(s.token);
            fetchDashboard(s.token);
        })();
    }, []));

    const fetchDashboard = async (tok) => {
        try {
            const res  = await fetch(`${API_URL}/api/dashboard/stats.php`, { headers: { 'X-Token': tok } });
            const json = await res.json();
            if (json.success) setData(json.data);
        } catch (e) { console.log('DASHBOARD ERROR:', e); }
        finally { setLoading(false); setRefreshing(false); }
    };

    const onRefresh = () => { setRefreshing(true); fetchDashboard(token); };

    const kpis        = data?.kpis        || {};
    const topProduits = data?.top_produits || [];
    const parStatut   = data?.par_statut   || [];
    const caSemaine   = data?.ca_semaine   || [];
    const caAnnuel    = data?.ca_annuel    || [];
    const prodStats   = data?.prod_stats   || {};
    const quota       = data?.quota        || {};

    const caJour  = kpis.ca_jour  ? parseFloat(kpis.ca_jour).toFixed(3)  : '0.000';
    const caMois  = kpis.ca_mois  ? parseFloat(kpis.ca_mois).toFixed(3)  : '0.000';
    const maxProd = topProduits.length ? Math.max(...topProduits.map(p => parseInt(p.total_vendus||0))) : 1;

    const bg        = darkMode ? '#0F1B2D' : '#F9FAFB';
    const cardBg    = darkMode ? '#1A2A3D' : '#fff';
    const cardBorder= darkMode ? '#1E3A50' : BORDER;
    const titleColor= darkMode ? '#E2EEF8' : '#111827';
    const subColor  = darkMode ? '#8899AA' : GRAY;

    const QUICK_LINKS = [
        { icon: 'add-circle-outline', label: 'Ajouter\nvente',  route: '/(merchant)/ajouter-vente',          color: TEAL     },
        { icon: 'list-outline',        label: 'Commandes',       route: '/(merchant)/commandes/detail',        color: '#2563EB' },
        { icon: 'cube-outline',        label: 'Produits',        route: '/(merchant)/stock/produits/produits', color: '#7C3AED' },
        { icon: 'bar-chart-outline',   label: 'Statistiques',    route: '/(merchant)/statistiques',            color: '#059669' },
    ];

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
            <AppHeader
                session={session} darkMode={darkMode}
                onToggleDark={() => { const next = !darkMode; setDarkMode(next); saveDarkMode(next); }}
                onLogout={() => router.replace('/(auth)/login')}
            />

            {loading ? (
                <View style={styles.center}><ActivityIndicator color={TEAL} size="large" /></View>
            ) : (
                <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TEAL} />}>

                    <Text style={[styles.sectionTitle, { color: titleColor }]}>Aperçu du jour</Text>
                    <View style={styles.kpiGrid}>
                        <KpiCard icon="cash-outline"     label="CA aujourd'hui"  value={`${caJour} TND`}          color={TEAL}    bg={darkMode ? '#0D3040' : TEAL_BG}   />
                        <KpiCard icon="calendar-outline" label="CA ce mois"      value={`${caMois} TND`}          color="#2563EB" bg={darkMode ? '#0D1F40' : '#DBEAFE'} />
                        <KpiCard icon="time-outline"     label="En attente"      value={kpis.en_attente || 0}     color="#D97706" bg={darkMode ? '#2D1F00' : '#FEF3C7'}
                            onPress={() => router.push('/(merchant)/commandes/detail?etat=0')} />
                        <KpiCard icon="cart-outline"     label="Commandes/jour"  value={kpis.commandes_jour || 0} color="#059669" bg={darkMode ? '#0D2D1F' : '#D1FAE5'}
                            onPress={() => router.push('/(merchant)/commandes/detail')} />
                    </View>

                    <Text style={[styles.sectionTitle, { color: titleColor }]}>Quota</Text>
                    <View style={styles.quotaRow}>
                        <View style={[styles.quotaCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                            <Text style={[styles.quotaCardTitle, { color: titleColor }]}>Quota Commandes du mois</Text>
                            <View style={styles.quotaValRow}>
                                <Text style={[styles.quotaBig, { color: titleColor }]}>{quota.commandes_used || 0}</Text>
                                <Text style={[styles.quotaSmall, { color: subColor }]}>/{quota.illimite ? '∞' : (quota.commandes_limit || 0)}</Text>
                            </View>
                            <View style={[styles.quotaTrack, { backgroundColor: darkMode ? '#1E3A50' : '#E8EEF4' }]}>
                                <View style={[styles.quotaFill, {
                                    width: quota.illimite ? '0%' : `${Math.min(100, ((quota.commandes_used || 0) / (quota.commandes_limit || 1)) * 100)}%`,
                                    backgroundColor: '#7C3AED'
                                }]} />
                            </View>
                            <Text style={[styles.quotaPct, { color: subColor }]}>
                                {quota.illimite ? 'Illimité' : `${Math.round(((quota.commandes_used || 0) / (quota.commandes_limit || 1)) * 100)}%`}
                            </Text>
                        </View>

                        <View style={[styles.quotaCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                            <Text style={[styles.quotaCardTitle, { color: titleColor }]}>Quota Produits</Text>
                            <View style={styles.quotaValRow}>
                                <Text style={[styles.quotaBig, { color: titleColor }]}>{quota.produits_used || 0}</Text>
                                <Text style={[styles.quotaSmall, { color: subColor }]}>/{quota.illimite ? '∞' : (quota.produits_limit || 0)}</Text>
                            </View>
                            <View style={[styles.quotaTrack, { backgroundColor: darkMode ? '#1E3A50' : '#E8EEF4' }]}>
                                <View style={[styles.quotaFill, {
                                    width: quota.illimite ? '0%' : `${Math.min(100, ((quota.produits_used || 0) / (quota.produits_limit || 1)) * 100)}%`,
                                    backgroundColor: '#7C3AED'
                                }]} />
                            </View>
                            <Text style={[styles.quotaPct, { color: subColor }]}>
                                {quota.illimite ? 'Illimité' : `${Math.round(((quota.produits_used || 0) / (quota.produits_limit || 1)) * 100)}%`}
                            </Text>
                        </View>
                    </View>

                    <Text style={[styles.sectionTitle, { color: titleColor }]}>Produits</Text>
                    <View style={styles.prodGrid}>
                        <ProdCard
                            icon="cube-outline" label="Produit commandé"
                            value={prodStats.commandes || 0} color="#7C3AED" bg={darkMode ? '#1A1040' : '#EDE9FE'}
                            onPress={() => router.push('/(merchant)/stock/produits/produits')}
                        />
                        <ProdCard
                            icon="alert-circle-outline" label="Produits en rupture de stock"
                            value={prodStats.rupture || 0} color="#DC2626" bg={darkMode ? '#2D0D0D' : '#FEE2E2'}
                            onPress={() => router.push('/(merchant)/stock/produits/produits')}
                        />
                        <ProdCard
                            icon="trending-down-outline" label="Produits en seuil de stock"
                            value={prodStats.seuil_stock || 0} color="#D97706" bg={darkMode ? '#2D1F00' : '#FEF3C7'}
                            onPress={() => router.push('/(merchant)/stock/produits/produits')}
                        />
                        <ProdCard
                            icon="ban-outline" label="Produits jamais commandés"
                            value={prodStats.jamais_commandes || 0} color="#6B7280" bg={darkMode ? '#1A2A3D' : '#F3F4F6'}
                            onPress={() => router.push('/(merchant)/stock/produits/produits')}
                        />
                    </View>

                    <Text style={[styles.sectionTitle, { color: titleColor }]}>CA — 7 derniers jours (TND)</Text>
                    <View style={[styles.section, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                        <WeeklyChart data={caSemaine} />
                    </View>

                    <Text style={[styles.sectionTitle, { color: titleColor }]}>CA — Année en cours (TND)</Text>
                    <View style={[styles.section, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                        <AnnualChart data={caAnnuel} />
                    </View>

                    <Text style={[styles.sectionTitle, { color: titleColor }]}>Commandes ce mois (par statut)</Text>
                    <View style={[styles.section, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                        {parStatut.length === 0 ? (
                            <Text style={[styles.emptyText, { color: subColor }]}>Aucune commande ce mois</Text>
                        ) : parStatut.map((s, i) => {
                            const st    = STATUT_MAP[parseInt(s.etat)] || { label: `Statut ${s.etat}`, color: GRAY };
                            const maxSt = Math.max(...parStatut.map(x => parseInt(x.nb)));
                            const pct   = maxSt > 0 ? (parseInt(s.nb) / maxSt) * 100 : 0;
                            return (
                                <TouchableOpacity key={i} style={styles.hBarRow}
                                    onPress={() => router.push(`/(merchant)/commandes/detail?etat=${s.etat}`)} activeOpacity={0.7}>
                                    <View style={[styles.statusDot, { backgroundColor: st.color }]} />
                                    <Text style={[styles.hBarLabel, { color: titleColor }]} numberOfLines={1}>{st.label}</Text>
                                    <View style={[styles.hBarTrack, { backgroundColor: darkMode ? '#1E3A50' : '#F3F4F6' }]}>
                                        <View style={[styles.hBarFill, { width: `${pct}%`, backgroundColor: st.color }]} />
                                    </View>
                                    <Text style={[styles.hBarVal, { color: subColor }]}>{s.nb}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <Text style={[styles.sectionTitle, { color: titleColor }]}>Top 5 produits vendus (30j)</Text>
                    <View style={[styles.section, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                        {topProduits.length === 0 ? (
                            <Text style={[styles.emptyText, { color: subColor }]}>Aucune vente ce mois</Text>
                        ) : topProduits.map((p, i) => {
                            const pct = maxProd > 0 ? (parseInt(p.total_vendus) / maxProd) * 100 : 0;
                            return (
                                <View key={i} style={styles.hBarRow}>
                                    <Text style={[styles.rankNum, { color: BAR_COLORS[i] }]}>{i + 1}</Text>
                                    <Text style={[styles.hBarLabel, { color: titleColor }]} numberOfLines={1}>{p.produit}</Text>
                                    <View style={[styles.hBarTrack, { backgroundColor: darkMode ? '#1E3A50' : '#F3F4F6' }]}>
                                        <View style={[styles.hBarFill, { width: `${pct}%`, backgroundColor: BAR_COLORS[i] }]} />
                                    </View>
                                    <Text style={[styles.hBarVal, { color: subColor }]}>{p.total_vendus}</Text>
                                </View>
                            );
                        })}
                    </View>

                    <Text style={[styles.sectionTitle, { color: titleColor }]}>Accès rapide</Text>
                    <View style={styles.quickRow}>
                        {QUICK_LINKS.map((btn, i) => (
                            <TouchableOpacity key={i} style={[styles.quickCard, { backgroundColor: cardBg, borderColor: cardBorder }]}
                                onPress={() => router.push(btn.route)} activeOpacity={0.7}>
                                <Ionicons name={btn.icon} size={26} color={btn.color} />
                                <Text style={[styles.quickLabel, { color: subColor }]}>{btn.label}</Text>
                            </TouchableOpacity>
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
    safe:         { flex: 1 },
    scroll:       { padding: 16 },
    center:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
    sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 10, marginTop: 4 },
    section:      { borderRadius: 12, padding: 14, borderWidth: 1, marginBottom: 16 },
    emptyText:    { fontSize: 13, textAlign: 'center', paddingVertical: 8 },
    kpiGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
    kpiCard:      { width: (SW - 48) / 2 - 4, borderRadius: 12, padding: 14, alignItems: 'center' },
    kpiVal:       { fontSize: 15, fontWeight: '700', marginBottom: 2, textAlign: 'center' },
    kpiLbl:       { fontSize: 10, color: GRAY, textAlign: 'center' },
    prodGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
    prodCard:     { width: (SW - 48) / 2 - 4, borderRadius: 12, padding: 14 },
    prodCardTop:  { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
    prodIconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    prodCardLabel:{ fontSize: 12, fontWeight: '600', lineHeight: 16 },
    prodCardSub:  { fontSize: 10, color: GRAY, marginTop: 2 },
    prodCardVal:  { fontSize: 28, fontWeight: '800' },
    prodCardUnit: { fontSize: 12, color: GRAY, fontWeight: '600' },
    hBarRow:      { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
    statusDot:    { width: 8, height: 8, borderRadius: 4 },
    rankNum:      { width: 16, fontSize: 12, fontWeight: '700', textAlign: 'center' },
    hBarLabel:    { width: 80, fontSize: 12 },
    hBarTrack:    { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
    hBarFill:     { height: 8, borderRadius: 4 },
    hBarVal:      { width: 30, fontSize: 11, textAlign: 'right' },
    quotaRow:        { flexDirection: 'row', gap: 10, marginBottom: 16 },
    quotaCard:       { flex: 1, borderRadius: 12, padding: 14, borderWidth: 1 },
    quotaCardTitle:  { fontSize: 12, fontWeight: '700', marginBottom: 12 },
    quotaValRow:     { flexDirection: 'row', alignItems: 'baseline', marginBottom: 12 },
    quotaBig:        { fontSize: 36, fontWeight: '200', lineHeight: 40 },
    quotaSmall:      { fontSize: 13, marginLeft: 2 },
    quotaTrack:      { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 4 },
    quotaFill:       { height: 8, borderRadius: 4 },
    quotaPct:        { fontSize: 11, textAlign: 'right' },
    quickRow:     { flexDirection: 'row', gap: 10, marginBottom: 16 },
    quickCard:    { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center', gap: 8, borderWidth: 1 },
    quickLabel:   { fontSize: 10, textAlign: 'center' },
});