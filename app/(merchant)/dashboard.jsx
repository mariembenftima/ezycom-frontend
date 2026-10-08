import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, {
    Circle, Defs, Line, LinearGradient,
    Path, Polyline, Rect, Stop, Text as SvgText,
} from 'react-native-svg';
import api from '../../utils/api';
import { loadSession } from '../../utils/auth';
import { loadDarkMode, saveDarkMode } from '../../utils/darkMode';
import AppFooter from '../components/AppFooter';
import AppHeader from '../components/AppHeader';

const { width: SW } = Dimensions.get('window');

import { BAR_COLORS, BORDER, GRAY, NAVY, TEAL, TEAL_BG } from '../../utils/theme';
import { ORDER_STATUS } from '../../utils/orderStatus';
const STATUT_MAP = ORDER_STATUS;

const MOIS_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

const QUICK_LINKS = [
    { icon: 'add-circle-outline', label: 'Ajouter\nvente', route: '/(merchant)/ajouter-vente', color: TEAL },
    { icon: 'list-outline', label: 'Commandes', route: '/(merchant)/commandes/detail', color: '#2563EB' },
    { icon: 'cube-outline', label: 'Produits', route: '/(merchant)/stock/produits/produits', color: '#7C3AED' },
    { icon: 'bar-chart-outline', label: 'Statistiques', route: '/(merchant)/statistiques', color: '#059669' },
];

const fmtTND = (n) => `${parseFloat(n || 0).toFixed(3)} TND`;

const dayLabel = (dateStr) => {
    const d = new Date(dateStr);
    return ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'][d.getDay()];
};

const EvoTag = ({ value }) => {
    if (value === null || value === undefined) return null;
    const up = value >= 0;
    return (
        <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 3,
            backgroundColor: up ? '#10B98118' : '#EF444418',
            borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3,
        }}>
            <Ionicons name={up ? 'trending-up' : 'trending-down'} size={12} color={up ? '#059669' : '#DC2626'} />
            <Text style={{ fontSize: 11, fontWeight: '700', color: up ? '#059669' : '#DC2626' }}>
                {up ? '+' : ''}{value}%
            </Text>
        </View>
    );
};

const KpiCard = ({ icon, label, value, color, bg, onPress, delay = 0, sub }) => {
    const anim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(anim, { toValue: 1, duration: 450, delay, useNativeDriver: true }).start();
    }, []);
    return (
        <Animated.View style={{ opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
            <TouchableOpacity
                style={[styles.kpiCard, { backgroundColor: bg, width: (SW - 48) / 2 - 4 }]}
                onPress={onPress} activeOpacity={onPress ? 0.7 : 1} disabled={!onPress}
            >
                <Ionicons name={icon} size={22} color={color} style={{ marginBottom: 6 }} />
                <Text style={[styles.kpiVal, { color }]}>{value}</Text>
                <Text style={[styles.kpiLbl, { color: sub }]}>{label}</Text>
            </TouchableOpacity>
        </Animated.View>
    );
};

const ProdCard = ({ icon, label, value, color, bg, onPress, sub }) => (
    <TouchableOpacity
        style={[styles.prodCard, { backgroundColor: bg, width: (SW - 48) / 2 - 4 }]}
        onPress={onPress} activeOpacity={onPress ? 0.7 : 1} disabled={!onPress}
    >
        <View style={styles.prodCardTop}>
            <View style={[styles.prodIconWrap, { backgroundColor: color + '22' }]}>
                <Ionicons name={icon} size={18} color={color} />
            </View>
            <Text style={[styles.prodCardLabel, { color }]} numberOfLines={2}>{label}</Text>
        </View>
        <Text style={[styles.prodCardVal, { color }]}>{value}</Text>
        <Text style={[styles.prodCardUnit, { color: sub }]}>Produits</Text>
    </TouchableOpacity>
);

const LineBarChart = ({ data, labelKey, valueKey, chartColor, height = 140, dark }) => {
    const W = SW - 64, H = height, PAD_TOP = 20, PAD_BOT = 22, innerH = H - PAD_TOP - PAD_BOT;
    const gridColor = dark ? '#1E3A50' : '#E5E7EB';
    const labelColor = dark ? '#8899AA' : GRAY;
    if (!data || data.length === 0)
        return <View style={{ height: H, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: labelColor, fontSize: 12 }}>Aucune donnée</Text></View>;

    const values = data.map(d => parseFloat(d[valueKey] || 0));
    const maxVal = Math.max(...values, 1);
    const barW = Math.max(8, Math.floor((W - data.length * 4) / data.length));
    const gap = (W - data.length * barW) / (data.length - 1 || 1);
    const points = data.map((d, i) => ({
        x: i * (barW + gap) + barW / 2,
        y: PAD_TOP + innerH - (parseFloat(d[valueKey] || 0) / maxVal) * innerH,
    }));
    const polyPoints = points.map(p => `${p.x},${p.y}`).join(' ');

    const areaPath = points.length > 1
        ? `M${points[0].x},${PAD_TOP + innerH} ` +
        points.map(p => `L${p.x},${p.y}`).join(' ') +
        ` L${points[points.length - 1].x},${PAD_TOP + innerH} Z`
        : '';

    return (
        <View style={{ height: H + 16 }}>
            <Svg width={W} height={H}>
                <Defs>
                    {data.map((_, i) => (
                        <LinearGradient key={`bar${i}`} id={`grad${i}`} x1="0" y1="0" x2="0" y2="1">
                            <Stop offset="0" stopColor={BAR_COLORS[i % BAR_COLORS.length]} stopOpacity="1" />
                            <Stop offset="1" stopColor={BAR_COLORS[i % BAR_COLORS.length]} stopOpacity="0.3" />
                        </LinearGradient>
                    ))}
                    <LinearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0" stopColor={chartColor || TEAL} stopOpacity="0.25" />
                        <Stop offset="1" stopColor={chartColor || TEAL} stopOpacity="0" />
                    </LinearGradient>
                </Defs>

                {[0.25, 0.5, 0.75, 1].map((pct, i) => (
                    <Line key={i}
                        x1="0" y1={PAD_TOP + innerH * (1 - pct)}
                        x2={W} y2={PAD_TOP + innerH * (1 - pct)}
                        stroke={gridColor} strokeWidth="1" strokeDasharray="4,4"
                    />
                ))}

                {data.map((d, i) => {
                    const val = parseFloat(d[valueKey] || 0);
                    const h = Math.max(val > 0 ? 4 : 0, (val / maxVal) * innerH);
                    const x = i * (barW + gap);
                    const y = PAD_TOP + innerH - h;
                    return <Rect key={i} x={x} y={y} width={barW} height={h} rx={4} fill={`url(#grad${i})`} />;
                })}

                {data.length > 1 && <Path d={areaPath} fill="url(#areaFill)" />}

                {data.length > 1 && (
                    <Polyline points={polyPoints} fill="none"
                        stroke={chartColor || TEAL} strokeWidth="2.5"
                        strokeLinejoin="round" strokeLinecap="round"
                    />
                )}

                {points.map((p, i) => (
                    <Circle key={i} cx={p.x} cy={p.y} r={4} fill="#fff" stroke={chartColor || TEAL} strokeWidth="2" />
                ))}

                {data.map((d, i) => {
                    const val = parseFloat(d[valueKey] || 0);
                    if (val === 0) return null;
                    const x = i * (barW + gap) + barW / 2;
                    const y = PAD_TOP + innerH - (val / maxVal) * innerH - 6;
                    return (
                        <SvgText key={i} x={x} y={y} fontSize="7"
                            fill={BAR_COLORS[i % BAR_COLORS.length]}
                            textAnchor="middle" fontWeight="700">
                            {Math.round(val)}
                        </SvgText>
                    );
                })}
            </Svg>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 0, marginTop: 2 }}>
                {data.map((d, i) => (
                    <Text key={i} style={{ fontSize: 8, color: labelColor, width: barW + gap, textAlign: 'center' }} numberOfLines={1}>
                        {d[labelKey] || ''}
                    </Text>
                ))}
            </View>
        </View>
    );
};

const WeeklyChart = ({ data, chartColor, dark }) => {
    const formatted = (data || []).map(d => ({ label: d.jour ? dayLabel(d.jour) : '', ca: d.ca }));
    return <LineBarChart data={formatted} labelKey="label" valueKey="ca" chartColor={chartColor || TEAL} dark={dark} />;
};

const AnnualChart = ({ data, chartColor, dark }) => {
    const slots = Array.from({ length: 12 }, (_, i) => {
        const found = (data || []).find(d => parseInt((d.mois || '').split('-')[1]) - 1 === i);
        return { label: MOIS_LABELS[i], ca: found ? parseFloat(found.ca || 0) : 0 };
    });
    const total = slots.reduce((s, d) => s + d.ca, 0);
    return (
        <View>
            <LineBarChart data={slots} labelKey="label" valueKey="ca" chartColor={chartColor || '#7C3AED'} height={150} dark={dark} />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 }}>
                <Text style={{ fontSize: 11, color: GRAY }}>Total annuel : </Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#7C3AED' }}>{fmtTND(total)}</Text>
            </View>
        </View>
    );
};

const DonutChart = ({ data, dark }) => {
    if (!data || data.length === 0) return null;
    const R = 52;
    const CX = 65, CY = 65;
    const circ = 2 * Math.PI * R;
    const total = data.reduce((s, d) => s + parseInt(d.nb || 0), 0) || 1;
    const labelC = dark ? '#8899AA' : GRAY;

    let offset = 0;
    const slices = data.map(d => {
        const nb = parseInt(d.nb || 0);
        const st = STATUT_MAP[parseInt(d.etat)] || { color: GRAY, label: `Etat ${d.etat}` };
        const dash = (nb / total) * circ;
        const gap = circ - dash;
        const s = { nb, color: st.color, label: st.label, dash, gap, offset };
        offset += dash;
        return s;
    });

    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Svg width={CX * 2} height={CY * 2}>
                <Circle cx={CX} cy={CY} r={R} fill="none" stroke={dark ? '#1E3A50' : '#F3F4F6'} strokeWidth={16} />
                {slices.map((sl, i) => (
                    <Circle key={i} cx={CX} cy={CY} r={R} fill="none"
                        stroke={sl.color} strokeWidth={16}
                        strokeDasharray={`${sl.dash} ${sl.gap}`}
                        strokeDashoffset={circ / 4 - sl.offset}
                        strokeLinecap="butt"
                    />
                ))}
                <SvgText x={CX} y={CY - 6} fontSize={20} fontWeight="700"
                    fill={dark ? '#E2EEF8' : '#111827'} textAnchor="middle">{total}</SvgText>
                <SvgText x={CX} y={CY + 12} fontSize={9} fill={labelC} textAnchor="middle">commandes</SvgText>
            </Svg>
            <View style={{ flex: 1, gap: 7 }}>
                {slices.map((sl, i) => (
                    <TouchableOpacity key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                        onPress={() => router.push(`/(merchant)/commandes/detail?etat=${data[i].etat}`)}
                        activeOpacity={0.7}>
                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: sl.color }} />
                        <Text style={{ fontSize: 11, color: labelC, flex: 1 }}>{sl.label}</Text>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: dark ? '#E2EEF8' : '#111827' }}>{sl.nb}</Text>
                        <Text style={{ fontSize: 10, color: labelC }}>({Math.round(sl.nb / total * 100)}%)</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
};

const Section = ({ title, subtitle, cardBg, cardBorder, titleColor, accentColor, children }) => (
    <View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginTop: 4, gap: 8 }}>
            <View style={{ width: 4, height: 18, borderRadius: 2, backgroundColor: accentColor || TEAL }} />
            <View style={{ flex: 1 }}>
                <Text style={[styles.sectionTitle, { color: titleColor, marginBottom: 0 }]}>{title}</Text>
                {subtitle && <Text style={{ fontSize: 10, color: GRAY, marginTop: 1 }}>{subtitle}</Text>}
            </View>
        </View>
        <View style={[styles.section, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            {children}
        </View>
    </View>
);

export default function DashboardHome() {
    const [session, setSession] = useState(null);
    const [darkMode, setDarkMode] = useState(false);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [chartTab, setChartTab] = useState('ca');   // 'ca' | 'orders'

    useEffect(() => { loadDarkMode().then(setDarkMode); }, []);

    const lastFetchRef = useRef(0);
    const MIN_REFRESH_INTERVAL_MS = 3000;

    useFocusEffect(useCallback(() => {
        (async () => {
            const s = await loadSession();
            if (!s?.token) { router.replace('/(auth)/login'); return; }
            setSession(s);
            const now = Date.now();
            if (now - lastFetchRef.current < MIN_REFRESH_INTERVAL_MS) return;
            lastFetchRef.current = now;
            fetchDashboard();
        })();
    }, []));
    const fetchDashboard = async () => {
        try {
            const json = await api.get('/api/dashboard/stats.php');
            if (json.success) setData(json.data);
        } catch (e) {
            console.error('Erreur chargement:', e.message);
        }
        finally { setLoading(false); setRefreshing(false); }
    };

    const onRefresh = () => { setRefreshing(true); fetchDashboard(); };
    const kpis = data?.kpis || {};
    const evolution = data?.evolution || {};
    const topProduits = data?.top_produits || [];
    const parStatut = data?.par_statut || [];
    const caSemaine = data?.ca_semaine || [];
    const caAnnuel = data?.ca_annuel || [];
    const prodStats = data?.prod_stats || {};
    const stockAlerts = data?.stock_alerts || [];
    const quota = data?.quota || {};

    const caJour = parseFloat(kpis.ca_jour || 0).toFixed(3);
    const caMois = parseFloat(kpis.ca_mois || 0).toFixed(3);
    const maxProd = topProduits.length ? Math.max(...topProduits.map(p => parseInt(p.total_vendus || 0))) : 1;

    const bg = darkMode ? '#0F1B2D' : '#F9FAFB';
    const cardBg = darkMode ? '#1A2A3D' : '#fff';
    const cardBorder = darkMode ? '#1E3A50' : BORDER;
    const titleColor = darkMode ? '#E2EEF8' : '#111827';
    const subColor = darkMode ? '#8899AA' : GRAY;

    const sharedSection = { cardBg, cardBorder, titleColor };

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
            <AppHeader
                session={session}
                darkMode={darkMode}
                onToggleDark={() => { const next = !darkMode; setDarkMode(next); saveDarkMode(next); }}
                onLogout={() => router.replace('/(auth)/login')}
            />

            {loading ? (
                <View style={styles.center}><ActivityIndicator color={TEAL} size="large" /></View>
            ) : (
                <ScrollView
                    contentContainerStyle={styles.scroll}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TEAL} />}
                >

                    <View style={[styles.banner, { backgroundColor: NAVY }]}>
                        <View>
                            <Text style={styles.bannerTitle}>Tableau de bord</Text>
                            <Text style={styles.bannerSub}>
                                {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                            <EvoTag value={evolution.ca} />
                            <View style={styles.liveBadge}>
                                <Ionicons name="pulse-outline" size={12} color={TEAL} />
                                <Text style={styles.liveBadgeText}>Live</Text>
                            </View>
                        </View>
                    </View>

                    {stockAlerts.length > 0 && (
                        <TouchableOpacity
                            style={[styles.alertBanner, { backgroundColor: darkMode ? '#2D1F00' : '#FEF3C7' }]}
                            onPress={() => router.push('/(merchant)/stock/produits/produits')}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="warning-outline" size={16} color="#D97706" />
                            <Text style={[styles.alertBannerText, { color: '#D97706' }]}>
                                {stockAlerts.length} produit{stockAlerts.length > 1 ? 's' : ''} en seuil de stock
                            </Text>
                            <Ionicons name="chevron-forward" size={14} color="#D97706" style={{ marginLeft: 'auto' }} />
                        </TouchableOpacity>
                    )}

                    <Text style={[styles.sectionTitle, { color: titleColor }]}>Aperçu du jour</Text>
                    <View style={styles.kpiGrid}>
                        <KpiCard icon="cash-outline" label="CA aujourd'hui" value={`${caJour} TND`} color={TEAL} bg={darkMode ? '#0D3040' : TEAL_BG} delay={0} sub={subColor} />
                        <KpiCard icon="calendar-outline" label="CA ce mois" value={`${caMois} TND`} color="#2563EB" bg={darkMode ? '#0D1F40' : '#DBEAFE'} delay={60} sub={subColor} />
                        <KpiCard icon="time-outline" label="En attente" value={kpis.en_attente || 0} color="#D97706" bg={darkMode ? '#2D1F00' : '#FEF3C7'}
                            onPress={() => router.push('/(merchant)/commandes/detail?etat=0')} delay={120} sub={subColor} />
                        <KpiCard icon="cart-outline" label="Commandes/jour" value={kpis.commandes_jour || 0} color="#059669" bg={darkMode ? '#0D2D1F' : '#D1FAE5'}
                            onPress={() => router.push('/(merchant)/commandes/detail')} delay={180} sub={subColor} />
                    </View>

                    <Text style={[styles.sectionTitle, { color: titleColor }]}>
                        Quota — {quota.pack_nom || 'Gratuit'}
                    </Text>
                    <View style={styles.quotaRow}>
                        <View style={[styles.quotaCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                            <Text style={[styles.quotaCardTitle, { color: titleColor }]}>Commandes ce mois</Text>
                            <View style={styles.quotaValRow}>
                                <Text style={[styles.quotaBig, { color: titleColor }]}>{quota.commandes_used || 0}</Text>
                                <Text style={[styles.quotaSmall, { color: subColor }]}>/{quota.illimite ? '∞' : (quota.commandes_limit || 0)}</Text>
                            </View>
                            <View style={[styles.quotaTrack, { backgroundColor: darkMode ? '#1E3A50' : '#E8EEF4' }]}>
                                <View style={[styles.quotaFill, {
                                    width: quota.illimite ? '0%' : `${Math.min(100, ((quota.commandes_used || 0) / (quota.commandes_limit || 1)) * 100)}%`,
                                    backgroundColor: '#7C3AED',
                                }]} />
                            </View>
                            <Text style={[styles.quotaPct, { color: subColor }]}>
                                {quota.illimite ? 'Illimité' : `${Math.round(((quota.commandes_used || 0) / (quota.commandes_limit || 1)) * 100)}%`}
                            </Text>
                        </View>

                        <View style={[styles.quotaCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                            <Text style={[styles.quotaCardTitle, { color: titleColor }]}>Produits actifs</Text>
                            <View style={styles.quotaValRow}>
                                <Text style={[styles.quotaBig, { color: titleColor }]}>{quota.produits_used || 0}</Text>
                                <Text style={[styles.quotaSmall, { color: subColor }]}>/{quota.illimite ? '∞' : (quota.produits_limit || 0)}</Text>
                            </View>
                            <View style={[styles.quotaTrack, { backgroundColor: darkMode ? '#1E3A50' : '#E8EEF4' }]}>
                                <View style={[styles.quotaFill, {
                                    width: quota.illimite ? '0%' : `${Math.min(100, ((quota.produits_used || 0) / (quota.produits_limit || 1)) * 100)}%`,
                                    backgroundColor: TEAL,
                                }]} />
                            </View>
                            <Text style={[styles.quotaPct, { color: subColor }]}>
                                {quota.illimite ? 'Illimité' : `${Math.round(((quota.produits_used || 0) / (quota.produits_limit || 1)) * 100)}%`}
                            </Text>
                        </View>
                    </View>

                    <Text style={[styles.sectionTitle, { color: titleColor }]}>Produits</Text>
                    <View style={styles.prodGrid}>
                        <ProdCard icon="cube-outline" label="Produits commandés" value={prodStats.commandes || 0} color="#7C3AED" bg={darkMode ? '#1A1040' : '#EDE9FE'}
                            onPress={() => router.push('/(merchant)/stock/produits/produits')} sub={subColor} />
                        <ProdCard icon="alert-circle-outline" label="Produits en rupture" value={prodStats.rupture || 0} color="#DC2626" bg={darkMode ? '#2D0D0D' : '#FEE2E2'}
                            onPress={() => router.push('/(merchant)/stock/produits/produits')} sub={subColor} />
                        <ProdCard icon="trending-down-outline" label="En seuil de stock" value={prodStats.seuil_stock || 0} color="#D97706" bg={darkMode ? '#2D1F00' : '#FEF3C7'}
                            onPress={() => router.push('/(merchant)/stock/produits/produits')} sub={subColor} />
                        <ProdCard icon="ban-outline" label="Jamais commandés" value={prodStats.jamais_commandes || 0} color="#6B7280" bg={darkMode ? '#1A2A3D' : '#F3F4F6'}
                            onPress={() => router.push('/(merchant)/stock/produits/produits')} sub={subColor} />
                    </View>

                    <Section title="Évolution — 7 derniers jours" subtitle="Glissez vers le bas pour actualiser" accentColor={TEAL} {...sharedSection}>
                        <View style={[styles.chartTabs, { backgroundColor: darkMode ? '#0F1B2D' : '#F3F4F6' }]}>
                            {[{ key: 'ca', label: 'Chiffre d\'affaires' }, { key: 'orders', label: 'Commandes' }].map(t => (
                                <TouchableOpacity key={t.key}
                                    style={[styles.chartTab, chartTab === t.key && { backgroundColor: cardBg }]}
                                    onPress={() => setChartTab(t.key)}
                                >
                                    <Text style={[styles.chartTabText, { color: chartTab === t.key ? titleColor : subColor, fontWeight: chartTab === t.key ? '700' : '400' }]}>
                                        {t.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        {chartTab === 'ca'
                            ? <WeeklyChart data={caSemaine} chartColor={TEAL} dark={darkMode} />
                            : <LineBarChart
                                data={caSemaine.map(d => ({ ...d, label: dayLabel(d.jour) }))}
                                labelKey="label" valueKey="nb_commandes" chartColor="#2563EB" dark={darkMode}
                            />
                        }
                    </Section>

                    <Section title="CA — Année en cours (TND)" accentColor="#7C3AED" {...sharedSection}>
                        <AnnualChart data={caAnnuel} chartColor="#7C3AED" dark={darkMode} />
                    </Section>

                    <Section title="Commandes ce mois — par statut" accentColor="#2563EB" {...sharedSection}>
                        {parStatut.length === 0
                            ? <Text style={[styles.emptyText, { color: subColor }]}>Aucune commande ce mois</Text>
                            : (
                                <>
                                    <DonutChart data={parStatut} dark={darkMode} />
                                    <View style={{ height: 1, backgroundColor: darkMode ? '#1E3A50' : '#F3F4F6', marginVertical: 14 }} />
                                    {parStatut.map((s, i) => {
                                        const st = STATUT_MAP[parseInt(s.etat)] || { label: `Statut ${s.etat}`, color: GRAY };
                                        const maxSt = Math.max(...parStatut.map(x => parseInt(x.nb)));
                                        const pct = maxSt > 0 ? (parseInt(s.nb) / maxSt) * 100 : 0;
                                        return (
                                            <TouchableOpacity key={i} style={styles.hBarRow}
                                                onPress={() => router.push(`/(merchant)/commandes/detail?etat=${s.etat}`)}
                                                activeOpacity={0.7}>
                                                <View style={[styles.statusDot, { backgroundColor: st.color }]} />
                                                <Text style={[styles.hBarLabel, { color: titleColor }]} numberOfLines={1}>{st.label}</Text>
                                                <View style={[styles.hBarTrack, { backgroundColor: darkMode ? '#1E3A50' : '#F3F4F6' }]}>
                                                    <View style={[styles.hBarFill, { width: `${pct}%`, backgroundColor: st.color }]} />
                                                </View>
                                                <Text style={[styles.hBarVal, { color: subColor }]}>{s.nb}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </>
                            )
                        }
                    </Section>

                    <Section title="Top 5 produits vendus (30j)" accentColor="#059669" {...sharedSection}>
                        {topProduits.length === 0
                            ? <Text style={[styles.emptyText, { color: subColor }]}>Aucune vente ce mois</Text>
                            : topProduits.map((p, i) => {
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
                            })
                        }
                    </Section>

                    <Text style={[styles.sectionTitle, { color: titleColor }]}>Accès rapide</Text>
                    <View style={styles.quickRow}>
                        {QUICK_LINKS.map((btn, i) => (
                            <TouchableOpacity key={i}
                                style={[styles.quickCard, { backgroundColor: cardBg, borderColor: cardBorder }]}
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
    safe: { flex: 1 },
    scroll: { padding: 16 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    banner: { borderRadius: 14, padding: 16, marginBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    bannerTitle: { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: 0.2 },
    bannerSub: { fontSize: 11, color: '#5A8A9A', marginTop: 2, textTransform: 'capitalize' },
    liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#00B4D818', borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4 },
    liveBadgeText: { fontSize: 11, fontWeight: '700', color: TEAL },

    alertBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, padding: 12, marginBottom: 14 },
    alertBannerText: { fontSize: 13, fontWeight: '600', flex: 1 },

    sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 10, marginTop: 4 },
    section: { borderRadius: 12, padding: 14, borderWidth: 1, marginBottom: 16 },
    emptyText: { fontSize: 13, textAlign: 'center', paddingVertical: 8 },

    kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
    kpiCard: { borderRadius: 12, padding: 14, alignItems: 'center' },
    kpiVal: { fontSize: 15, fontWeight: '700', marginBottom: 2, textAlign: 'center' },
    kpiLbl: { fontSize: 10, color: GRAY, textAlign: 'center' },

    prodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
    prodCard: { borderRadius: 12, padding: 14 },
    prodCardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 10 },
    prodIconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    prodCardLabel: { flex: 1, fontSize: 12, fontWeight: '600', lineHeight: 16 },
    prodCardSub: { fontSize: 10, color: GRAY, marginTop: 2 },
    prodCardVal: { fontSize: 28, fontWeight: '800' },
    prodCardUnit: { fontSize: 12, color: GRAY, fontWeight: '600' },

    chartTabs: { flexDirection: 'row', borderRadius: 10, padding: 3, marginBottom: 12 },
    chartTab: { flex: 1, paddingVertical: 7, alignItems: 'center', borderRadius: 8 },
    chartTabText: { fontSize: 12 },

    hBarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    rankNum: { width: 16, fontSize: 12, fontWeight: '700', textAlign: 'center' },
    hBarLabel: { width: 80, fontSize: 12 },
    hBarTrack: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
    hBarFill: { height: 8, borderRadius: 4 },
    hBarVal: { width: 30, fontSize: 11, textAlign: 'right' },

    quotaRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    quotaCard: { flex: 1, borderRadius: 12, padding: 14, borderWidth: 1 },
    quotaCardTitle: { fontSize: 12, fontWeight: '700', marginBottom: 12 },
    quotaValRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 12 },
    quotaBig: { fontSize: 36, fontWeight: '200', lineHeight: 40 },
    quotaSmall: { fontSize: 13, marginLeft: 2 },
    quotaTrack: { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 4 },
    quotaFill: { height: 8, borderRadius: 4 },
    quotaPct: { fontSize: 11, textAlign: 'right' },

    quickRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    quickCard: { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center', gap: 8, borderWidth: 1 },
    quickLabel: { fontSize: 10, textAlign: 'center' },
});