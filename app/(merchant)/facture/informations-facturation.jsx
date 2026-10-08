import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
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

const BG = LIGHT.bg;

export default function InformationsFacturationScreen() {
    const [session,  setSession]  = useState(null);
    const [darkMode, setDarkMode] = useState(false);
    const [loading,  setLoading]  = useState(true);
    const [saving,   setSaving]   = useState(false);

    const [form, setForm] = useState({
        libelle: '', adresse: '', mf: '', tel: '',
    });

    const T = darkMode ? DARK : LIGHT;

    useFocusEffect(
        useCallback(() => {
            loadDarkMode().then(setDarkMode);
            loadSession().then(s => {
                if (!s) { router.replace('/(auth)/login'); return; }
                setSession(s);
                fetchInfo();
            });
        }, [])
    );

    const fetchInfo = async () => {
        setLoading(true);
        try {
            const data = await api.get('/api/factures/info-get.php');
            if (data.success && data.data) {
                setForm({
                    libelle: data.data.libelle ?? '',
                    adresse: data.data.adresse ?? '',
                    mf:      data.data.mf      ?? '',
                    tel:     data.data.tel     ?? '',
                });
            }
        } catch {}
        finally { setLoading(false); }
    };

    const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const handleSave = async () => {
        if (!form.libelle.trim()) { Alert.alert('Champ requis', 'Le nom de la société est obligatoire.'); return; }
        if (!form.adresse.trim()) { Alert.alert('Champ requis', 'L\'adresse est obligatoire.'); return; }
        if (!form.mf.trim())      { Alert.alert('Champ requis', 'La matricule fiscale est obligatoire.'); return; }
        if (!form.tel.trim())     { Alert.alert('Champ requis', 'Le numéro de téléphone est obligatoire.'); return; }

        setSaving(true);
        try {
            const data = await api.put('/api/factures/info-update.php', {
                libelle: form.libelle.trim(),
                adresse: form.adresse.trim(),
                mf:      form.mf.trim(),
                tel:     form.tel.trim(),
            });
            if (data.success) Alert.alert('✓ Enregistré', 'Informations de facturation mises à jour.');
            else Alert.alert('Erreur', data.message || 'Mise à jour impossible.');
        } catch (e) {
            Alert.alert('Erreur', e.message || 'Impossible de contacter le serveur.');
        } finally {
            setSaving(false);
        }
    };

    if (!session) return <View style={[st.center, { backgroundColor: T.bg }]}><ActivityIndicator size="large" color={TEAL} /></View>;

    const isCommercant = session?.user?.role === 'commercant' || session?.role === 'commercant';

    return (
        <SafeAreaView style={[st.safe, { backgroundColor: T.bg }]}>
            <AppHeader
                session={session} darkMode={darkMode}
                onToggleDark={() => { const n = !darkMode; setDarkMode(n); saveDarkMode(n); }}
                onLogout={() => router.replace('/(auth)/login')}
            />

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 80}
            >
                <ScrollView style={st.scroll} contentContainerStyle={st.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                    <View style={st.breadcrumbRow}>
                        <Text style={[st.breadcrumbBack, { color: T.sub }]} onPress={() => router.push('/(merchant)/dashboard')}>Dashboard</Text>
                        <Ionicons name="chevron-forward" size={13} color={T.sub} />
                        <Text style={st.breadcrumbCurrent}>Informations de facturation</Text>
                    </View>

                    <Text style={[st.pageTitle, { color: T.text }]}>Informations de facturation</Text>
                    <Text style={[st.pageSub, { color: T.sub }]}>Ces informations figureront sur toutes les factures que vous exportez.</Text>

                    {loading ? (
                        <View style={st.centerPad}><ActivityIndicator color={TEAL} /></View>
                    ) : (
                        <View style={[st.card, { backgroundColor: T.card }]}>
                            <View style={st.cardHeader}>
                                <View style={st.iconWrap}>
                                    <Ionicons name="business-outline" size={20} color={TEAL} />
                                </View>
                                <Text style={[st.cardTitle, { color: T.text }]}>Société</Text>
                            </View>
                            <View style={[st.divider, { backgroundColor: T.border }]} />

                            <Text style={[st.label, { color: T.sub }]}>Nom de la société <Text style={st.req}>*</Text></Text>
                            <TextInput style={[st.input, { backgroundColor: T.searchBg, borderColor: T.border, color: T.text, opacity: isCommercant ? 1 : 0.6 }]} placeholder="Ex: Ma Boutique SARL" placeholderTextColor={T.sub}
                                editable={isCommercant}
                                value={form.libelle} onChangeText={v => setField('libelle', v)} />

                            <Text style={[st.label, { color: T.sub }]}>Adresse <Text style={st.req}>*</Text></Text>
                            <TextInput style={[st.input, st.textarea, { backgroundColor: T.searchBg, borderColor: T.border, color: T.text, opacity: isCommercant ? 1 : 0.6 }]} placeholder="Adresse complète" placeholderTextColor={T.sub}
                                multiline textAlignVertical="top"
                                editable={isCommercant}
                                value={form.adresse} onChangeText={v => setField('adresse', v)} />

                            <Text style={[st.label, { color: T.sub }]}>Numéro de téléphone <Text style={st.req}>*</Text></Text>
                            <TextInput style={[st.input, { backgroundColor: T.searchBg, borderColor: T.border, color: T.text, opacity: isCommercant ? 1 : 0.6 }]} placeholder="Ex: 71234567" placeholderTextColor={T.sub}
                                keyboardType="phone-pad"
                                editable={isCommercant}
                                value={form.tel} onChangeText={v => setField('tel', v)} />

                            <Text style={[st.label, { color: T.sub }]}>Matricule fiscale <Text style={st.req}>*</Text></Text>
                            <TextInput style={[st.input, { backgroundColor: T.searchBg, borderColor: T.border, color: T.text, opacity: isCommercant ? 1 : 0.6 }]} placeholder="Ex: 1234567/A/M/000" placeholderTextColor={T.sub}
                                editable={isCommercant}
                                value={form.mf} onChangeText={v => setField('mf', v)} />

                            <View style={[st.divider, { backgroundColor: T.border }]} />

                            {isCommercant && (
                                <TouchableOpacity style={st.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
                                    {saving
                                        ? <ActivityIndicator color="#fff" />
                                        : <Text style={st.saveTxt}>Mettre à jour</Text>
                                    }
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>

            <AppFooter darkMode={darkMode} />
        </SafeAreaView>
    );
}

const st = StyleSheet.create({
    safe:              { flex: 1, backgroundColor: BG },
    center:            { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG },
    scroll:            { flex: 1 },
    scrollContent:     { padding: 16, paddingBottom: 40 },
    breadcrumbRow:     { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
    breadcrumbBack:    { fontSize: 12, color: '#94a3b8' },
    breadcrumbCurrent: { fontSize: 12, color: TEAL, fontWeight: '600' },
    pageTitle:         { fontSize: 22, fontWeight: '800', color: '#1a2940', marginBottom: 4 },
    pageSub:           { fontSize: 13, color: '#94a3b8', marginBottom: 16 },

    card:              { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
    cardHeader:        { flexDirection: 'row', alignItems: 'center', gap: 10 },
    iconWrap:          { width: 36, height: 36, borderRadius: 10, backgroundColor: '#E8F8FC', justifyContent: 'center', alignItems: 'center' },
    cardTitle:         { fontSize: 15, fontWeight: '800', color: '#1a2940' },
    divider:           { height: 1, backgroundColor: '#f1f5f9', marginVertical: 14 },
    label:             { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 },
    req:               { color: '#e53e3e' },
    input:             { backgroundColor: '#f8fafc', borderRadius: 12, height: 48, paddingHorizontal: 14, fontSize: 14, color: '#1a2940', borderWidth: 1.5, borderColor: '#e2e8f0', marginBottom: 14 },
    textarea:          { height: 90, paddingTop: 14 },
    saveBtn:           { backgroundColor: TEAL, borderRadius: 30, height: 50, justifyContent: 'center', alignItems: 'center' },
    saveTxt:           { color: '#fff', fontWeight: '700', fontSize: 15 },
    centerPad:         { padding: 40, alignItems: 'center' },
});
