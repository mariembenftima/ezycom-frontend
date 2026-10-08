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


export default function AjouterMembre({ visible, slideAnim, form, setForm, saving, onClose, onSave, isEdit }) {
    const [darkMode, setDarkMode] = useState(false);
    const T = darkMode ? DARK : LIGHT;

    useEffect(() => { loadDarkMode().then(setDarkMode); }, []);

    if (!visible) return null;

    return (
        <>
            <Pressable style={st.overlay} onPress={onClose} />
            <Animated.View style={[st.sheet, { backgroundColor: T.card, transform: [{ translateY: slideAnim }] }]}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={80}>
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={{ paddingBottom: 50 }}
                    >
                        <View style={[st.handle, { backgroundColor: T.border }]} />
                        <Text style={[st.sheetTitle, { color: T.text }]}>{isEdit ? 'Modifier le membre' : 'Nouveau membre'}</Text>
                        <View style={[st.divider, { backgroundColor: T.border }]} />

                        <View style={st.row}>
                            <View style={{ flex: 1, marginRight: 8 }}>
                                <Text style={[st.label, { color: T.sub }]}>Nom <Text style={st.req}>*</Text></Text>
                                <TextInput
                                    style={[st.input, { backgroundColor: T.searchBg, borderColor: T.border, color: T.text }]}
                                    placeholder="Nom"
                                    placeholderTextColor={T.sub}
                                    value={form.nom}
                                    onChangeText={v => setForm(f => ({ ...f, nom: v }))}
                                />
                            </View>
                            <View style={{ flex: 1, marginLeft: 8 }}>
                                <Text style={[st.label, { color: T.sub }]}>Prénom <Text style={st.req}>*</Text></Text>
                                <TextInput
                                    style={[st.input, { backgroundColor: T.searchBg, borderColor: T.border, color: T.text }]}
                                    placeholder="Prénom"
                                    placeholderTextColor={T.sub}
                                    value={form.prenom}
                                    onChangeText={v => setForm(f => ({ ...f, prenom: v }))}
                                />
                            </View>
                        </View>

                        <Text style={[st.label, { color: T.sub }]}>Email <Text style={st.req}>*</Text></Text>
                        <TextInput
                            style={[st.input, { backgroundColor: T.searchBg, borderColor: T.border, color: T.text }]}
                            placeholder="email@exemple.com"
                            placeholderTextColor={T.sub}
                            value={form.email}
                            onChangeText={v => setForm(f => ({ ...f, email: v }))}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />

                        <Text style={[st.label, { color: T.sub }]}>{isEdit ? 'Nouveau mot de passe (optionnel)' : 'Mot de passe'} {!isEdit && <Text style={st.req}>*</Text>}</Text>
                        <TextInput
                            style={[st.input, { backgroundColor: T.searchBg, borderColor: T.border, color: T.text }]}
                            placeholder={isEdit ? 'Laisser vide pour ne pas changer' : 'Mot de passe'}
                            placeholderTextColor={T.sub}
                            value={form.password}
                            onChangeText={v => setForm(f => ({ ...f, password: v }))}
                            secureTextEntry
                        />

                        <Text style={[st.label, { color: T.sub }]}>État <Text style={st.req}>*</Text></Text>
                        <View style={st.etatRow}>
                            <TouchableOpacity
                                style={[st.etatBtn, form.etat === 1 && st.etatBtnActive]}
                                onPress={() => setForm(f => ({ ...f, etat: 1 }))}
                            >
                                <Ionicons name="checkmark-circle-outline" size={16} color={form.etat === 1 ? '#fff' : '#059669'} />
                                <Text style={[st.etatTxt, form.etat === 1 && st.etatTxtActive]}>Actif</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[st.etatBtn, st.etatBtnInactif, form.etat === 0 && st.etatBtnInactifActive]}
                                onPress={() => setForm(f => ({ ...f, etat: 0 }))}
                            >
                                <Ionicons name="close-circle-outline" size={16} color={form.etat === 0 ? '#fff' : '#DC2626'} />
                                <Text style={[st.etatTxt, { color: form.etat === 0 ? '#fff' : '#DC2626' }]}>Inactif</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={st.divider} />
                        <View style={st.btnRow}>
                            <TouchableOpacity style={st.saveBtn} onPress={onSave} disabled={saving} activeOpacity={0.85}>
                                {saving
                                    ? <ActivityIndicator color="#fff" />
                                    : <Text style={st.saveTxt}>{isEdit ? 'Modifier' : 'Ajouter'}</Text>
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
    overlay:         { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 20 },
    sheet:           { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', zIndex: 21, paddingHorizontal: 20, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 20 },
    handle:          { width: 40, height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 16 },
    sheetTitle:      { fontSize: 20, fontWeight: '800', color: '#1a2940', marginBottom: 16 },
    divider:         { height: 1, backgroundColor: '#f1f5f9', marginVertical: 16 },
    row:             { flexDirection: 'row' },
    label:           { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 },
    req:             { color: '#e53e3e' },
    input:           { backgroundColor: '#f8fafc', borderRadius: 12, height: 48, paddingHorizontal: 14, fontSize: 14, color: '#1a2940', borderWidth: 1.5, borderColor: '#e2e8f0', marginBottom: 14 },
    etatRow:         { flexDirection: 'row', gap: 12, marginBottom: 14 },
    etatBtn:         { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: '#059669', backgroundColor: '#f0fdf4' },
    etatBtnActive:   { backgroundColor: '#059669', borderColor: '#059669' },
    etatBtnInactif:  { borderColor: '#DC2626', backgroundColor: '#fef2f2' },
    etatBtnInactifActive: { backgroundColor: '#DC2626', borderColor: '#DC2626' },
    etatTxt:         { fontSize: 13, fontWeight: '700', color: '#059669' },
    etatTxtActive:   { color: '#fff' },
    btnRow:          { flexDirection: 'row', gap: 12 },
    saveBtn:         { flex: 1, backgroundColor: TEAL, borderRadius: 30, height: 50, justifyContent: 'center', alignItems: 'center' },
    saveTxt:         { color: '#fff', fontWeight: '700', fontSize: 15 },
    cancelBtn:       { flex: 1, backgroundColor: '#f1f5f9', borderRadius: 30, height: 50, justifyContent: 'center', alignItems: 'center' },
    cancelTxt:       { color: '#475569', fontWeight: '600', fontSize: 15 },
});
