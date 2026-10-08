import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
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
const STATUTS = Object.entries(ORDER_STATUS).map(([etat, s]) => ({ etat: parseInt(etat), ...s }));

const getStatut = (etat) => STATUTS.find(s => s.etat === parseInt(etat)) || STATUTS[0];

const TRANSITIONS = {
    0: [1, 7],
    1: [2, 7],
    2: [5, 7],
    5: [],
    7: [],
};

export default function CommandeDetailScreen() {
    const { id } = useLocalSearchParams();

    const [session, setSession] = useState(null);
    const [darkMode, setDarkMode] = useState(false);
    const [loading, setLoading] = useState(true);
    const [commande, setCommande] = useState(null);
    const [articles, setArticles] = useState([]);
    const [historique, setHistorique] = useState([]);
    const [updating, setUpdating] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [targetEtat, setTargetEtat] = useState(null);
    const [factureId, setFactureId] = useState(null);

    const T = darkMode ? DARK : LIGHT;

    useEffect(() => {
        loadDarkMode().then(setDarkMode);
        loadSession().then(s => {
            if (!s?.token) { router.replace('/(auth)/login'); return; }
            setSession(s);
            fetchCommande();
            checkFacture();
        });
    }, [id]);

    const fetchCommande = async () => {
        setLoading(true);
        try {
            const data = await api.get(`/api/orders/orders-get.php?id=${id}`);
            if (data.success) {
                setCommande(data.data?.commande);
                setArticles(data.data?.articles || []);
                setHistorique(data.data?.historique || []);
            }
        } catch (_) { }
        finally { setLoading(false); }
    };

    const checkFacture = async () => {
        try {
            const data = await api.get(`/api/factures/get-by-commande.php?id_commande=${id}`);
            if (data.success && data.data?.id) setFactureId(data.data.id);
        } catch (_) {
            // Pas de facture existante pour cette commande.
        }
    };

    const handleGenerateFacture = () => {
        if (parseInt(commande.etat) === 7) return;
        if (factureId) {
            Alert.alert('Info', `Facture #${factureId} déjà générée.`);
            return;
        }
        router.push({
            pathname: '/(merchant)/facture/ajouter-facture',
            params: { fromCommande: id },
        });
    };


    const confirmStatusChange = (etat) => {
        setTargetEtat(etat);
        setShowModal(true);
    };

    const handleStatusChange = async () => {
        if (targetEtat === null || !session) return;
        setShowModal(false);
        setUpdating(true);
        try {
            const data = await api.put(`/api/orders/update-status.php?id=${id}`, { etat: targetEtat });
            if (data.success) {
                fetchCommande();
            } else {
                Alert.alert('Erreur', data.message || 'Impossible de mettre à jour le statut.');
            }
        } catch (_) {
            Alert.alert('Erreur', 'Impossible de contacter le serveur.');
        } finally {
            setUpdating(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]}>
                <View style={styles.center}><ActivityIndicator color={TEAL} size="large" /></View>
            </SafeAreaView>
        );
    }

    if (!commande) {
        return (
            <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]}>
                <View style={styles.center}>
                    <Text style={{ color: T.sub }}>Commande introuvable.</Text>
                </View>
            </SafeAreaView>
        );
    }

    const statut = getStatut(commande.etat);
    const transitions = TRANSITIONS[parseInt(commande.etat)] || [];
    const client = [commande.nom, commande.prenom].filter(Boolean).join(' ') || 'Client inconnu';
    const total = commande.prix ? `${parseFloat(commande.prix).toFixed(3)} TND` : '—';
    const date = commande.date_add ? new Date(commande.date_add).toLocaleDateString('fr-FR') : '—';
    const targetStatut = targetEtat !== null ? getStatut(targetEtat) : null;

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]}>
            <AppHeader
                session={session} darkMode={darkMode}
                onToggleDark={() => { const next = !darkMode; setDarkMode(next); saveDarkMode(next); }}
                onLogout={() => router.replace('/(auth)/login')}
            />

            <Modal visible={showModal} transparent animationType="fade" onRequestClose={() => setShowModal(false)}>
                <Pressable style={styles.overlay} onPress={() => setShowModal(false)}>
                    <View style={[styles.modalBox, { backgroundColor: T.card }]}>
                        <Text style={[styles.modalTitle, { color: T.text }]}>Confirmer le changement</Text>
                        <Text style={[styles.modalSub, { color: T.sub }]}>
                            Passer la commande en{' '}
                            <Text style={{ color: targetStatut?.color, fontWeight: '700' }}>
                                {targetStatut?.label}
                            </Text>
                            {' '}?
                        </Text>
                        <View style={styles.modalBtns}>
                            <TouchableOpacity
                                style={[styles.modalBtn, { backgroundColor: T.border }]}
                                onPress={() => setShowModal(false)}
                            >
                                <Text style={[styles.modalBtnTxt, { color: T.sub }]}>Annuler</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalBtn, { backgroundColor: targetStatut?.color || TEAL }]}
                                onPress={handleStatusChange}
                            >
                                <Text style={[styles.modalBtnTxt, { color: '#fff' }]}>Confirmer</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Pressable>
            </Modal>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={20} color={TEAL} />
                    <Text style={styles.backTxt}>Commandes</Text>
                </TouchableOpacity>

                <View style={[styles.section, { backgroundColor: T.card, borderColor: T.border }]}>
                    <View style={styles.sectionTop}>
                        <View>
                            <Text style={[styles.ref, { color: T.sub }]}>#{commande.code_barre || commande.id}</Text>
                            <Text style={[styles.clientName, { color: T.text }]}>{client}</Text>
                        </View>
                        <View style={[styles.badge, { backgroundColor: statut.bg }]}>
                            <Ionicons name={statut.icon} size={14} color={statut.color} />
                            <Text style={[styles.badgeTxt, { color: statut.color }]}>{statut.label}</Text>
                        </View>
                    </View>

                    <View style={[styles.divider, { backgroundColor: T.border }]} />

                    <View style={styles.infoGrid}>
                        <InfoRow icon="call-outline" label="Téléphone" value={commande.tel || '—'} T={T} />
                        <InfoRow icon="location-outline" label="Ville" value={commande.ville || '—'} T={T} />
                        <InfoRow icon="home-outline" label="Adresse" value={commande.adresse || '—'} T={T} />
                        <InfoRow icon="calendar-outline" label="Date" value={date} T={T} />
                        <InfoRow icon="cash-outline" label="Total" value={total} T={T} color={TEAL} />
                        {commande.msg ? <InfoRow icon="chatbubble-outline" label="Message" value={commande.msg} T={T} /> : null}
                    </View>
                </View>

                {transitions.length > 0 && (
                    <View style={[styles.section, { backgroundColor: T.card, borderColor: T.border }]}>
                        <Text style={[styles.sectionTitle, { color: T.text }]}>Changer le statut</Text>
                        {updating ? (
                            <ActivityIndicator color={TEAL} style={{ marginVertical: 12 }} />
                        ) : (
                            <View style={styles.actionsRow}>
                                {transitions.map(etat => {
                                    const s = getStatut(etat);
                                    return (
                                        <TouchableOpacity
                                            key={etat}
                                            style={[styles.actionBtn, { backgroundColor: s.bg, borderColor: s.color }]}
                                            onPress={() => confirmStatusChange(etat)}
                                        >
                                            <Ionicons name={s.icon} size={18} color={s.color} />
                                            <Text style={[styles.actionTxt, { color: s.color }]}>{s.label}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        )}
                    </View>
                )}

                {parseInt(commande.etat) !== 7 && (
                    <View style={[styles.section, { backgroundColor: T.card, borderColor: T.border }]}>
                        <Text style={[styles.sectionTitle, { color: T.text }]}>Facturation</Text>
                        {factureId ? (
                            <View style={[styles.actionBtn, { backgroundColor: T.border, borderColor: T.border, alignSelf: 'flex-start' }]}>
                                <Ionicons name="document-text-outline" size={18} color={T.sub} />
                                <Text style={[styles.actionTxt, { color: T.sub }]}>Facture #{factureId} déjà générée</Text>
                            </View>
                        ) : (
                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: '#E0F2FE', borderColor: TEAL, alignSelf: 'flex-start' }]}
                                onPress={handleGenerateFacture}
                            >
                                <Ionicons name="document-text-outline" size={18} color={TEAL} />
                                <Text style={[styles.actionTxt, { color: TEAL }]}>Générer facture</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {articles.length > 0 && (
                    <View style={[styles.section, { backgroundColor: T.card, borderColor: T.border }]}>
                        <Text style={[styles.sectionTitle, { color: T.text }]}>Articles ({articles.length})</Text>
                        {articles.map((a, i) => (
                            <View key={i} style={[styles.articleRow, { borderBottomColor: T.border }]}>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.articleNom, { color: T.text }]}>{a.produit_nom || 'Produit'}</Text>
                                    {a.variation_sku ? <Text style={[styles.articleSku, { color: T.sub }]}>{a.variation_sku}</Text> : null}
                                </View>
                                <Text style={[styles.articleQte, { color: T.sub }]}>x{a.qte}</Text>
                                <Text style={[styles.articlePrix, { color: TEAL }]}>{parseFloat(a.prix).toFixed(3)} TND</Text>
                            </View>
                        ))}
                        <View style={styles.totalRow}>
                            <Text style={[styles.totalLabel, { color: T.sub }]}>Total</Text>
                            <Text style={[styles.totalVal, { color: TEAL }]}>{total}</Text>
                        </View>
                    </View>
                )}

                {historique.length > 0 && (
                    <View style={[styles.section, { backgroundColor: T.card, borderColor: T.border }]}>
                        <Text style={[styles.sectionTitle, { color: T.text }]}>Historique</Text>
                        {historique.map((h, i) => {
                            const s = getStatut(h.etat);
                            const dt = h.date ? new Date(h.date).toLocaleString('fr-FR') : '—';
                            return (
                                <View key={i} style={styles.histRow}>
                                    <View style={[styles.histDot, { backgroundColor: s.color }]} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.histLabel, { color: T.text }]}>{h.motif || s.label}</Text>
                                        <Text style={[styles.histDate, { color: T.sub }]}>{dt}</Text>
                                    </View>
                                    <View style={[styles.badge, { backgroundColor: s.bg }]}>
                                        <Text style={[styles.badgeTxt, { color: s.color }]}>{s.label}</Text>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}

                <View style={{ height: 24 }} />
            </ScrollView>

            <AppFooter darkMode={darkMode} />
        </SafeAreaView>
    );
}

function InfoRow({ icon, label, value, T, color }) {
    return (
        <View style={styles.infoRow}>
            <Ionicons name={icon} size={15} color={T.sub} style={{ marginRight: 8 }} />
            <Text style={[styles.infoLabel, { color: T.sub }]}>{label}:</Text>
            <Text style={[styles.infoVal, { color: color || T.text }]} numberOfLines={2}>{value}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1 },
    scroll: { padding: 16 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
    backTxt: { color: TEAL, fontSize: 14, fontWeight: '600' },
    section: { borderRadius: 14, padding: 16, borderWidth: 1, marginBottom: 14 },
    sectionTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 12 },
    ref: { fontSize: 12, marginBottom: 2 },
    clientName: { fontSize: 16, fontWeight: '700' },
    badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
    badgeTxt: { fontSize: 12, fontWeight: '600' },
    divider: { height: 1, marginBottom: 12 },
    infoGrid: { gap: 8 },
    infoRow: { flexDirection: 'row', alignItems: 'center' },
    infoLabel: { fontSize: 12, width: 72 },
    infoVal: { fontSize: 13, fontWeight: '500', flex: 1 },
    actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5 },
    actionTxt: { fontSize: 13, fontWeight: '700' },
    articleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, gap: 8 },
    articleNom: { fontSize: 13, fontWeight: '600' },
    articleSku: { fontSize: 11, marginTop: 2 },
    articleQte: { fontSize: 13 },
    articlePrix: { fontSize: 13, fontWeight: '700', minWidth: 80, textAlign: 'right' },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
    totalLabel: { fontSize: 13, fontWeight: '600' },
    totalVal: { fontSize: 15, fontWeight: '800' },
    histRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
    histDot: { width: 10, height: 10, borderRadius: 5 },
    histLabel: { fontSize: 13, fontWeight: '500' },
    histDate: { fontSize: 11, marginTop: 2 },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
    modalBox: { width: '85%', borderRadius: 16, padding: 24 },
    modalTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
    modalSub: { fontSize: 14, marginBottom: 20 },
    modalBtns: { flexDirection: 'row', gap: 10 },
    modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
    modalBtnTxt: { fontSize: 14, fontWeight: '700' },
});
