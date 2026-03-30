import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { API_URL } from '../../../config';
import { authHeaders, clearSession, loadSession } from "../../../utils/auth";
import AppFooter from '../../components/AppFooter';
import AppHeader from '../../components/AppHeader';

const TEAL = '#29B6D8';
const BG   = '#EEF4F9';

export default function CategoriesScreen() {
    const [session,    setSession]    = useState(null);
    const [darkMode,   setDarkMode]   = useState(false);
    const [categories, setCategories] = useState([]);
    const [loading,    setLoading]    = useState(true);
    const [saving,     setSaving]     = useState(false);
    const [modal,      setModal]      = useState(null);

    const slideAnim = useRef(new Animated.Value(900)).current;

    useEffect(() => {
        loadSession().then(s => {
            if (!s) { router.replace('/(auth)/login'); return; }
            setSession(s);
            fetchCategories(s.token);
        });
    }, []);

    const fetchCategories = async (token) => {
        setLoading(true);
        try {
            const res  = await fetch(`${API_URL}/api/categories`, {
                headers: authHeaders(token),
            });
            const data = await res.json();
            if (data.success) setCategories(data.data);
        } catch {}
        finally { setLoading(false); }
    };

    const openModal = (type, cat = null) => {
        setModal({
            type,
            id:      cat?.id   ?? null,
            nom:     cat?.nom  ?? '',
            sous:    cat?.sous ?? [],
            newSubs: [''],
            delSubs: [],
        });
        slideAnim.setValue(900);
        Animated.spring(slideAnim, {
            toValue: 0, useNativeDriver: true, tension: 60, friction: 11,
        }).start();
    };

    const closeModal = () => {
        Animated.timing(slideAnim, {
            toValue: 900, duration: 250, useNativeDriver: true,
        }).start(() => setModal(null));
    };

    const handleSave = async () => {
        if (!modal.nom.trim()) {
            Alert.alert('Champ requis', 'Le nom de la catégorie est obligatoire.');
            return;
        }
        setSaving(true);
        try {
            const isEdit = modal.type === 'edit';
            const url    = isEdit
                ? `${API_URL}/api/categories/${modal.id}`
                : `${API_URL}/api/categories`;

            const body = isEdit
                ? { nom: modal.nom, sous_new: modal.newSubs.filter(s => s.trim()), sous_delete: modal.delSubs }
                : { nom: modal.nom, sous: modal.newSubs.filter(s => s.trim()) };

            const res  = await fetch(url, {
                method:  isEdit ? 'PUT' : 'POST',
                headers: authHeaders(session.token),
                body:    JSON.stringify(body),
            });
            const data = await res.json();

            if (data.success) {
                closeModal();
                fetchCategories(session.token);
            } else {
                Alert.alert('Erreur', data.message);
            }
        } catch {
            Alert.alert('Erreur', 'Impossible de contacter le serveur.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (cat) => {
        Alert.alert(
            'Supprimer',
            `Supprimer "${cat.nom}" et toutes ses sous-catégories ?`,
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Supprimer', style: 'destructive',
                    onPress: async () => {
                        try {
                            const res  = await fetch(`${API_URL}/api/categories/${cat.id}`, {
                                method: 'DELETE', headers: authHeaders(session.token),
                            });
                            const data = await res.json();
                            if (data.success) fetchCategories(session.token);
                            else Alert.alert('Erreur', data.message);
                        } catch { Alert.alert('Erreur', 'Impossible de contacter le serveur.'); }
                    },
                },
            ]
        );
    };

    const updateNewSub  = (i, v)  => setModal(m => { const a = [...m.newSubs]; a[i] = v; return { ...m, newSubs: a }; });
    const addNewSub     = ()      => setModal(m => ({ ...m, newSubs: [...m.newSubs, ''] }));
    const removeNewSub  = (i)     => setModal(m => { const a = m.newSubs.filter((_, idx) => idx !== i); return { ...m, newSubs: a.length ? a : [''] }; });
    const toggleDelSub  = (id)    => setModal(m => ({
        ...m,
        delSubs: m.delSubs.includes(id) ? m.delSubs.filter(x => x !== id) : [...m.delSubs, id],
    }));

    if (!session) return (
        <View style={st.center}><ActivityIndicator size="large" color={TEAL} /></View>
    );

    return (
        <SafeAreaView style={st.safe}>
            <AppHeader
                session={session}
                darkMode={darkMode}
                onToggleDark={() => setDarkMode(d => !d)}
                onLogout={async () => { await clearSession(); router.replace('/(auth)/login'); }}
            />

            <ScrollView style={st.scroll} contentContainerStyle={st.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Breadcrumb */}
                <View style={st.breadcrumbRow}>
                    <Text style={st.breadcrumbBack} onPress={() => router.push('/(merchant)/dashboard')}>Dashboard</Text>
                    <Ionicons name="chevron-forward" size={13} color="#94a3b8" />
                    <Text style={st.breadcrumbCurrent}>Catégories</Text>
                </View>
 
                <Text style={st.pageTitle}>Catégories</Text>

                <View style={st.card}>
                    {/* Card header */}
                    <View style={st.cardHeader}>
                        <Text style={st.cardTitle}>Mes catégories principales</Text>
                        <TouchableOpacity style={st.addBtn} onPress={() => openModal('add')} activeOpacity={0.85}>
                            <Text style={st.addBtnText}>Ajouter une catégorie</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Table head */}
                    <View style={st.tableHead}>
                        <Text style={[st.th, { flex: 2 }]}>Catégorie principale</Text>
                        <Text style={[st.th, { flex: 2 }]}>Sous-catégories</Text>
                        <Text style={[st.th, { flex: 1, textAlign: 'center' }]}>État</Text>
                        <Text style={[st.th, { flex: 1, textAlign: 'center' }]}>Actions</Text>
                    </View>

                    {/* Rows */}
                    {loading ? (
                        <View style={st.centerPad}><ActivityIndicator color={TEAL} /></View>
                    ) : categories.length === 0 ? (
                        <View style={st.emptyWrap}>
                            <Ionicons name="folder-open-outline" size={40} color="#c8d4e0" />
                            <Text style={st.emptyText}>Aucune catégorie</Text>
                        </View>
                    ) : (
                        categories.map((cat, i) => (
                            <View key={cat.id} style={[st.row, i % 2 !== 0 && st.rowAlt]}>

                                {/* Name */}
                                <View style={[st.td, { flex: 2, gap: 4 }]}>
                                    <Ionicons name="folder-outline" size={26} color="#b0bcc8" />
                                    <Text style={st.catName}>{cat.nom}</Text>
                                </View>

                                {/* Subs */}
                                <View style={[st.td, { flex: 2, flexWrap: 'wrap', flexDirection: 'row', gap: 4 }]}>
                                    {cat.sous.length === 0
                                        ? <Text style={st.none}>Aucune</Text>
                                        : cat.sous.map(s => (
                                            <View key={s.id} style={st.chip}>
                                                <Text style={st.chipTxt}>{s.nom}</Text>
                                            </View>
                                        ))
                                    }
                                </View>

                                {/* Status */}
                                <View style={[st.td, { flex: 1, alignItems: 'center' }]}>
                                    <View style={[st.badge, cat.etat === 1 ? st.badgeOn : st.badgeOff]}>
                                        <Text style={[st.badgeTxt, cat.etat === 1 ? st.badgeOnTxt : st.badgeOffTxt]}>
                                            {cat.etat === 1 ? 'Actif' : 'Inactif'}
                                        </Text>
                                    </View>
                                </View>

                                {/* Actions */}
                                <View style={[st.td, { flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 6 }]}>
                                    <TouchableOpacity style={st.iconBtn} onPress={() => openModal('edit', cat)}>
                                        <Ionicons name="pencil-outline" size={15} color="#64748b" />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[st.iconBtn, st.iconBtnRed]} onPress={() => handleDelete(cat)}>
                                        <Ionicons name="trash-outline" size={15} color="#e53e3e" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))
                    )}
                </View>
            </ScrollView>

            <AppFooter />

            {/* ── MODAL ── */}
            {modal && (
                <>
                    <Pressable style={st.overlay} onPress={closeModal} />
                    <Animated.View style={[st.sheet, { transform: [{ translateY: slideAnim }] }]}>
                        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
                                contentContainerStyle={{ paddingBottom: 50 }}>

                                <View style={st.handle} />
                                <Text style={st.sheetTitle}>
                                    {modal.type === 'add' ? 'Nouvelle catégorie' : 'Modifier la catégorie'}
                                </Text>
                                <View style={st.divider} />

                                {modal.type === 'add' ? (
                                    <>
                                        <Text style={st.label}>Nom de la catégorie principale <Text style={st.req}>*</Text></Text>
                                        <TextInput style={st.input} placeholder="Ex: Cosmétique" placeholderTextColor="#b0bcc8"
                                            value={modal.nom} onChangeText={v => setModal(m => ({ ...m, nom: v }))} />

                                        <Text style={st.label}>Sous-catégories</Text>
                                        {modal.newSubs.map((s, i) => (
                                            <View key={i} style={st.subRow}>
                                                <TextInput style={[st.input, { flex: 1, marginBottom: 0 }]}
                                                    placeholder={`Sous-catégorie ${i + 1}`} placeholderTextColor="#b0bcc8"
                                                    value={s} onChangeText={v => updateNewSub(i, v)} />
                                                {modal.newSubs.length > 1 && (
                                                    <TouchableOpacity onPress={() => removeNewSub(i)} style={{ padding: 4 }}>
                                                        <Ionicons name="close-circle" size={22} color="#e53e3e" />
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                        ))}
                                        <TouchableOpacity style={st.addSubBtn} onPress={addNewSub}>
                                            <Text style={st.addSubTxt}>+ Ajouter une sous-catégorie</Text>
                                        </TouchableOpacity>
                                    </>
                                ) : (
                                    <>
                                        <Text style={st.label}>Nom catégorie principale <Text style={st.req}>*</Text></Text>
                                        <TextInput style={st.input} value={modal.nom}
                                            onChangeText={v => setModal(m => ({ ...m, nom: v }))} />

                                        <Text style={st.sectionLbl}>Sous-catégories existantes</Text>
                                        {modal.sous.length === 0
                                            ? <Text style={st.none}>Aucune sous-catégorie.</Text>
                                            : modal.sous.map(sub => {
                                                const del = modal.delSubs.includes(sub.id);
                                                return (
                                                    <View key={sub.id} style={st.existRow}>
                                                        <Text style={[st.existTxt, del && st.existDel]}>{sub.nom}</Text>
                                                        <TouchableOpacity onPress={() => toggleDelSub(sub.id)}>
                                                            <Ionicons name={del ? 'arrow-undo-outline' : 'trash-outline'}
                                                                size={18} color={del ? TEAL : '#e53e3e'} />
                                                        </TouchableOpacity>
                                                    </View>
                                                );
                                            })
                                        }

                                        <Text style={st.sectionLbl}>Ajouter de nouvelles sous-catégories</Text>
                                        {modal.newSubs.map((s, i) => (
                                            <View key={i} style={st.subRow}>
                                                <TextInput style={[st.input, { flex: 1, marginBottom: 0 }]}
                                                    placeholder="Nouvelle sous-catégorie" placeholderTextColor="#b0bcc8"
                                                    value={s} onChangeText={v => updateNewSub(i, v)} />
                                                {modal.newSubs.length > 1 && (
                                                    <TouchableOpacity onPress={() => removeNewSub(i)} style={{ padding: 4 }}>
                                                        <Ionicons name="close-circle" size={22} color="#e53e3e" />
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                        ))}
                                        <TouchableOpacity style={st.addSubBtn} onPress={addNewSub}>
                                            <Text style={st.addSubTxt}>+ Ajouter</Text>
                                        </TouchableOpacity>
                                    </>
                                )}

                                <View style={st.divider} />
                                <View style={st.btnRow}>
                                    <TouchableOpacity style={st.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
                                        {saving
                                            ? <ActivityIndicator color="#fff" />
                                            : <Text style={st.saveTxt}>Enregistrer</Text>
                                        }
                                    </TouchableOpacity>
                                    <TouchableOpacity style={st.cancelBtn} onPress={closeModal} activeOpacity={0.85}>
                                        <Text style={st.cancelTxt}>Annuler</Text>
                                    </TouchableOpacity>
                                </View>

                            </ScrollView>
                        </KeyboardAvoidingView>
                    </Animated.View>
                </>
            )}
        </SafeAreaView>
    );
}

const st = StyleSheet.create({
    safe:         { flex: 1, backgroundColor: BG },
    center:       { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG },
    scroll:       { flex: 1 },
    scrollContent:{ padding: 16, paddingBottom: 32 },

    breadcrumbRow:    { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
    breadcrumbBack:   { fontSize: 12, color: '#94a3b8' },
    breadcrumbCurrent:{ fontSize: 12, color: TEAL, fontWeight: '600' },
    pageTitle:        { fontSize: 22, fontWeight: '800', color: '#1a2940', marginBottom: 16 },

    card: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },

    cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, flexWrap: 'wrap', gap: 10 },
    cardTitle:  { fontSize: 15, fontWeight: '800', color: '#1a2940', flex: 1 },
    addBtn:     { backgroundColor: TEAL, borderRadius: 30, paddingHorizontal: 18, paddingVertical: 10 },
    addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

    tableHead: { flexDirection: 'row', backgroundColor: '#f8fafc', paddingVertical: 10, paddingHorizontal: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#e8eef4' },
    th:        { fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.4 },

    row:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    rowAlt: { backgroundColor: '#fafcff' },
    td:     { justifyContent: 'center' },

    catName: { fontSize: 13, fontWeight: '600', color: '#1a2940', marginTop: 2 },
    none:    { fontSize: 12, color: '#b0bcc8', fontStyle: 'italic' },

    chip:    { backgroundColor: TEAL, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, marginBottom: 2 },
    chipTxt: { fontSize: 11, color: '#fff', fontWeight: '600' },

    badge:      { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
    badgeOn:    { backgroundColor: '#d1fae5' },
    badgeOff:   { backgroundColor: '#fee2e2' },
    badgeTxt:   { fontSize: 11, fontWeight: '700' },
    badgeOnTxt: { color: '#065f46' },
    badgeOffTxt:{ color: '#991b1b' },

    iconBtn:    { width: 32, height: 32, borderRadius: 8, borderWidth: 1.5, borderColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
    iconBtnRed: { borderColor: '#fee2e2', backgroundColor: '#fff5f5' },

    centerPad: { padding: 32, alignItems: 'center' },
    emptyWrap: { padding: 40, alignItems: 'center', gap: 10 },
    emptyText: { fontSize: 14, color: '#94a3b8' },

    overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 20 },
    sheet: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
        maxHeight: '90%', zIndex: 21, paddingHorizontal: 20,
        shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 20,
    },
    handle:     { width: 40, height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 16 },
    sheetTitle: { fontSize: 20, fontWeight: '800', color: '#1a2940', marginBottom: 16 },
    divider:    { height: 1, backgroundColor: '#f1f5f9', marginVertical: 16 },

    label:      { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 },
    sectionLbl: { fontSize: 14, fontWeight: '800', color: '#1a2940', marginBottom: 10, marginTop: 4 },
    req:        { color: '#e53e3e' },

    input: { backgroundColor: '#f8fafc', borderRadius: 12, height: 48, paddingHorizontal: 14, fontSize: 14, color: '#1a2940', borderWidth: 1.5, borderColor: '#e2e8f0', marginBottom: 14 },

    subRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    addSubBtn: { borderWidth: 1.5, borderColor: TEAL, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginBottom: 10 },
    addSubTxt: { color: TEAL, fontWeight: '700', fontSize: 13 },

    existRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    existTxt:  { fontSize: 14, color: '#334155' },
    existDel:  { textDecorationLine: 'line-through', color: '#94a3b8' },

    btnRow:    { flexDirection: 'row', gap: 12 },
    saveBtn:   { flex: 1, backgroundColor: TEAL, borderRadius: 30, height: 50, justifyContent: 'center', alignItems: 'center' },
    saveTxt:   { color: '#fff', fontWeight: '700', fontSize: 15 },
    cancelBtn: { flex: 1, backgroundColor: '#f1f5f9', borderRadius: 30, height: 50, justifyContent: 'center', alignItems: 'center' },
    cancelTxt: { color: '#475569', fontWeight: '600', fontSize: 15 },
});