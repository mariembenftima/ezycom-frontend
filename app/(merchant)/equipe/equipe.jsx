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
import { DARK, DARK_BG, LIGHT, TEAL } from '../../../utils/theme';
import AppFooter from '../../components/AppFooter';
import AppHeader from '../../components/AppHeader';
import AjouterMembre from './ajouter-membre';

const EMPTY_FORM = { nom: '', prenom: '', email: '', password: '', etat: 1 };

export default function EquipeScreen() {
    const [session,      setSession]      = useState(null);
    const [darkMode,     setDarkMode]     = useState(false);
    const [membres,      setMembres]      = useState([]);
    const [loading,      setLoading]      = useState(true);
    const [saving,       setSaving]       = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [isEdit,       setIsEdit]       = useState(false);
    const [editId,       setEditId]       = useState(null);
    const [form,         setForm]         = useState(EMPTY_FORM);
    const [packLimit,    setPackLimit]    = useState(null);

    const slideAnim = useRef(new Animated.Value(900)).current;

    useFocusEffect(
        useCallback(() => {
            loadDarkMode().then(setDarkMode);
            loadSession().then(s => {
                if (!s) { router.replace('/(auth)/login'); return; }
                setSession(s);
                fetchMembres();
            });
        }, [])
    );

    const fetchMembres = async () => {
        setLoading(true);
        try {
            const data = await api.get('/api/equipe/list.php');
            if (data.success) {
                setMembres(Array.isArray(data.data) ? data.data : []);
                if (data.data?.pack_limit !== undefined) setPackLimit(data.data.pack_limit);
            }
        } catch (e) {
            console.error('Erreur chargement:', e.message);
        }
        finally { setLoading(false); }
    };

    const openAdd = () => {
        setIsEdit(false);
        setEditId(null);
        setForm(EMPTY_FORM);
        showModal();
    };

    const openEdit = (membre) => {
        setIsEdit(true);
        setEditId(membre.id);
        setForm({ nom: membre.nom || '', prenom: membre.prenom || '', email: membre.email || '', password: '', etat: membre.etat ?? 1 });
        showModal();
    };

    const showModal = () => {
        setModalVisible(true);
        slideAnim.setValue(900);
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 60, friction: 11 }).start();
    };

    const closeModal = () => {
        Animated.timing(slideAnim, { toValue: 900, duration: 250, useNativeDriver: true }).start(() => setModalVisible(false));
    };

    const handleSave = async () => {
        if (!form.nom.trim())    { Alert.alert('Champ requis', 'Le nom est obligatoire.'); return; }
        if (!form.prenom.trim()) { Alert.alert('Champ requis', 'Le prénom est obligatoire.'); return; }
        if (!form.email.trim())  { Alert.alert('Champ requis', "L'email est obligatoire."); return; }
        if (!isEdit && !form.password.trim()) { Alert.alert('Champ requis', 'Le mot de passe est obligatoire.'); return; }

        setSaving(true);
        try {
            const body = { nom: form.nom.trim(), prenom: form.prenom.trim(), email: form.email.trim(), etat: form.etat };
            if (!isEdit || form.password.trim()) body.password = form.password.trim();

            const data = isEdit
                ? await api.put(`/api/equipe/update.php?id=${editId}`, body)
                : await api.post('/api/equipe/create.php', body);

            if (data.success) { closeModal(); fetchMembres(); }
            else Alert.alert('Erreur', data.message);
        } catch (e) { Alert.alert('Erreur', e.message || 'Impossible de contacter le serveur.'); }
        finally { setSaving(false); }
    };

    const handleDelete = (membre) => {
        Alert.alert(
            'Supprimer',
            `Supprimer "${membre.prenom} ${membre.nom}" de l'équipe ?`,
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Supprimer', style: 'destructive',
                    onPress: async () => {
                        try {
                            const data = await api.delete(`/api/equipe/delete.php?id=${membre.id}`);
                            if (data.success) fetchMembres();
                            else Alert.alert('Erreur', data.message);
                        } catch (e) { Alert.alert('Erreur', e.message || 'Impossible de contacter le serveur.'); }
                    },
                },
            ]
        );
    };

    if (!session) return <View style={st.center}><ActivityIndicator size="large" color={TEAL} /></View>;

    const T = darkMode ? DARK : LIGHT;
    const isCommercant = session?.user?.role === 'commercant' || session?.role === 'commercant';

    return (
        <SafeAreaView style={[st.safe, { backgroundColor: T.bg }]}>
            <AppHeader
                session={session} darkMode={darkMode}
                onToggleDark={() => { const next = !darkMode; setDarkMode(next); saveDarkMode(next); }}
                onLogout={() => router.replace('/(auth)/login')}
            />

            <ScrollView style={st.scroll} contentContainerStyle={st.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={st.breadcrumbRow}>
                    <Text style={st.breadcrumbBack} onPress={() => router.push('/(merchant)/dashboard')}>Dashboard</Text>
                    <Ionicons name="chevron-forward" size={13} color="#94a3b8" />
                    <Text style={st.breadcrumbCurrent}>Équipe</Text>
                </View>

                <Text style={[st.pageTitle, { color: T.text }]}>Mon équipe</Text>

                <View style={[st.card, { backgroundColor: T.card }]}>
                    <View style={st.cardHeader}>
                        <View>
                            <Text style={[st.cardTitle, { color: T.text }]}>Membres</Text>
                            {packLimit !== null && (
                                <Text style={st.packInfo}>{membres.length} / {packLimit} membres utilisés</Text>
                            )}
                        </View>
                        {isCommercant && (
                            <TouchableOpacity style={st.addBtn} onPress={openAdd} activeOpacity={0.85}>
                                <Text style={st.addBtnText}>+ Ajouter</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {loading ? (
                        <View style={st.centerPad}><ActivityIndicator color={TEAL} /></View>
                    ) : membres.length === 0 ? (
                        <View style={st.emptyWrap}>
                            <Ionicons name="people-outline" size={40} color="#c8d4e0" />
                            <Text style={st.emptyText}>Aucun membre dans l'équipe</Text>
                        </View>
                    ) : (
                        <View style={st.membersList}>
                            {membres.map((m, i) => (
                                <View key={m.id} style={[st.memberCard, i < membres.length - 1 && st.memberCardBorder]}>
                                    <View style={st.memberTop}>
                                        <View style={st.avatarCircle}>
                                            <Text style={st.avatarTxt}>{(m.prenom?.[0] || '?').toUpperCase()}</Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <View style={st.memberNameRow}>
                                                <Text style={[st.memberName, { color: T.text }]}>{m.prenom} {m.nom}</Text>
                                                <View style={[st.badge, m.etat === 1 ? st.badgeOn : st.badgeOff]}>
                                                    <Text style={[st.badgeTxt, m.etat === 1 ? st.badgeOnTxt : st.badgeOffTxt]}>
                                                        {m.etat === 1 ? 'Actif' : 'Inactif'}
                                                    </Text>
                                                </View>
                                            </View>
                                            <Text style={st.emailTxt} numberOfLines={1}>{m.email}</Text>
                                            <Text style={st.memberDate}>{m.date_add ? new Date(m.date_add).toLocaleDateString('fr-FR') : '—'}</Text>
                                        </View>
                                    </View>
                                    {isCommercant && (
                                        <View style={st.memberActions}>
                                            <TouchableOpacity style={st.actionBtn} onPress={() => openEdit(m)}>
                                                <Ionicons name="pencil-outline" size={14} color="#64748b" />
                                                <Text style={st.actionBtnTxt}>Modifier</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity style={[st.actionBtn, st.actionBtnRed]} onPress={() => handleDelete(m)}>
                                                <Ionicons name="trash-outline" size={14} color="#e53e3e" />
                                                <Text style={[st.actionBtnTxt, { color: '#e53e3e' }]}>Supprimer</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            </ScrollView>

            <AppFooter />

            <AjouterMembre
                visible={modalVisible}
                slideAnim={slideAnim}
                form={form}
                setForm={setForm}
                saving={saving}
                onClose={closeModal}
                onSave={handleSave}
                isEdit={isEdit}
            />
        </SafeAreaView>
    );
}

const st = StyleSheet.create({
    safe:              { flex: 1, backgroundColor: DARK_BG },
    center:            { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: DARK_BG },
    scroll:            { flex: 1 },
    scrollContent:     { padding: 16, paddingBottom: 32 },
    breadcrumbRow:     { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
    breadcrumbBack:    { fontSize: 12, color: '#94a3b8' },
    breadcrumbCurrent: { fontSize: 12, color: TEAL, fontWeight: '600' },
    pageTitle:         { fontSize: 22, fontWeight: '800', color: '#1a2940', marginBottom: 16 },
    card:              { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
    cardHeader:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
    cardTitle:         { fontSize: 15, fontWeight: '800', color: '#1a2940' },
    packInfo:          { fontSize: 11, color: '#94a3b8', marginTop: 2 },
    addBtn:            { backgroundColor: TEAL, borderRadius: 30, paddingHorizontal: 18, paddingVertical: 10 },
    addBtnText:        { color: '#fff', fontWeight: '700', fontSize: 13 },
    membersList:       { padding: 12, gap: 0 },
    memberCard:        { paddingVertical: 14, paddingHorizontal: 4 },
    memberCardBorder:  { borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    memberTop:         { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
    memberNameRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 },
    avatarCircle:      { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E8F8FC', justifyContent: 'center', alignItems: 'center' },
    avatarTxt:         { fontSize: 16, fontWeight: '800', color: TEAL },
    memberName:        { fontSize: 14, fontWeight: '700', color: '#1a2940', flex: 1, marginRight: 8 },
    memberDate:        { fontSize: 11, color: '#94a3b8', marginTop: 2 },
    emailTxt:          { fontSize: 12, color: '#64748b' },
    memberActions:     { flexDirection: 'row', gap: 10, marginLeft: 56 },
    actionBtn:         { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc' },
    actionBtnRed:      { borderColor: '#fee2e2', backgroundColor: '#fff5f5' },
    actionBtnTxt:      { fontSize: 12, fontWeight: '600', color: '#64748b' },
    badge:             { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
    badgeOn:           { backgroundColor: '#d1fae5' },
    badgeOff:          { backgroundColor: '#fee2e2' },
    badgeTxt:          { fontSize: 11, fontWeight: '700' },
    badgeOnTxt:        { color: '#065f46' },
    badgeOffTxt:       { color: '#991b1b' },
    centerPad:         { padding: 32, alignItems: 'center' },
    emptyWrap:         { padding: 40, alignItems: 'center', gap: 10 },
    emptyText:         { fontSize: 14, color: '#94a3b8' },
});