import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
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
import AppFooter from '../../components/AppFooter';
import AppHeader from '../../components/AppHeader';
import AjouterReclamation from './ajouter-reclamation';


const ETAT_MAP = {
    0: { label: 'En cours', color: '#D97706', bg: '#FEF3C7' },
    1: { label: 'Traitée',  color: '#059669', bg: '#D1FAE5' },
};

export default function ReclamationsScreen() {
    const [session,      setSession]      = useState(null);
    const [darkMode,     setDarkMode]     = useState(false);
    const [reclamations, setReclamations] = useState([]);
    const [loading,      setLoading]      = useState(true);
    const [saving,       setSaving]       = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [form,         setForm]         = useState({ sujet: '', message: '' });

    const T = darkMode ? DARK : LIGHT;

    const slideAnim = useRef(new Animated.Value(900)).current;

    useFocusEffect(
        useCallback(() => {
            loadDarkMode().then(setDarkMode);
            loadSession().then(s => {
                if (!s) { router.replace('/(auth)/login'); return; }
                setSession(s);
                fetchReclamations();
            });
        }, [])
    );

    const fetchReclamations = async () => {
        setLoading(true);
        try {
            const data = await api.get('/api/reclamations/list.php');
            if (data.success) setReclamations(Array.isArray(data.data) ? data.data : []);
        } catch (e) {
            console.error('Erreur chargement:', e.message);
        }
        finally { setLoading(false); }
    };

    const openModal = () => {
        setForm({ sujet: '', message: '' });
        setModalVisible(true);
        slideAnim.setValue(900);
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 60, friction: 11 }).start();
    };

    const closeModal = () => {
        Animated.timing(slideAnim, { toValue: 900, duration: 250, useNativeDriver: true }).start(() => setModalVisible(false));
    };

    const handleSave = async () => {
        if (!form.sujet.trim())   { Alert.alert('Champ requis', 'Le sujet est obligatoire.'); return; }
        if (!form.message.trim()) { Alert.alert('Champ requis', 'Le message est obligatoire.'); return; }
        setSaving(true);
        try {
            const data = await api.post('/api/reclamations/create.php', {
                sujet: form.sujet.trim(),
                message: form.message.trim(),
            });
            if (data.success) {
                closeModal();
                fetchReclamations();
                Alert.alert('Succès', 'Réclamation envoyée avec succès.');
            } else {
                Alert.alert('Erreur', data.message || 'Impossible de créer la réclamation.');
            }
        } catch (e) { Alert.alert('Erreur', e.message || 'Impossible de contacter le serveur.'); }
        finally { setSaving(false); }
    };

    if (!session) return <View style={[st.center, { backgroundColor: T.bg }]}><ActivityIndicator size="large" color={TEAL} /></View>;

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
                    <Text style={st.breadcrumbCurrent}>Réclamations</Text>
                </View>

                <Text style={[st.pageTitle, { color: T.text }]}>Réclamations</Text>

                <View style={[st.card, { backgroundColor: T.card }]}>
                    <View style={st.cardHeader}>
                        <Text style={[st.cardTitle, { color: T.text }]}>Mes réclamations</Text>
                        <TouchableOpacity style={st.addBtn} onPress={openModal} activeOpacity={0.85}>
                            <Text style={st.addBtnText}>+ Ajouter</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={[st.tableHead, { backgroundColor: T.searchBg, borderColor: T.border }]}>
                        <Text style={[st.th, { flex: 1, color: T.sub }]}>N°</Text>
                        <Text style={[st.th, { flex: 3, color: T.sub }]}>Sujet</Text>
                        <Text style={[st.th, { flex: 1.5, textAlign: 'center', color: T.sub }]}>État</Text>
                        <Text style={[st.th, { flex: 1, textAlign: 'center', color: T.sub }]}>Détail</Text>
                    </View>

                    {loading ? (
                        <View style={st.centerPad}><ActivityIndicator color={TEAL} /></View>
                    ) : reclamations.length === 0 ? (
                        <View style={st.emptyWrap}>
                            <Ionicons name="alert-circle-outline" size={40} color={T.sub} />
                            <Text style={[st.emptyText, { color: T.sub }]}>Aucune réclamation</Text>
                        </View>
                    ) : (
                        reclamations.map((r, i) => {
                            const etat = ETAT_MAP[r.etat] ?? ETAT_MAP[0];
                            return (
                                <View key={r.id} style={[st.row, { borderBottomColor: T.border }, i % 2 !== 0 && { backgroundColor: T.searchBg }]}>
                                    <Text style={[st.td, { flex: 1, fontSize: 12, color: T.sub }]}>#{r.id}</Text>
                                    <Text style={[st.tdText, { flex: 3, color: T.text }]} numberOfLines={2}>{r.sujet}</Text>
                                    <View style={{ flex: 1.5, alignItems: 'center' }}>
                                        <View style={[st.badge, { backgroundColor: etat.bg }]}>
                                            <Text style={[st.badgeTxt, { color: etat.color }]}>{etat.label}</Text>
                                        </View>
                                    </View>
                                    <View style={{ flex: 1, alignItems: 'center' }}>
                                        <TouchableOpacity
                                            style={[st.detailBtn, { backgroundColor: T.card, borderColor: T.border }]}
                                            onPress={() => router.push(`/(merchant)/reclamations/reclamation-detail?id=${r.id}`)}
                                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                        >
                                            <Ionicons name="eye-outline" size={16} color={TEAL} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            );
                        })
                    )}
                </View>
            </ScrollView>

            <AppFooter darkMode={darkMode} />

            <AjouterReclamation
                visible={modalVisible}
                slideAnim={slideAnim}
                form={form}
                setForm={setForm}
                saving={saving}
                onClose={closeModal}
                onSave={handleSave}
            />
        </SafeAreaView>
    );
}

const st = StyleSheet.create({
    safe:              { flex: 1, backgroundColor: LIGHT.bg },
    center:            { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: LIGHT.bg },
    scroll:            { flex: 1 },
    scrollContent:     { padding: 16, paddingBottom: 32 },
    breadcrumbRow:     { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
    breadcrumbBack:    { fontSize: 12, color: '#94a3b8' },
    breadcrumbCurrent: { fontSize: 12, color: TEAL, fontWeight: '600' },
    pageTitle:         { fontSize: 22, fontWeight: '800', color: '#1a2940', marginBottom: 16 },
    card:              { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
    cardHeader:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
    cardTitle:         { fontSize: 15, fontWeight: '800', color: '#1a2940', flex: 1 },
    addBtn:            { backgroundColor: TEAL, borderRadius: 30, paddingHorizontal: 18, paddingVertical: 10 },
    addBtnText:        { color: '#fff', fontWeight: '700', fontSize: 13 },
    tableHead:         { flexDirection: 'row', backgroundColor: '#f8fafc', paddingVertical: 10, paddingHorizontal: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#e8eef4' },
    th:                { fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.4 },
    row:               { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    rowAlt:            { backgroundColor: '#fafcff' },
    td:                { justifyContent: 'center' },
    tdText:            { fontSize: 13, color: '#1a2940', fontWeight: '500' },
    badge:             { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
    badgeTxt:          { fontSize: 11, fontWeight: '700' },
    detailBtn:         { width: 32, height: 32, borderRadius: 8, borderWidth: 1.5, borderColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
    centerPad:         { padding: 32, alignItems: 'center' },
    emptyWrap:         { padding: 40, alignItems: 'center', gap: 10 },
    emptyText:         { fontSize: 14, color: '#94a3b8' },
});