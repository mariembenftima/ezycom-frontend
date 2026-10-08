import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { loadDarkMode } from '../../../utils/darkMode';
import { DARK, LIGHT, TEAL } from '../../../utils/theme';

export default function AjouterCategorie({
    modal,
    setModal,
    slideAnim,
    saving,
    onClose,
    onSave,
    onUpdateNewSub,
    onAddNewSub,
    onRemoveNewSub,
    onToggleDelSub,
}) {
    const [darkMode, setDarkMode] = useState(false);
    const T = darkMode ? DARK : LIGHT;

    useEffect(() => { loadDarkMode().then(setDarkMode); }, []);

    if (!modal) return null;

    return (
        <>
            <Pressable style={st.overlay} onPress={onClose} />
            <Animated.View style={[st.sheet, { backgroundColor: T.card, transform: [{ translateY: slideAnim }] }]}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={{ paddingBottom: 50 }}
                    >
                        <View style={[st.handle, { backgroundColor: T.border }]} />
                        <Text style={[st.sheetTitle, { color: T.text }]}>
                            {modal.type === 'add' ? 'Nouvelle catégorie' : 'Modifier la catégorie'}
                        </Text>
                        <View style={[st.divider, { backgroundColor: T.border }]} />

                        {modal.type === 'add' ? (
                            <>
                                <Text style={[st.label, { color: T.sub }]}>Nom de la catégorie principale <Text style={st.req}>*</Text></Text>
                                <TextInput
                                    style={[st.input, { backgroundColor: T.searchBg, borderColor: T.border, color: T.text }]}
                                    placeholder="Ex: Cosmétique"
                                    placeholderTextColor={T.sub}
                                    value={modal.nom}
                                    onChangeText={v => setModal(m => ({ ...m, nom: v }))}
                                />
                                <Text style={[st.label, { color: T.sub }]}>Sous-catégories</Text>
                                {modal.newSubs.map((s, i) => (
                                    <View key={i} style={st.subRow}>
                                        <TextInput
                                            style={[st.input, { flex: 1, marginBottom: 0, backgroundColor: T.searchBg, borderColor: T.border, color: T.text }]}
                                            placeholder={`Sous-catégorie ${i + 1}`}
                                            placeholderTextColor={T.sub}
                                            value={s}
                                            onChangeText={v => onUpdateNewSub(i, v)}
                                        />
                                        {modal.newSubs.length > 1 && (
                                            <TouchableOpacity onPress={() => onRemoveNewSub(i)} style={{ padding: 4 }}>
                                                <Ionicons name="close-circle" size={22} color="#e53e3e" />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                ))}
                                <TouchableOpacity style={st.addSubBtn} onPress={onAddNewSub}>
                                    <Text style={st.addSubTxt}>+ Ajouter une sous-catégorie</Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
                                <Text style={[st.label, { color: T.sub }]}>Nom catégorie principale <Text style={st.req}>*</Text></Text>
                                <TextInput
                                    style={[st.input, { backgroundColor: T.searchBg, borderColor: T.border, color: T.text }]}
                                    value={modal.nom}
                                    onChangeText={v => setModal(m => ({ ...m, nom: v }))}
                                />
                                <Text style={[st.sectionLbl, { color: T.text }]}>Sous-catégories existantes</Text>
                                {modal.sous.length === 0
                                    ? <Text style={[st.none, { color: T.sub }]}>Aucune sous-catégorie.</Text>
                                    : modal.sous.map(sub => {
                                        const del = modal.delSubs.includes(sub.id);
                                        return (
                                            <View key={sub.id} style={[st.existRow, { borderBottomColor: T.border }]}>
                                                <Text style={[st.existTxt, { color: T.text }, del && st.existDel]}>{sub.nom}</Text>
                                                <TouchableOpacity onPress={() => onToggleDelSub(sub.id)}>
                                                    <Ionicons
                                                        name={del ? 'arrow-undo-outline' : 'trash-outline'}
                                                        size={18}
                                                        color={del ? TEAL : '#e53e3e'}
                                                    />
                                                </TouchableOpacity>
                                            </View>
                                        );
                                    })
                                }
                                <Text style={[st.sectionLbl, { color: T.text }]}>Ajouter de nouvelles sous-catégories</Text>
                                {modal.newSubs.map((s, i) => (
                                    <View key={i} style={st.subRow}>
                                        <TextInput
                                            style={[st.input, { flex: 1, marginBottom: 0, backgroundColor: T.searchBg, borderColor: T.border, color: T.text }]}
                                            placeholder="Nouvelle sous-catégorie"
                                            placeholderTextColor={T.sub}
                                            value={s}
                                            onChangeText={v => onUpdateNewSub(i, v)}
                                        />
                                        {modal.newSubs.length > 1 && (
                                            <TouchableOpacity onPress={() => onRemoveNewSub(i)} style={{ padding: 4 }}>
                                                <Ionicons name="close-circle" size={22} color="#e53e3e" />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                ))}
                                <TouchableOpacity style={st.addSubBtn} onPress={onAddNewSub}>
                                    <Text style={st.addSubTxt}>+ Ajouter</Text>
                                </TouchableOpacity>
                            </>
                        )}

                        <View style={st.divider} />
                        <View style={st.btnRow}>
                            <TouchableOpacity style={st.saveBtn} onPress={onSave} disabled={saving} activeOpacity={0.85}>
                                {saving
                                    ? <ActivityIndicator color="#fff" />
                                    : <Text style={st.saveTxt}>Enregistrer</Text>
                                }
                            </TouchableOpacity>
                            <TouchableOpacity style={[st.cancelBtn, { backgroundColor: T.searchBg }]} onPress={onClose} activeOpacity={0.85}>
                                <Text style={[st.cancelTxt, { color: T.sub }]}>Annuler</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </Animated.View>
        </>
    );
}

const st = StyleSheet.create({
    overlay:    { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 20 },
    sheet:      { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', zIndex: 21, paddingHorizontal: 20, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 20 },
    handle:     { width: 40, height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 16 },
    sheetTitle: { fontSize: 20, fontWeight: '800', color: '#1a2940', marginBottom: 16 },
    divider:    { height: 1, backgroundColor: '#f1f5f9', marginVertical: 16 },
    label:      { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 },
    sectionLbl: { fontSize: 14, fontWeight: '800', color: '#1a2940', marginBottom: 10, marginTop: 4 },
    req:        { color: '#e53e3e' },
    input:      { backgroundColor: '#f8fafc', borderRadius: 12, height: 48, paddingHorizontal: 14, fontSize: 14, color: '#1a2940', borderWidth: 1.5, borderColor: '#e2e8f0', marginBottom: 14 },
    subRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    addSubBtn:  { borderWidth: 1.5, borderColor: TEAL, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginBottom: 10 },
    addSubTxt:  { color: TEAL, fontWeight: '700', fontSize: 13 },
    existRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    existTxt:   { fontSize: 14, color: '#334155' },
    existDel:   { textDecorationLine: 'line-through', color: '#94a3b8' },
    none:       { fontSize: 12, color: '#b0bcc8', fontStyle: 'italic' },
    btnRow:     { flexDirection: 'row', gap: 12 },
    saveBtn:    { flex: 1, backgroundColor: TEAL, borderRadius: 30, height: 50, justifyContent: 'center', alignItems: 'center' },
    saveTxt:    { color: '#fff', fontWeight: '700', fontSize: 15 },
    cancelBtn:  { flex: 1, backgroundColor: '#f1f5f9', borderRadius: 30, height: 50, justifyContent: 'center', alignItems: 'center' },
    cancelTxt:  { color: '#475569', fontWeight: '600', fontSize: 15 },
});
