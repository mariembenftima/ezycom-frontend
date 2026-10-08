import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import api from '../../../utils/api';
import { clearSession, loadSession } from '../../../utils/auth';
import { loadDarkMode, saveDarkMode } from '../../../utils/darkMode';
import { DARK, LIGHT, TEAL } from '../../../utils/theme';
import AppFooter from '../../components/AppFooter';
import AppHeader from '../../components/AppHeader';
import AjouterCategorie from './ajouter-categorie';
export default function CategoriesScreen() {
    const [session, setSession] = useState(null);
    const [darkMode, setDarkMode] = useState(false);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [modal, setModal] = useState(null);

    const T = darkMode ? DARK : LIGHT;

    const slideAnim = useRef(new Animated.Value(900)).current;

    useEffect(() => { loadDarkMode().then(setDarkMode); }, []);

    useEffect(() => {
        loadSession().then(s => {
            if (!s) { router.replace('/(auth)/login'); return; }
            setSession(s);
            fetchCategories();
        });
    }, []);

    const fetchCategories = async () => {
        setLoading(true);
        try {
            const data = await api.get('/api/categories/categories-list.php');
            if (data.success) setCategories(data.data);
        } catch { }
        finally { setLoading(false); }
    };

    const openModal = (type, cat = null) => {
        setModal({ type, id: cat?.id ?? null, nom: cat?.nom ?? '', sous: cat?.sous ?? [], newSubs: [''], delSubs: [] });
        slideAnim.setValue(900);
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 60, friction: 11 }).start();
    };

    const closeModal = () => {
        Animated.timing(slideAnim, { toValue: 900, duration: 250, useNativeDriver: true }).start(() => setModal(null));
    };

    const handleSave = async () => {
        if (!modal.nom.trim()) { Alert.alert('Champ requis', 'Le nom de la catégorie est obligatoire.'); return; }
        setSaving(true);
        try {
            const isEdit = modal.type === 'edit';
            const body = isEdit
                ? { nom: modal.nom, sous_new: modal.newSubs.filter(s => s.trim()), sous_delete: modal.delSubs }
                : { nom: modal.nom, sous: modal.newSubs.filter(s => s.trim()) };

            const data = isEdit
                ? await api.put(`/api/categories/categories-update.php?id=${modal.id}`, body)
                : await api.post('/api/categories/categories-create.php', body);

            if (data.success) { closeModal(); fetchCategories(); }
            else Alert.alert('Erreur', data.message);
        } catch { Alert.alert('Erreur', 'Impossible de contacter le serveur.'); }
        finally { setSaving(false); }
    };

    const handleDelete = (cat) => {
        Alert.alert('Supprimer', `Supprimer "${cat.nom}" et toutes ses sous-catégories ?`, [
            { text: 'Annuler', style: 'cancel' },
            {
                text: 'Supprimer', style: 'destructive',
                onPress: async () => {
                    try {
                        const data = await api.delete(`/api/categories/categories-delete.php?id=${cat.id}`);
                        if (data.success) fetchCategories();
                        else Alert.alert('Erreur', data.message);
                    } catch { Alert.alert('Erreur', 'Impossible de contacter le serveur.'); }
                },
            },
        ]);
    };

    const updateNewSub = (i, v) => setModal(m => { const a = [...m.newSubs]; a[i] = v; return { ...m, newSubs: a }; });
    const addNewSub = () => setModal(m => ({ ...m, newSubs: [...m.newSubs, ''] }));
    const removeNewSub = (i) => setModal(m => { const a = m.newSubs.filter((_, idx) => idx !== i); return { ...m, newSubs: a.length ? a : [''] }; });
    const toggleDelSub = (id) => setModal(m => ({ ...m, delSubs: m.delSubs.includes(id) ? m.delSubs.filter(x => x !== id) : [...m.delSubs, id] }));

    if (!session) return <View style={st.center}><ActivityIndicator size="large" color={TEAL} /></View>;

    return (
        <SafeAreaView style={[st.safe, { backgroundColor: T.bg }]}>
            <AppHeader
                session={session} darkMode={darkMode}
                onToggleDark={() => { const next = !darkMode; setDarkMode(next); saveDarkMode(next); }}
                onLogout={async () => { await clearSession(); router.replace('/(auth)/login'); }}
            />

            <ScrollView style={st.scroll} contentContainerStyle={st.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={st.breadcrumbRow}>
                    <Text style={[st.breadcrumbBack, { color: T.sub }]} onPress={() => router.push('/(merchant)/dashboard')}>Dashboard</Text>
                    <Ionicons name="chevron-forward" size={13} color={T.sub} />
                    <Text style={st.breadcrumbCurrent}>Catégories</Text>
                </View>

                <Text style={[st.pageTitle, { color: T.text }]}>Catégories</Text>

                <View style={[st.card, { backgroundColor: T.card }]}>
                    <View style={st.cardHeader}>
                        <Text style={[st.cardTitle, { color: T.text }]}>Mes catégories principales</Text>
                        <TouchableOpacity style={st.addBtn} onPress={() => openModal('add')} activeOpacity={0.85}>
                            <Text style={st.addBtnText}>Ajouter une catégorie</Text>
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <View style={st.centerPad}><ActivityIndicator color={TEAL} /></View>
                    ) : categories.length === 0 ? (
                        <View style={st.emptyWrap}>
                            <Ionicons name="folder-open-outline" size={40} color={T.sub} />
                            <Text style={[st.emptyText, { color: T.sub }]}>Aucune catégorie</Text>
                        </View>
                    ) : (
                        <View style={st.catList}>
                            {categories.map((cat, i) => (
                                <View key={cat.id} style={[st.catCard, i < categories.length - 1 && { borderBottomWidth: 1, borderBottomColor: T.border }]}>
                                    <View style={st.catTop}>
                                        <View style={st.catIconWrap}>
                                            <Ionicons name="folder-outline" size={22} color={TEAL} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <View style={st.catNameRow}>
                                                <Text style={[st.catName, { color: T.text }]}>{cat.nom}</Text>
                                                <View style={[st.badge, cat.etat === 1 ? st.badgeOn : st.badgeOff]}>
                                                    <Text style={[st.badgeTxt, cat.etat === 1 ? st.badgeOnTxt : st.badgeOffTxt]}>
                                                        {cat.etat === 1 ? 'Actif' : 'Inactif'}
                                                    </Text>
                                                </View>
                                            </View>
                                            {cat.sous.length === 0
                                                ? <Text style={[st.none, { color: T.sub }]}>Aucune sous-catégorie</Text>
                                                : <View style={st.chipsRow}>
                                                    {cat.sous.map(s => (
                                                        <View key={s.id} style={st.chip}>
                                                            <Text style={st.chipTxt}>{s.nom}</Text>
                                                        </View>
                                                    ))}
                                                </View>
                                            }
                                        </View>
                                    </View>
                                    <View style={st.catActions}>
                                        <TouchableOpacity style={[st.actionBtn, { backgroundColor: T.searchBg, borderColor: T.border }]} onPress={() => openModal('edit', cat)}>
                                            <Ionicons name="pencil-outline" size={14} color={T.sub} />
                                            <Text style={[st.actionBtnTxt, { color: T.sub }]}>Modifier</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={[st.actionBtn, st.actionBtnRed]} onPress={() => handleDelete(cat)}>
                                            <Ionicons name="trash-outline" size={14} color="#e53e3e" />
                                            <Text style={[st.actionBtnTxt, { color: '#e53e3e' }]}>Supprimer</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            </ScrollView>

            <AppFooter darkMode={darkMode} />

            <AjouterCategorie
                modal={modal}
                setModal={setModal}
                slideAnim={slideAnim}
                saving={saving}
                onClose={closeModal}
                onSave={handleSave}
                onUpdateNewSub={updateNewSub}
                onAddNewSub={addNewSub}
                onRemoveNewSub={removeNewSub}
                onToggleDelSub={toggleDelSub}
            />
        </SafeAreaView>
    );
}

const st = StyleSheet.create({
    safe: { flex: 1, backgroundColor: LIGHT.bg },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: LIGHT.bg },
    scroll: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 32 },
    breadcrumbRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
    breadcrumbBack: { fontSize: 12, color: '#94a3b8' },
    breadcrumbCurrent: { fontSize: 12, color: TEAL, fontWeight: '600' },
    pageTitle: { fontSize: 22, fontWeight: '800', color: '#1a2940', marginBottom: 16 },
    card: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, flexWrap: 'wrap', gap: 10 },
    cardTitle: { fontSize: 15, fontWeight: '800', color: '#1a2940', flex: 1 },
    addBtn: { backgroundColor: TEAL, borderRadius: 30, paddingHorizontal: 18, paddingVertical: 10 },
    addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    catList: { padding: 12, gap: 0 },
    catCard: { paddingVertical: 14, paddingHorizontal: 4 },
    catCardBorder: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    catTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
    catIconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#E8F8FC', justifyContent: 'center', alignItems: 'center' },
    catNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
    catName: { fontSize: 14, fontWeight: '700', color: '#1a2940', flex: 1, marginRight: 8 },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    none: { fontSize: 12, color: '#b0bcc8', fontStyle: 'italic' },
    chip: { backgroundColor: TEAL, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
    chipTxt: { fontSize: 11, color: '#fff', fontWeight: '600' },
    badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
    badgeOn: { backgroundColor: '#d1fae5' },
    badgeOff: { backgroundColor: '#fee2e2' },
    badgeTxt: { fontSize: 11, fontWeight: '700' },
    badgeOnTxt: { color: '#065f46' },
    badgeOffTxt: { color: '#991b1b' },
    catActions: { flexDirection: 'row', gap: 10, marginLeft: 56 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc' },
    actionBtnRed: { borderColor: '#fee2e2', backgroundColor: '#fff5f5' },
    actionBtnTxt: { fontSize: 12, fontWeight: '600', color: '#64748b' },
    centerPad: { padding: 32, alignItems: 'center' },
    emptyWrap: { padding: 40, alignItems: 'center', gap: 10 },
    emptyText: { fontSize: 14, color: '#94a3b8' },
});