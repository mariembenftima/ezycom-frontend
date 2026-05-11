import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_URL } from '../../config';
import { loadSession } from '../../utils/auth';
import AppFooter from '../components/AppFooter';
import AppHeader from '../components/AppHeader';

const TEAL    = '#29B6D8';
const TEAL_BG = '#E8F8FC';
const BORDER  = '#E5E7EB';
const GRAY    = '#6B7280';

const Field = ({ label, value, onChangeText, placeholder, keyboardType = 'default', editable = true }) => (
    <View style={styles.fieldWrap}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <TextInput
            style={[styles.fieldInput, !editable && styles.fieldDisabled]}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder || label}
            placeholderTextColor="#9CA3AF"
            keyboardType={keyboardType}
            editable={editable}
        />
    </View>
);

export default function ParametresScreen() {
    const [session,    setSession]    = useState(null);
    const [darkMode,   setDarkMode]   = useState(false);
    const [token,      setToken]      = useState(null);
    const [loading,    setLoading]    = useState(true);
    const [saving,     setSaving]     = useState(false);

    const [form, setForm] = useState({
        boutique: '', nom: '', prenom: '', email: '',
        tel: '', adresse: '', ville: null, villeLabel: '',
        pack_nom: '',
    });

    const [villes,           setVilles]           = useState([]);
    const [cityModal,        setCityModal]         = useState(false);
    const [citySearch,       setCitySearch]        = useState('');

    const updateField = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

    useFocusEffect(
        useCallback(() => {
            (async () => {
                const s = await loadSession();
                if (!s?.token) { router.replace('/(auth)/login'); return; }
                setSession(s);
                setToken(s.token);
                await Promise.all([fetchProfil(s.token), fetchVilles()]);
            })();
        }, [])
    );

    const fetchProfil = async (tok) => {
        setLoading(true);
        try {
            const res  = await fetch(`${API_URL}/api/parametres`, { headers: { 'X-Token': tok } });
            const data = await res.json();
            if (data.success) {
                const p = data.data.profil;
                setForm({
                    boutique:   p.boutique   || '',
                    nom:        p.nom        || '',
                    prenom:     p.prenom     || '',
                    email:      p.email      || '',
                    tel:        p.tel        || '',
                    adresse:    p.adresse    || '',
                    ville:      p.ville_id   || null,
                    villeLabel: p.ville_nom  || '',
                    pack_nom:   p.pack_nom   || '',
                });
            }
        } catch (_) {}
        finally { setLoading(false); }
    };

    const fetchVilles = async () => {
        try {
            const res  = await fetch(`${API_URL}/api/villes`);
            const data = await res.json();
            if (data.success) setVilles(data.data);
        } catch (_) {}
    };

    const handleSave = async () => {
        if (!form.boutique || !form.nom || !form.prenom || !form.tel) {
            Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires.');
            return;
        }
        setSaving(true);
        try {
            const res  = await fetch(`${API_URL}/api/parametres`, {
                method:  'PUT',
                headers: { 'Content-Type': 'application/json', 'X-Token': token },
                body: JSON.stringify({
                    boutique: form.boutique,
                    nom:      form.nom,
                    prenom:   form.prenom,
                    tel:      form.tel,
                    adresse:  form.adresse,
                    ville:    form.ville,
                }),
            });
            const data = await res.json();
            if (data.success) {
                Alert.alert('Succès', 'Profil mis à jour avec succès.');
            } else {
                Alert.alert('Erreur', data.message || 'Mise à jour échouée.');
            }
        } catch (_) {
            Alert.alert('Erreur', 'Impossible de contacter le serveur.');
        }
        finally { setSaving(false); }
    };

    const filteredVilles = useMemo(() =>
        citySearch.trim() === ''
            ? villes
            : villes.filter(v => v.ville.toLowerCase().includes(citySearch.toLowerCase())),
        [citySearch, villes]
    );

    const PLAN_COLORS = {
        GRATUIT:    { bg: '#E8EEF4', text: '#6A7A8A' },
        ESSOR:      { bg: '#E8F5E9', text: '#2E7D32' },
        PROSPERITE: { bg: '#FFF3E0', text: '#E65100' },
        EMPIRE:     { bg: '#FFF0ED', text: '#C0392B' },
    };
    const planKey   = (form.pack_nom || '').toUpperCase().replace('É', 'E').replace('È', 'E');
    const planStyle = PLAN_COLORS[planKey] || PLAN_COLORS.GRATUIT;

    return (
        <SafeAreaView style={styles.safe}>
            <AppHeader
                session={session}
                darkMode={darkMode}
                onToggleDark={() => setDarkMode(d => !d)}
                onLogout={() => router.replace('/(auth)/login')}
            />

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator color={TEAL} size="large" />
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

                    <View style={styles.avatarBlock}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>
                                {(form.prenom?.[0] || '?').toUpperCase()}
                            </Text>
                        </View>
                        <Text style={styles.avatarName}>{form.prenom} {form.nom}</Text>
                        <View style={[styles.planBadge, { backgroundColor: planStyle.bg }]}>
                            <Text style={[styles.planText, { color: planStyle.text }]}>
                                Pack {form.pack_nom || 'Gratuit'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>
                            <Ionicons name="storefront-outline" size={14} color={TEAL} /> Informations boutique
                        </Text>
                        <Field label="Nom de la boutique *" value={form.boutique} onChangeText={v => updateField('boutique', v)} />
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>
                            <Ionicons name="person-outline" size={14} color={TEAL} /> Informations personnelles
                        </Text>
                        <Field label="Prénom *"       value={form.prenom}  onChangeText={v => updateField('prenom', v)} />
                        <Field label="Nom *"          value={form.nom}     onChangeText={v => updateField('nom', v)} />
                        <Field label="Email"          value={form.email}   editable={false} />
                        <Field label="Téléphone *"    value={form.tel}     onChangeText={v => updateField('tel', v)} keyboardType="phone-pad" />
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>
                            <Ionicons name="location-outline" size={14} color={TEAL} /> Adresse
                        </Text>
                        <Field label="Adresse" value={form.adresse} onChangeText={v => updateField('adresse', v)} />

                        <Text style={styles.fieldLabel}>Ville</Text>
                        <TouchableOpacity style={styles.cityBtn} onPress={() => setCityModal(true)} activeOpacity={0.7}>
                            <Text style={form.villeLabel ? styles.cityBtnText : styles.cityBtnPlaceholder}>
                                {form.villeLabel || 'Sélectionner une ville'}
                            </Text>
                            <Ionicons name="chevron-down" size={16} color={GRAY} />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                        onPress={handleSave}
                        disabled={saving}
                        activeOpacity={0.8}
                    >
                        {saving
                            ? <ActivityIndicator color="#fff" size="small" />
                            : <Text style={styles.saveBtnText}>Enregistrer les modifications</Text>
                        }
                    </TouchableOpacity>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>
                            <Ionicons name="shield-checkmark-outline" size={14} color={TEAL} /> Sécurité
                        </Text>
                        <TouchableOpacity
                            style={styles.linkRow}
                            onPress={() => router.push('/(auth)/forgot-password')}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="lock-closed-outline" size={18} color={GRAY} />
                            <Text style={styles.linkText}>Changer le mot de passe</Text>
                            <Ionicons name="chevron-forward" size={16} color={BORDER} style={{ marginLeft: 'auto' }} />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={styles.logoutBtn}
                        onPress={() => {
                            Alert.alert('Déconnexion', 'Voulez-vous vraiment vous déconnecter ?', [
                                { text: 'Annuler', style: 'cancel' },
                                { text: 'Déconnexion', style: 'destructive', onPress: () => router.replace('/(auth)/login') },
                            ]);
                        }}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="log-out-outline" size={18} color="#DC2626" />
                        <Text style={styles.logoutText}>Se déconnecter</Text>
                    </TouchableOpacity>

                    <View style={{ height: 24 }} />
                </ScrollView>
            )}

            <Modal visible={cityModal} animationType="slide" transparent onRequestClose={() => setCityModal(false)}>
                <Pressable style={styles.modalOverlay} onPress={() => setCityModal(false)}>
                    <Pressable style={styles.modalPanel} onPress={() => {}}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Choisir une ville</Text>
                            <TouchableOpacity onPress={() => setCityModal(false)}>
                                <Ionicons name="close" size={22} color={GRAY} />
                            </TouchableOpacity>
                        </View>
                        <TextInput
                            style={styles.citySearch}
                            placeholder="Rechercher..."
                            placeholderTextColor="#9CA3AF"
                            value={citySearch}
                            onChangeText={setCitySearch}
                        />
                        <FlatList
                            data={filteredVilles}
                            keyExtractor={item => String(item.id)}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[styles.cityItem, form.ville === item.id && styles.cityItemActive]}
                                    onPress={() => {
                                        updateField('ville', item.id);
                                        updateField('villeLabel', item.ville);
                                        setCityModal(false);
                                        setCitySearch('');
                                    }}
                                >
                                    <Text style={[styles.cityItemText, form.ville === item.id && { color: TEAL, fontWeight: '600' }]}>
                                        {item.ville}
                                    </Text>
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
    safe:               { flex: 1, backgroundColor: '#F9FAFB' },
    scroll:             { padding: 16 },
    center:             { flex: 1, alignItems: 'center', justifyContent: 'center' },

    avatarBlock:        { alignItems: 'center', marginBottom: 20, marginTop: 8 },
    avatar:             { width: 72, height: 72, borderRadius: 36, backgroundColor: TEAL_BG, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    avatarText:         { fontSize: 28, fontWeight: '700', color: TEAL },
    avatarName:         { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 6 },
    planBadge:          { paddingHorizontal: 14, paddingVertical: 4, borderRadius: 12 },
    planText:           { fontSize: 12, fontWeight: '600' },

    section:            { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: BORDER, marginBottom: 14 },
    sectionTitle:       { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 12 },

    fieldWrap:          { marginBottom: 12 },
    fieldLabel:         { fontSize: 12, color: GRAY, marginBottom: 4, fontWeight: '500' },
    fieldInput:         { backgroundColor: '#F9FAFB', borderRadius: 8, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#111827' },
    fieldDisabled:      { backgroundColor: '#F3F4F6', color: GRAY },

    cityBtn:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F9FAFB', borderRadius: 8, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 12, paddingVertical: 10 },
    cityBtnText:        { fontSize: 14, color: '#111827' },
    cityBtnPlaceholder: { fontSize: 14, color: '#9CA3AF' },

    saveBtn:            { backgroundColor: TEAL, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginBottom: 14 },
    saveBtnText:        { color: '#fff', fontSize: 15, fontWeight: '700' },

    linkRow:            { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
    linkText:           { fontSize: 14, color: '#111827' },

    logoutBtn:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FEE2E2', borderRadius: 10, paddingVertical: 14, marginBottom: 14 },
    logoutText:         { fontSize: 15, fontWeight: '600', color: '#DC2626' },

    modalOverlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalPanel:         { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '75%', padding: 16 },
    modalHeader:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    modalTitle:         { fontSize: 16, fontWeight: '700', color: '#111827' },
    citySearch:         { backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, color: '#111827', marginBottom: 10 },
    cityItem:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    cityItemActive:     { backgroundColor: TEAL_BG, paddingHorizontal: 8, borderRadius: 8 },
    cityItemText:       { fontSize: 14, color: '#111827' },
});