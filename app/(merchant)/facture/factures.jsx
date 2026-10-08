import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_URL } from '../../../config';
import api from '../../../utils/api';
import { loadSession } from '../../../utils/auth';
import { loadDarkMode, saveDarkMode } from '../../../utils/darkMode';
import { DARK, LIGHT, TEAL } from '../../../utils/theme';
import AppFooter from '../../components/AppFooter';
import AppHeader from '../../components/AppHeader';

const BG = LIGHT.bg;

const money = v => (parseFloat(v) || 0).toFixed(3);

const TIMBRE_FISCAL = 1;
const DATE_TIMBRE_ACTIF = '2026-09-05';

const formatDate = d => {
    if (!d) return '—';
    const parts = String(d).slice(0, 10).split('-');
    if (parts.length !== 3) return String(d);
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

export default function FacturesScreen() {
    const [session,   setSession]   = useState(null);
    const [darkMode,  setDarkMode]  = useState(false);
    const [factures,  setFactures]  = useState([]);
    const [loading,   setLoading]   = useState(true);
    const [detail,    setDetail]    = useState(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [exportingId, setExportingId] = useState(null);

    const T = darkMode ? DARK : LIGHT;

    const slideAnim = useRef(new Animated.Value(900)).current;

    const lastFetchRef = useRef(0);
    const MIN_REFRESH_INTERVAL_MS = 3000;

    useFocusEffect(
        useCallback(() => {
            loadDarkMode().then(setDarkMode);
            loadSession().then(s => {
                if (!s) { router.replace('/(auth)/login'); return; }
                setSession(s);
                const now = Date.now();
                if (now - lastFetchRef.current < MIN_REFRESH_INTERVAL_MS) return;
                lastFetchRef.current = now;
                fetchFactures();
            });
        }, [])
    );

    const fetchFactures = async () => {
        setLoading(true);
        try {
            const data = await api.get('/api/factures/list.php');
            if (data.success) setFactures(Array.isArray(data.data) ? data.data : []);
            else Alert.alert('Erreur', data.message || 'Chargement impossible.');
        } catch (e) {
            console.error('Erreur chargement:', e.message);
        }
        finally { setLoading(false); }
    };

    const openDetail = async (id) => {
        setDetail(null);
        setDetailOpen(true);
        setDetailLoading(true);
        slideAnim.setValue(900);
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 60, friction: 11 }).start();
        try {
            const data = await api.get(`/api/factures/get.php?id=${id}`);
            if (data.success) setDetail(data.data);
            else Alert.alert('Erreur', data.message || 'Facture introuvable.');
        } catch { Alert.alert('Erreur', 'Impossible de contacter le serveur.'); }
        finally { setDetailLoading(false); }
    };

    const closeDetail = () => {
        Animated.timing(slideAnim, { toValue: 900, duration: 250, useNativeDriver: true })
            .start(() => { setDetailOpen(false); setDetail(null); });
    };

    const handleExport = async (facture) => {
        setExportingId(facture.id);
        try {
            const s = await loadSession();
            if (!s?.token) { router.replace('/(auth)/login'); return; }

            const fileName = `facture-${facture.num_facture}.pdf`;
            const cacheUri = FileSystem.cacheDirectory + fileName;

            const res = await FileSystem.downloadAsync(
                `${API_URL}/api/factures/export.php?id=${facture.id}`,
                cacheUri,
                { headers: { Authorization: `Bearer ${s.token}` } }
            );

            if (res.status !== 200) {
                Alert.alert('Erreur', 'Le serveur n\'a pas pu générer le PDF.');
                return;
            }

            const SAF = FileSystem.StorageAccessFramework;
            const permissions = await SAF.requestDirectoryPermissionsAsync();
            if (!permissions.granted) {
                Alert.alert('Annulé', 'Aucun dossier sélectionné.');
                return;
            }

            const destUri = await SAF.createFileAsync(permissions.directoryUri, fileName, 'application/pdf');
            const base64  = await FileSystem.readAsStringAsync(res.uri, { encoding: FileSystem.EncodingType.Base64 });
            await FileSystem.writeAsStringAsync(destUri, base64, { encoding: FileSystem.EncodingType.Base64 });

            Alert.alert('✓ Enregistré', `"${fileName}" a été sauvegardé dans le dossier choisi.`);
        } catch (e) {
            Alert.alert('Erreur', 'Impossible d\'exporter la facture : ' + e.message);
        } finally {
            setExportingId(null);
        }
    };

    if (!session) return <View style={[st.center, { backgroundColor: T.bg }]}><ActivityIndicator size="large" color={TEAL} /></View>;

    const totalGlobal = factures.reduce((sum, f) => sum + (parseFloat(f.total_ttc) || 0), 0);

    const timbreActif  = (detail?.facture?.created_at || '').slice(0, 10) >= DATE_TIMBRE_ACTIF;
    const timbreFiscal = timbreActif ? TIMBRE_FISCAL : 0;
    const totalTtcRaw  = parseFloat(detail?.facture?.total_ttc) || 0;
    const subTotalTtc  = totalTtcRaw - timbreFiscal;

    return (
        <SafeAreaView style={[st.safe, { backgroundColor: T.bg }]}>
            <AppHeader
                session={session} darkMode={darkMode}
                onToggleDark={() => { const next = !darkMode; setDarkMode(next); saveDarkMode(next); }}
                onLogout={() => router.replace('/(auth)/login')}
            />

            <ScrollView style={st.scroll} contentContainerStyle={st.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={st.breadcrumbRow}>
                    <Text style={[st.breadcrumbBack, { color: T.sub }]} onPress={() => router.push('/(merchant)/dashboard')}>Dashboard</Text>
                    <Ionicons name="chevron-forward" size={13} color={T.sub} />
                    <Text style={st.breadcrumbCurrent}>Factures</Text>
                </View>

                <Text style={[st.pageTitle, { color: T.text }]}>Factures</Text>

                <View style={st.statsRow}>
                    <View style={[st.statBox, { backgroundColor: T.card }]}>
                        <Text style={[st.statValue, { color: T.text }]}>{factures.length}</Text>
                        <Text style={[st.statLabel, { color: T.sub }]}>Factures</Text>
                    </View>
                    <View style={[st.statBox, { backgroundColor: T.card }]}>
                        <Text style={[st.statValue, { color: T.text }]}>{money(totalGlobal)}</Text>
                        <Text style={[st.statLabel, { color: T.sub }]}>Total TTC (TND)</Text>
                    </View>
                </View>

                <View style={[st.card, { backgroundColor: T.card }]}>
                    <View style={st.cardHeader}>
                        <Text style={[st.cardTitle, { color: T.text }]}>Mes factures</Text>
                        <TouchableOpacity
                            style={st.addBtn}
                            onPress={() => router.push('/(merchant)/facture/ajouter-facture')}
                            activeOpacity={0.85}
                        >
                            <Text style={st.addBtnText}>+ Ajouter</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={[st.tableHead, { backgroundColor: T.searchBg, borderColor: T.border }]}>
                        <Text style={[st.th, { flex: 2, color: T.sub }]}>N° / Client</Text>
                        <Text style={[st.th, { flex: 1.4, textAlign: 'center', color: T.sub }]}>Date</Text>
                        <Text style={[st.th, { flex: 1.6, textAlign: 'right', color: T.sub }]}>Total TTC</Text>
                        <Text style={[st.th, { flex: 1.4, textAlign: 'center', color: T.sub }]}>Actions</Text>
                    </View>

                    {loading ? (
                        <View style={st.centerPad}><ActivityIndicator color={TEAL} /></View>
                    ) : factures.length === 0 ? (
                        <View style={st.emptyWrap}>
                            <Ionicons name="document-text-outline" size={40} color={T.sub} />
                            <Text style={[st.emptyText, { color: T.sub }]}>Aucune facture</Text>
                        </View>
                    ) : (
                        factures.map((f, i) => (
                            <View key={f.id} style={[st.row, { borderBottomColor: T.border }, i % 2 !== 0 && { backgroundColor: T.searchBg }]}>
                                <View style={{ flex: 2 }}>
                                    <Text style={[st.numFacture, { color: T.text }]} numberOfLines={1}>{f.num_facture}</Text>
                                    <Text style={[st.clientName, { color: T.sub }]} numberOfLines={1}>
                                        {`${f.nom ?? ''} ${f.prenom ?? ''}`.trim() || 'Client inconnu'}
                                    </Text>
                                    {f.id_commande ? (
                                        <Text style={[st.commandeBadge, { color: TEAL }]} numberOfLines={1}>Depuis commande #{f.id_commande}</Text>
                                    ) : null}
                                </View>
                                <Text style={[st.tdSmall, { flex: 1.4, textAlign: 'center', color: T.sub }]}>{formatDate(f.date_facture)}</Text>
                                <Text style={[st.tdMoney, { flex: 1.6, textAlign: 'right', color: T.text }]}>{money(f.total_ttc)}</Text>
                                <View style={st.actionsCell}>
                                    <TouchableOpacity style={[st.iconBtn, { backgroundColor: T.card, borderColor: T.border }]} onPress={() => openDetail(f.id)} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                        <Ionicons name="eye-outline" size={16} color={TEAL} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[st.iconBtn, { backgroundColor: T.card, borderColor: T.border }]}
                                        onPress={() => handleExport(f)}
                                        disabled={exportingId === f.id}
                                        activeOpacity={0.7}
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    >
                                        {exportingId === f.id
                                            ? <ActivityIndicator size="small" color={TEAL} />
                                            : <Ionicons name="download-outline" size={16} color="#059669" />
                                        }
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))
                    )}
                </View>
            </ScrollView>

            <AppFooter darkMode={darkMode} />

            {detailOpen && (
                <>
                    <Pressable style={st.overlay} onPress={closeDetail} />
                    <Animated.View style={[st.sheet, { backgroundColor: T.card, transform: [{ translateY: slideAnim }] }]}>
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                            <View style={[st.handle, { backgroundColor: T.border }]} />

                            {detailLoading || !detail ? (
                                <View style={st.centerPad}><ActivityIndicator color={TEAL} /></View>
                            ) : (
                                <>
                                    <Text style={[st.sheetTitle, { color: T.text }]}>Facture {detail.facture?.num_facture}</Text>
                                    <Text style={[st.sheetSub, { color: T.sub }]}>{formatDate(detail.facture?.date_facture)}</Text>
                                    <View style={[st.divider, { backgroundColor: T.border }]} />

                                    <Text style={[st.sectionLabel, { color: T.sub }]}>Client</Text>
                                    <View style={[st.infoBlock, { backgroundColor: T.searchBg }]}>
                                        <Text style={[st.infoName, { color: T.text }]}>
                                            {`${detail.facture?.nom ?? ''} ${detail.facture?.prenom ?? ''}`.trim() || '—'}
                                        </Text>
                                        {detail.facture?.tel     ? <Text style={[st.infoLine, { color: T.sub }]}>Tél : {detail.facture.tel}</Text> : null}
                                        {detail.facture?.adresse ? <Text style={[st.infoLine, { color: T.sub }]}>{detail.facture.adresse}</Text> : null}
                                        {detail.facture?.mf      ? <Text style={[st.infoLine, { color: T.sub }]}>Matricule fiscale : {detail.facture.mf}</Text> : null}
                                    </View>

                                    <View style={[st.divider, { backgroundColor: T.border }]} />
                                    <Text style={[st.sectionLabel, { color: T.sub }]}>Produits</Text>

                                    {(detail.details ?? []).map(d => (
                                        <View key={d.id} style={[st.lineRow, { borderBottomColor: T.border }]}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={[st.lineName, { color: T.text }]} numberOfLines={2}>{d.produit_nom || '—'}</Text>
                                                <Text style={[st.lineSub, { color: T.sub }]}>{d.quantite} × {money(d.prix_unitaire)} TND</Text>
                                            </View>
                                            <Text style={[st.lineTotal, { color: T.text }]}>{money(d.total)} TND</Text>
                                        </View>
                                    ))}

                                    <View style={[st.divider, { backgroundColor: T.border }]} />

                                    <View style={st.totalRow}>
                                        <Text style={[st.totalLabel, { color: T.sub }]}>Total HT</Text>
                                        <Text style={[st.totalValue, { color: T.text }]}>{money(detail.facture?.total_ht)} TND</Text>
                                    </View>
                                    <View style={st.totalRow}>
                                        <Text style={[st.totalLabel, { color: T.sub }]}>TVA ({detail.facture?.taux_taxe ?? 0}%)</Text>
                                        <Text style={[st.totalValue, { color: T.text }]}>
                                            {money(subTotalTtc - (parseFloat(detail.facture?.total_ht) || 0))} TND
                                        </Text>
                                    </View>
                                    <View style={[st.totalRow, st.totalRowMain, { borderTopColor: T.border }]}>
                                        <Text style={[st.totalLabelMain, { color: T.text }]}>Total TTC</Text>
                                        <Text style={st.totalValueMain}>{money(subTotalTtc)} TND</Text>
                                    </View>
                                    {timbreActif && (
                                        <>
                                            <View style={st.totalRow}>
                                                <Text style={[st.totalLabel, { color: T.sub }]}>Timbre fiscal</Text>
                                                <Text style={[st.totalValue, { color: T.text }]}>{money(timbreFiscal)} TND</Text>
                                            </View>
                                            <View style={[st.totalRow, st.totalRowMain, { borderTopColor: T.border }]}>
                                                <Text style={[st.totalLabelMain, { color: T.text }]}>Total à payer</Text>
                                                <Text style={st.totalValueMain}>{money(totalTtcRaw)} TND</Text>
                                            </View>
                                        </>
                                    )}

                                    <View style={[st.divider, { backgroundColor: T.border }]} />
                                    <View style={st.btnRow}>
                                        <TouchableOpacity
                                            style={st.saveBtn}
                                            onPress={() => handleExport(detail.facture)}
                                            disabled={exportingId === detail.facture?.id}
                                            activeOpacity={0.85}
                                        >
                                            {exportingId === detail.facture?.id
                                                ? <ActivityIndicator color="#fff" />
                                                : <Text style={st.saveTxt}>Exporter en PDF</Text>
                                            }
                                        </TouchableOpacity>
                                        <TouchableOpacity style={[st.cancelBtn, { backgroundColor: T.searchBg }]} onPress={closeDetail} activeOpacity={0.85}>
                                            <Text style={[st.cancelTxt, { color: T.sub }]}>Fermer</Text>
                                        </TouchableOpacity>
                                    </View>
                                </>
                            )}
                        </ScrollView>
                    </Animated.View>
                </>
            )}
        </SafeAreaView>
    );
}

const st = StyleSheet.create({
    safe:              { flex: 1, backgroundColor: BG },
    center:            { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG },
    scroll:            { flex: 1 },
    scrollContent:     { padding: 16, paddingBottom: 32 },
    breadcrumbRow:     { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
    breadcrumbBack:    { fontSize: 12, color: '#94a3b8' },
    breadcrumbCurrent: { fontSize: 12, color: TEAL, fontWeight: '600' },
    pageTitle:         { fontSize: 22, fontWeight: '800', color: '#1a2940', marginBottom: 16 },

    statsRow:          { flexDirection: 'row', gap: 12, marginBottom: 16 },
    statBox:           { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
    statValue:         { fontSize: 19, fontWeight: '800', color: '#1a2940' },
    statLabel:         { fontSize: 11, color: '#94a3b8', marginTop: 2, fontWeight: '600' },

    card:              { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
    cardHeader:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
    cardTitle:         { fontSize: 15, fontWeight: '800', color: '#1a2940', flex: 1 },
    addBtn:            { backgroundColor: TEAL, borderRadius: 30, paddingHorizontal: 18, paddingVertical: 10 },
    addBtnText:        { color: '#fff', fontWeight: '700', fontSize: 13 },
    tableHead:         { flexDirection: 'row', backgroundColor: '#f8fafc', paddingVertical: 10, paddingHorizontal: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#e8eef4' },
    th:                { fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.4 },
    row:               { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    rowAlt:            { backgroundColor: '#fafcff' },
    numFacture:        { fontSize: 13, color: '#1a2940', fontWeight: '700' },
    clientName:        { fontSize: 11, color: '#94a3b8', marginTop: 2 },
    commandeBadge:     { fontSize: 10, fontWeight: '700', marginTop: 2 },
    tdSmall:           { fontSize: 12, color: '#64748b' },
    tdMoney:           { fontSize: 13, color: '#1a2940', fontWeight: '700' },
    actionsCell:       { flex: 1.4, flexDirection: 'row', justifyContent: 'center', gap: 6 },
    iconBtn:           { width: 32, height: 32, borderRadius: 8, borderWidth: 1.5, borderColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
    centerPad:         { padding: 32, alignItems: 'center' },
    emptyWrap:         { padding: 40, alignItems: 'center', gap: 10 },
    emptyText:         { fontSize: 14, color: '#94a3b8' },

    overlay:           { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 20 },
    sheet:             { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', zIndex: 21, paddingHorizontal: 20, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 20 },
    handle:            { width: 40, height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 16 },
    sheetTitle:        { fontSize: 20, fontWeight: '800', color: '#1a2940' },
    sheetSub:          { fontSize: 13, color: '#94a3b8', marginTop: 2 },
    divider:           { height: 1, backgroundColor: '#f1f5f9', marginVertical: 16 },
    sectionLabel:      { fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 },
    infoBlock:         { backgroundColor: '#f8fafc', borderRadius: 12, padding: 14, gap: 3 },
    infoName:          { fontSize: 14, fontWeight: '700', color: '#1a2940' },
    infoLine:          { fontSize: 12, color: '#64748b' },
    lineRow:           { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 10 },
    lineName:          { fontSize: 13, color: '#1a2940', fontWeight: '600' },
    lineSub:           { fontSize: 11, color: '#94a3b8', marginTop: 2 },
    lineTotal:         { fontSize: 13, color: '#1a2940', fontWeight: '700' },
    totalRow:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 },
    totalLabel:        { fontSize: 13, color: '#64748b' },
    totalValue:        { fontSize: 13, color: '#1a2940', fontWeight: '600' },
    totalRowMain:      { marginTop: 6, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#e8eef4' },
    totalLabelMain:    { fontSize: 15, color: '#1a2940', fontWeight: '800' },
    totalValueMain:    { fontSize: 16, color: TEAL, fontWeight: '800' },
    btnRow:            { flexDirection: 'row', gap: 12 },
    saveBtn:           { flex: 1, backgroundColor: TEAL, borderRadius: 30, height: 50, justifyContent: 'center', alignItems: 'center' },
    saveTxt:           { color: '#fff', fontWeight: '700', fontSize: 15 },
    cancelBtn:         { flex: 1, backgroundColor: '#f1f5f9', borderRadius: 30, height: 50, justifyContent: 'center', alignItems: 'center' },
    cancelTxt:         { color: '#475569', fontWeight: '600', fontSize: 15 },
});
