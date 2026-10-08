import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../utils/api';
import { loadSession } from '../../utils/auth';
import { loadDarkMode, saveDarkMode } from '../../utils/darkMode';
import { DARK, LIGHT, TEAL, TEAL_BG } from '../../utils/theme';
import AppFooter from '../components/AppFooter';
import AppHeader from '../components/AppHeader';

const PLAN_COLORS = {
    GRATUIT:    { bg: '#E8EEF4', text: '#6A7A8A' },
    ESSOR:      { bg: '#E8F5E9', text: '#2E7D32' },
    PROSPERITE: { bg: '#FFF3E0', text: '#E65100' },
    EMPIRE:     { bg: '#FFF0ED', text: '#C0392B' },
};

const Field = ({ label, value, onChangeText, placeholder, keyboardType = 'default', editable = true, T }) => (
    <View style={styles.fieldWrap}>
        <Text style={[styles.fieldLabel, { color: T.sub }]}>{label}</Text>
        <TextInput
            style={[styles.fieldInput, { backgroundColor: T.input, borderColor: T.border, color: T.text }, !editable && { backgroundColor: T.inputDisabled, color: T.sub }]}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder || label}
            placeholderTextColor={T.sub}
            keyboardType={keyboardType}
            editable={editable}
        />
    </View>
);

const LIGHT_EXT = { ...LIGHT, input: '#F9FAFB', inputDisabled: '#F3F4F6' };
const DARK_EXT  = { ...DARK,  input: '#152D42', inputDisabled: '#0A1525' };

export default function ParametresScreen() {
    const [session,      setSession]      = useState(null);
    const [darkMode,     setDarkMode]     = useState(false);
    const [loading,      setLoading]      = useState(true);
    const [saving,       setSaving]       = useState(false);
    const [bioAvailable, setBioAvailable] = useState(false);
    const [bioEnabled,   setBioEnabled]   = useState(false);

    const [form, setForm] = useState({
        boutique: '', nom: '', prenom: '', email: '',
        tel: '', adresse: '', ville: null, villeLabel: '', pack_nom: '',
    });

    const [villes,     setVilles]     = useState([]);
    const [cityModal,  setCityModal]  = useState(false);
    const [citySearch, setCitySearch] = useState('');

    const T = darkMode ? DARK_EXT : LIGHT_EXT;
    const isCommercant = session?.user?.role === 'commercant' || session?.role === 'commercant';

    useEffect(() => { loadDarkMode().then(setDarkMode); }, []);

    const updateField = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

    useFocusEffect(useCallback(() => {
        (async () => {
            const s = await loadSession();
            if (!s?.token) { router.replace('/(auth)/login'); return; }
            setSession(s);
            await Promise.all([fetchProfil(), fetchVilles()]);
            const hasHardware = await LocalAuthentication.hasHardwareAsync();
            const enrolled    = await LocalAuthentication.isEnrolledAsync();
            setBioAvailable(hasHardware && enrolled);
            const enabled = await AsyncStorage.getItem('biometric_enabled');
            setBioEnabled(enabled === 'true');
        })();
    }, []));

    const fetchProfil = async () => {
        setLoading(true);
        try {
            const data = await api.get('/api/parametres/get.php');
            if (data.success) {
                const p = data.data.profil;
                setForm({ boutique: p.boutique||'', nom: p.nom||'', prenom: p.prenom||'', email: p.email||'', tel: p.tel||'', adresse: p.adresse||'', ville: p.ville_id||null, villeLabel: p.ville_nom||'', pack_nom: p.pack_nom||'' });
            }
        } catch (_) {}
        finally { setLoading(false); }
    };

    const fetchVilles = async () => {
        try {
            const data = await api.get('/api/villes/villes-list.php');
            if (data.success) setVilles(data.data);
        } catch (_) {}
    };

    const handleSave = async () => {
        if (!form.boutique || !form.nom || !form.prenom || !form.tel) {
            Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires.'); return;
        }
        setSaving(true);
        try {
            const data = await api.put('/api/parametres/update.php', {
                boutique: form.boutique, nom: form.nom, prenom: form.prenom,
                tel: form.tel, adresse: form.adresse, ville: form.ville,
            });
            if (data.success) Alert.alert('Succès', 'Profil mis à jour avec succès.');
            else Alert.alert('Erreur', data.message || 'Mise à jour échouée.');
        } catch (e) { Alert.alert('Erreur', e.message || 'Impossible de contacter le serveur.'); }
        finally { setSaving(false); }
    };

    const toggleBiometric = async (val) => {
        if (val) {
            const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Confirmer votre identité', cancelLabel: 'Annuler' });
            if (!result.success) return;
        }
        setBioEnabled(val);
        await AsyncStorage.setItem('biometric_enabled', val ? 'true' : 'false');
    };

    const filteredVilles = useMemo(() =>
        citySearch.trim() === '' ? villes : villes.filter(v => v.ville.toLowerCase().includes(citySearch.toLowerCase())),
        [citySearch, villes]
    );

    const planKey   = (form.pack_nom || '').toUpperCase().replace('É','E').replace('È','E');
    const planStyle = PLAN_COLORS[planKey] || PLAN_COLORS.GRATUIT;

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]}>
            <AppHeader
                session={session} darkMode={darkMode}
                onToggleDark={() => { const next = !darkMode; setDarkMode(next); saveDarkMode(next); }}
                onLogout={() => router.replace('/(auth)/login')}
            />

            {loading ? (
                <View style={styles.center}><ActivityIndicator color={TEAL} size="large" /></View>
            ) : (
                <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

                    {!isCommercant && (
                        <View style={{ backgroundColor: '#FEF3C7', borderRadius: 8, padding: 12, marginHorizontal: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Ionicons name="information-circle-outline" size={18} color="#92400E" />
                            <Text style={{ color: '#92400E', fontSize: 13, flex: 1 }}>
                                Les paramètres du compte sont en lecture seule. Contactez le propriétaire pour toute modification.
                            </Text>
                        </View>
                    )}

                    <View style={styles.avatarBlock}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{(form.prenom?.[0] || '?').toUpperCase()}</Text>
                        </View>
                        <Text style={[styles.avatarName, { color: T.text }]}>{form.prenom} {form.nom}</Text>
                        <View style={[styles.planBadge, { backgroundColor: planStyle.bg }]}>
                            <Text style={[styles.planText, { color: planStyle.text }]}>Pack {form.pack_nom || 'Gratuit'}</Text>
                        </View>
                    </View>

                    <View style={[styles.section, { backgroundColor: T.card, borderColor: T.border }]}>
                        <Text style={[styles.sectionTitle, { color: T.text }]}>
                            <Ionicons name="storefront-outline" size={14} color={TEAL} /> Informations boutique
                        </Text>
                        <Field label="Nom de la boutique *" value={form.boutique} onChangeText={v => updateField('boutique', v)} editable={isCommercant} T={T} />
                    </View>

                    <View style={[styles.section, { backgroundColor: T.card, borderColor: T.border }]}>
                        <Text style={[styles.sectionTitle, { color: T.text }]}>
                            <Ionicons name="person-outline" size={14} color={TEAL} /> Informations personnelles
                        </Text>
                        <Field label="Prénom *"  value={form.prenom} onChangeText={v => updateField('prenom', v)} editable={isCommercant} T={T} />
                        <Field label="Nom *"     value={form.nom}    onChangeText={v => updateField('nom', v)}    editable={isCommercant} T={T} />
                        <Field label="Email"     value={form.email}  editable={false} T={T} />
                        <Field label="Téléphone *" value={form.tel}  onChangeText={v => updateField('tel', v)} keyboardType="phone-pad" editable={isCommercant} T={T} />
                    </View>

                    <View style={[styles.section, { backgroundColor: T.card, borderColor: T.border }]}>
                        <Text style={[styles.sectionTitle, { color: T.text }]}>
                            <Ionicons name="location-outline" size={14} color={TEAL} /> Adresse
                        </Text>
                        <Field label="Adresse" value={form.adresse} onChangeText={v => updateField('adresse', v)} editable={isCommercant} T={T} />
                        <Text style={[styles.fieldLabel, { color: T.sub }]}>Ville</Text>
                        <TouchableOpacity
                            style={[styles.cityBtn, { backgroundColor: T.input, borderColor: T.border, opacity: isCommercant ? 1 : 0.5 }]}
                            onPress={() => { if (isCommercant) setCityModal(true); }}
                            disabled={!isCommercant}
                            activeOpacity={0.7}>
                            <Text style={{ fontSize: 14, color: form.villeLabel ? T.text : T.sub }}>{form.villeLabel || 'Sélectionner une ville'}</Text>
                            <Ionicons name="chevron-down" size={16} color={T.sub} />
                        </TouchableOpacity>
                    </View>

                    {isCommercant && (
                        <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving} activeOpacity={0.8}>
                            {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Enregistrer les modifications</Text>}
                        </TouchableOpacity>
                    )}

                    <View style={[styles.section, { backgroundColor: T.card, borderColor: T.border }]}>
                        <Text style={[styles.sectionTitle, { color: T.text }]}>
                            <Ionicons name="shield-checkmark-outline" size={14} color={TEAL} /> Sécurité
                        </Text>
                        <TouchableOpacity style={styles.linkRow} onPress={() => router.push('/(auth)/forgot-password')} activeOpacity={0.7}>
                            <Ionicons name="lock-closed-outline" size={18} color={T.sub} />
                            <Text style={[styles.linkText, { color: T.text }]}>Changer le mot de passe</Text>
                            <Ionicons name="chevron-forward" size={16} color={T.border} style={{ marginLeft: 'auto' }} />
                        </TouchableOpacity>
                        {bioAvailable && (
                            <View style={[styles.linkRow, { marginTop: 12 }]}>
                                <Ionicons name="finger-print-outline" size={18} color={T.sub} />
                                <Text style={[styles.linkText, { color: T.text }]}>Connexion par empreinte digitale</Text>
                                <Switch
                                    value={bioEnabled}
                                    onValueChange={toggleBiometric}
                                    trackColor={{ false: T.border, true: TEAL_BG }}
                                    thumbColor={bioEnabled ? TEAL : '#9CA3AF'}
                                    style={{ marginLeft: 'auto' }}
                                />
                            </View>
                        )}
                    </View>

                    <TouchableOpacity style={styles.logoutBtn} onPress={() => {
                        Alert.alert('Déconnexion', 'Voulez-vous vraiment vous déconnecter ?', [
                            { text: 'Annuler', style: 'cancel' },
                            { text: 'Déconnexion', style: 'destructive', onPress: () => router.replace('/(auth)/login') },
                        ]);
                    }} activeOpacity={0.8}>
                        <Ionicons name="log-out-outline" size={18} color="#DC2626" />
                        <Text style={styles.logoutText}>Se déconnecter</Text>
                    </TouchableOpacity>

                    <View style={{ height: 24 }} />
                </ScrollView>
            )}

            <Modal visible={cityModal} animationType="slide" transparent onRequestClose={() => setCityModal(false)}>
                <Pressable style={styles.modalOverlay} onPress={() => setCityModal(false)}>
                    <Pressable style={[styles.modalPanel, { backgroundColor: T.card }]} onPress={() => {}}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: T.text }]}>Choisir une ville</Text>
                            <TouchableOpacity onPress={() => setCityModal(false)}>
                                <Ionicons name="close" size={22} color={T.sub} />
                            </TouchableOpacity>
                        </View>
                        <TextInput
                            style={[styles.citySearch, { backgroundColor: T.input, color: T.text, borderColor: T.border }]}
                            placeholder="Rechercher..."
                            placeholderTextColor={T.sub}
                            value={citySearch}
                            onChangeText={setCitySearch}
                        />
                        <FlatList
                            data={filteredVilles}
                            keyExtractor={item => String(item.id)}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[styles.cityItem, { borderBottomColor: T.border }, form.ville === item.id && { backgroundColor: TEAL_BG, paddingHorizontal: 8, borderRadius: 8 }]}
                                    onPress={() => { updateField('ville', item.id); updateField('villeLabel', item.ville); setCityModal(false); setCitySearch(''); }}
                                >
                                    <Text style={[styles.cityItemText, { color: T.text }, form.ville === item.id && { color: TEAL, fontWeight: '600' }]}>{item.ville}</Text>
                                    {form.ville === item.id && <Ionicons name="checkmark" size={16} color={TEAL} />}
                                </TouchableOpacity>
                            )}
                        />
                    </Pressable>
                </Pressable>
            </Modal>

            <AppFooter darkMode={darkMode} />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe:         { flex: 1 },
    scroll:       { padding: 16 },
    center:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
    avatarBlock:  { alignItems: 'center', marginBottom: 20, marginTop: 8 },
    avatar:       { width: 72, height: 72, borderRadius: 36, backgroundColor: TEAL_BG, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    avatarText:   { fontSize: 28, fontWeight: '700', color: TEAL },
    avatarName:   { fontSize: 16, fontWeight: '700', marginBottom: 6 },
    planBadge:    { paddingHorizontal: 14, paddingVertical: 4, borderRadius: 12 },
    planText:     { fontSize: 12, fontWeight: '600' },
    section:      { borderRadius: 12, padding: 14, borderWidth: 1, marginBottom: 14 },
    sectionTitle: { fontSize: 13, fontWeight: '700', marginBottom: 12 },
    fieldWrap:    { marginBottom: 12 },
    fieldLabel:   { fontSize: 12, marginBottom: 4, fontWeight: '500' },
    fieldInput:   { borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
    cityBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
    saveBtn:      { backgroundColor: TEAL, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginBottom: 14 },
    saveBtnText:  { color: '#fff', fontSize: 15, fontWeight: '700' },
    linkRow:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
    linkText:     { fontSize: 14 },
    logoutBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FEE2E2', borderRadius: 10, paddingVertical: 14, marginBottom: 14 },
    logoutText:   { fontSize: 15, fontWeight: '600', color: '#DC2626' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalPanel:   { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '75%', padding: 16 },
    modalHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    modalTitle:   { fontSize: 16, fontWeight: '700' },
    citySearch:   { borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, marginBottom: 10 },
    cityItem:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1 },
    cityItemText: { fontSize: 14 },
});