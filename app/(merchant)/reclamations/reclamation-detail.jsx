import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
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
import AppFooter from '../../components/AppFooter';
import AppHeader from '../../components/AppHeader';

import { DARK, LIGHT, TEAL } from '../../../utils/theme';


const ETAT_MAP = {
    0: { label: 'En cours', color: '#D97706', bg: '#FEF3C7', icon: 'time-outline' },
    1: { label: 'Traitée', color: '#059669', bg: '#D1FAE5', icon: 'checkmark-circle-outline' },
};

export default function ReclamationDetailScreen() {
    const { id } = useLocalSearchParams();

    const [session, setSession] = useState(null);
    const [darkMode, setDarkMode] = useState(false);
    const [loading, setLoading] = useState(true);
    const [reclamation, setReclamation] = useState(null);

    const T = darkMode ? DARK : LIGHT;

    useEffect(() => {
        loadDarkMode().then(setDarkMode);
        loadSession().then(s => {
            if (!s) { router.replace('/(auth)/login'); return; }
            setSession(s);
            fetchReclamation();
        });
    }, [id]);

    const fetchReclamation = async () => {
        setLoading(true);
        try {
            const data = await api.get(`/api/reclamations/get.php?id=${id}`);
            if (data.success) setReclamation(data.data);
        } catch { }
        finally { setLoading(false); }
    };

    if (!session || loading) {
        return (
            <SafeAreaView style={[st.safe, { backgroundColor: T.bg }]}>
                <View style={st.center}><ActivityIndicator size="large" color={TEAL} /></View>
            </SafeAreaView>
        );
    }

    if (!reclamation) {
        return (
            <SafeAreaView style={[st.safe, { backgroundColor: T.bg }]}>
                <View style={st.center}>
                    <Text style={{ color: T.sub }}>Réclamation introuvable.</Text>
                </View>
            </SafeAreaView>
        );
    }

    const etat = ETAT_MAP[reclamation.etat] ?? ETAT_MAP[0];
    const dateAdd = reclamation.date_add ? new Date(reclamation.date_add).toLocaleString('fr-FR') : '—';
    const dateTrait = reclamation.date_traitement ? new Date(reclamation.date_traitement).toLocaleString('fr-FR') : null;

    return (
        <SafeAreaView style={[st.safe, { backgroundColor: T.bg }]}>
            <AppHeader
                session={session} darkMode={darkMode}
                onToggleDark={() => { const next = !darkMode; setDarkMode(next); saveDarkMode(next); }}
                onLogout={() => router.replace('/(auth)/login')}
            />

            <ScrollView style={st.scroll} contentContainerStyle={st.scrollContent} showsVerticalScrollIndicator={false}>
                <TouchableOpacity style={st.backBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={20} color={TEAL} />
                    <Text style={st.backTxt}>Réclamations</Text>
                </TouchableOpacity>

                <Text style={[st.pageTitle, { color: T.text }]}>Détail réclamation</Text>

                <View style={[st.card, { backgroundColor: T.card }]}>
                    <View style={st.cardTop}>
                        <View style={{ flex: 1 }}>
                            <Text style={[st.ref, { color: T.sub }]}>#{reclamation.id}</Text>
                            <Text style={[st.sujet, { color: T.text }]}>{reclamation.sujet}</Text>
                        </View>
                        <View style={[st.badge, { backgroundColor: etat.bg }]}>
                            <Ionicons name={etat.icon} size={13} color={etat.color} />
                            <Text style={[st.badgeTxt, { color: etat.color }]}>{etat.label}</Text>
                        </View>
                    </View>

                    <View style={[st.divider, { backgroundColor: T.border }]} />

                    <Text style={[st.sectionLabel, { color: T.sub }]}>Message</Text>
                    <View style={[st.messageBox, { backgroundColor: T.searchBg, borderColor: T.border }]}>
                        <Text style={[st.messageText, { color: T.text }]}>{reclamation.commentaire || '—'}</Text>
                    </View>

                    <View style={[st.divider, { backgroundColor: T.border }]} />

                    <View style={st.infoRow}>
                        <Ionicons name="calendar-outline" size={15} color={T.sub} style={{ marginRight: 8 }} />
                        <Text style={[st.infoLabel, { color: T.sub }]}>Soumise le :</Text>
                        <Text style={[st.infoVal, { color: T.text }]}>{dateAdd}</Text>
                    </View>

                    {dateTrait && (
                        <View style={st.infoRow}>
                            <Ionicons name="checkmark-circle-outline" size={15} color="#059669" style={{ marginRight: 8 }} />
                            <Text style={[st.infoLabel, { color: T.sub }]}>Traitée le :</Text>
                            <Text style={[st.infoVal, { color: '#059669' }]}>{dateTrait}</Text>
                        </View>
                    )}
                </View>

                {reclamation.etat === 0 && (
                    <View style={st.infoCard}>
                        <Ionicons name="information-circle-outline" size={20} color={TEAL} />
                        <Text style={st.infoCardText}>
                            Votre réclamation est en cours de traitement. Nous vous répondrons dans les plus brefs délais.
                        </Text>
                    </View>
                )}
            </ScrollView>

            <AppFooter darkMode={darkMode} />
        </SafeAreaView>
    );
}

const st = StyleSheet.create({
    safe: { flex: 1, backgroundColor: LIGHT.bg },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scroll: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 32 },
    backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
    backTxt: { color: TEAL, fontSize: 14, fontWeight: '600' },
    pageTitle: { fontSize: 22, fontWeight: '800', color: '#1a2940', marginBottom: 16 },
    card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3, marginBottom: 14 },
    cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
    ref: { fontSize: 12, color: '#94a3b8', marginBottom: 4 },
    sujet: { fontSize: 18, fontWeight: '800', color: '#1a2940', flex: 1 },
    badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
    badgeTxt: { fontSize: 12, fontWeight: '700' },
    divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 16 },
    sectionLabel: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.4 },
    messageBox: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 14, borderWidth: 1.5, borderColor: '#e2e8f0' },
    messageText: { fontSize: 14, color: '#334155', lineHeight: 22 },
    infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    infoLabel: { fontSize: 13, color: '#94a3b8', width: 90 },
    infoVal: { fontSize: 13, color: '#1a2940', fontWeight: '500', flex: 1 },
    infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#E8F8FC', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#29B6D8' },
    infoCardText: { flex: 1, fontSize: 13, color: '#1A2940', lineHeight: 20 },
});