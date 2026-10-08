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


export default function AjouterReclamation({ visible, slideAnim, form, setForm, saving, onClose, onSave }) {
    const [darkMode, setDarkMode] = useState(false);
    const T = darkMode ? DARK : LIGHT;

    useEffect(() => { loadDarkMode().then(setDarkMode); }, []);

    if (!visible) return null;

    return (
        <>
            <Pressable style={st.overlay} onPress={onClose} />
            <Animated.View style={[st.sheet, { backgroundColor: T.card, transform: [{ translateY: slideAnim }] }]}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 80}>
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={{ paddingBottom: 50 }}
                    >
                        <View style={[st.handle, { backgroundColor: T.border }]} />
                        <Text style={[st.sheetTitle, { color: T.text }]}>Nouvelle réclamation</Text>
                        <View style={[st.divider, { backgroundColor: T.border }]} />

                        <Text style={[st.label, { color: T.sub }]}>Sujet <Text style={st.req}>*</Text></Text>
                        <TextInput
                            style={[st.input, { backgroundColor: T.searchBg, borderColor: T.border, color: T.text }]}
                            placeholder="Ex: Problème de livraison"
                            placeholderTextColor={T.sub}
                            value={form.sujet}
                            onChangeText={v => setForm(f => ({ ...f, sujet: v }))}
                        />

                        <Text style={[st.label, { color: T.sub }]}>Message <Text style={st.req}>*</Text></Text>
                        <TextInput
                            style={[st.input, st.textarea, { backgroundColor: T.searchBg, borderColor: T.border, color: T.text }]}
                            placeholder="Décrivez votre réclamation..."
                            placeholderTextColor={T.sub}
                            value={form.message}
                            onChangeText={v => setForm(f => ({ ...f, message: v }))}
                            multiline
                            numberOfLines={5}
                            textAlignVertical="top"
                        />

                        <View style={[st.divider, { backgroundColor: T.border }]} />
                        <View style={st.btnRow}>
                            <TouchableOpacity style={st.saveBtn} onPress={onSave} disabled={saving} activeOpacity={0.85}>
                                {saving
                                    ? <ActivityIndicator color="#fff" />
                                    : <Text style={st.saveTxt}>Envoyer</Text>
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
    req:        { color: '#e53e3e' },
    input:      { backgroundColor: '#f8fafc', borderRadius: 12, height: 48, paddingHorizontal: 14, fontSize: 14, color: '#1a2940', borderWidth: 1.5, borderColor: '#e2e8f0', marginBottom: 14 },
    textarea:   { height: 120, paddingTop: 14 },
    btnRow:     { flexDirection: 'row', gap: 12 },
    saveBtn:    { flex: 1, backgroundColor: TEAL, borderRadius: 30, height: 50, justifyContent: 'center', alignItems: 'center' },
    saveTxt:    { color: '#fff', fontWeight: '700', fontSize: 15 },
    cancelBtn:  { flex: 1, backgroundColor: '#f1f5f9', borderRadius: 30, height: 50, justifyContent: 'center', alignItems: 'center' },
    cancelTxt:  { color: '#475569', fontWeight: '600', fontSize: 15 },
});