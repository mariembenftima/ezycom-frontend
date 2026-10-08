import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

import { API_URL } from '../../config';
import { loadDarkMode } from '../../utils/darkMode';
import { DARK, LIGHT } from '../../utils/theme';
const TEAL      = '#29B6D8';
const TEAL_LIGHT = 'rgba(41,182,216,0.08)';

export default function RegisterScreen() {
    const [selectedPlan,     setSelectedPlan]     = useState(null);
    const [plans,            setPlans]            = useState([]);
    const [villes,           setVilles]           = useState([]);
    const [loadingInit,      setLoadingInit]      = useState(true);
    const [showPassword,     setShowPassword]     = useState(false);
    const [acceptCGU,        setAcceptCGU]        = useState(false);
    const [cityModalVisible, setCityModalVisible] = useState(false);
    const [citySearch,       setCitySearch]       = useState('');
    const [submitting,       setSubmitting]       = useState(false);
    const [darkMode,         setDarkMode]         = useState(false);
    const [form, setForm] = useState({
        fullName: '', shopName: '', cityId: null, cityLabel: '',
        address: '', phone: '', email: '', password: '',
    });

    const T = darkMode ? DARK : LIGHT;

    const updateField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

    useEffect(() => { loadDarkMode().then(setDarkMode); }, []);

    useEffect(() => {
        const load = async () => {
            try {
                const [rPacks, rVilles] = await Promise.all([
                    fetch(`${API_URL}/api/packs/packs-list.php`),
                    fetch(`${API_URL}/api/villes/villes-list.php`),
                ]);
                const dPacks  = await rPacks.json();
                const dVilles = await rVilles.json();
                if (dPacks.success)  setPlans(dPacks.data);
                if (dVilles.success) setVilles(dVilles.data);
                if (dPacks.success && dPacks.data.length > 0) setSelectedPlan(dPacks.data[0].id);
            } catch {}
            finally { setLoadingInit(false); }
        };
        load();
    }, []);

    const filteredVilles = useMemo(() =>
        citySearch.trim() === ''
            ? villes
            : villes.filter(v => v.ville.toLowerCase().includes(citySearch.toLowerCase())),
        [citySearch, villes]
    );

    const handleRegister = async () => {
        if (!form.fullName || !form.shopName || !form.cityId || !form.phone || !form.email || !form.password) {
            alert('Veuillez remplir tous les champs obligatoires.');
            return;
        }
        if (!acceptCGU) { alert('Veuillez accepter les CGU.'); return; }

        setSubmitting(true);
        try {
            const res  = await fetch(`${API_URL}/api/auth/register.php`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    boutique: form.shopName,
                    nom:      form.fullName.split(' ').slice(1).join(' ') || form.fullName,
                    prenom:   form.fullName.split(' ')[0],
                    email:    form.email,
                    tel:      form.phone,
                    password: form.password,
                    ville:    form.cityId,
                    adresse:  form.address,
                    pack:     selectedPlan,
                }),
            });
            const data = await res.json();
            if (data.success) {
                router.push('/(auth)/login');
            } else {
                alert(data.message);
            }
        } catch {
            alert('Erreur de connexion au serveur.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loadingInit) {
        return (
            <View style={[styles.loaderScreen, { backgroundColor: T.bg }]}>
                <ActivityIndicator size="large" color={TEAL} />
            </View>
        );
    }

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]}>
            <StatusBar barStyle={T.barStyle} backgroundColor={T.statusBg} />
            <ScrollView
                contentContainerStyle={styles.scroll}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <Text style={[styles.pageTitle, { color: T.text }]}>Choisissez votre plan</Text>

                <View style={styles.planGrid}>
                    {plans.map(plan => {
                        const isSelected = selectedPlan === plan.id;
                        return (
                            <TouchableOpacity
                                key={plan.id}
                                style={[styles.planCard, { backgroundColor: T.card, borderColor: T.border }, isSelected && styles.planCardSelected]}
                                onPress={() => setSelectedPlan(plan.id)}
                                activeOpacity={0.85}
                            >
                                <Text style={[styles.planName, { color: T.text }, isSelected && styles.planNameSelected]}>
                                    {plan.nom}
                                </Text>
                                <Text style={[styles.planFeature, { color: T.sub }]}>{plan.nb_produit} produits</Text>
                                <Text style={[styles.planFeature, { color: T.sub }]}>{plan.nb_cmd} commandes/mois</Text>
                                <Text style={[styles.planFeature, { color: T.sub }]}>{plan.nb_user} utilisateur(s)</Text>
                                <View style={styles.priceRow}>
                                    <Text style={[styles.planPrice, { color: T.text }, isSelected && styles.planPriceSelected]}>
                                        {plan.prix}
                                    </Text>
                                    <View style={styles.priceMeta}>
                                        <Text style={[styles.planCurrency, { color: T.sub }]}>DT</Text>
                                        <Text style={[styles.planUnit, { color: T.sub }]}>HT/mois</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <TouchableOpacity style={styles.compareRow} onPress={() => router.push('/(auth)/packs')}>
                    <Text style={styles.compareText}>Comparer nos packs</Text>
                </TouchableOpacity>

                <Text style={[styles.sectionTitle, { color: T.text }]}>Informations personnelles</Text>

                <View style={styles.row}>
                    <TextInput
                        style={[styles.input, styles.inputHalf, { backgroundColor: T.searchBg, color: T.text }]}
                        placeholder="Nom & Prénom"
                        placeholderTextColor={T.sub}
                        value={form.fullName}
                        onChangeText={v => updateField('fullName', v)}
                    />
                    <TextInput
                        style={[styles.input, styles.inputHalf, { backgroundColor: T.searchBg, color: T.text }]}
                        placeholder="Nom du Boutique"
                        placeholderTextColor={T.sub}
                        value={form.shopName}
                        onChangeText={v => updateField('shopName', v)}
                    />
                </View>

                <View style={styles.row}>
                    <TouchableOpacity
                        style={[styles.input, styles.inputHalf, styles.pickerInput, { backgroundColor: T.searchBg }]}
                        onPress={() => { setCitySearch(''); setCityModalVisible(true); }}
                    >
                        <Text style={form.cityLabel ? [styles.pickerText, { color: T.text }] : [styles.pickerPlaceholder, { color: T.sub }]}>
                            {form.cityLabel || 'Sélectionnez une ville'}
                        </Text>
                        <Ionicons name="chevron-down" size={14} color={T.sub} />
                    </TouchableOpacity>
                    <TextInput
                        style={[styles.input, styles.inputHalf, { backgroundColor: T.searchBg, color: T.text }]}
                        placeholder="Adresse Complète"
                        placeholderTextColor={T.sub}
                        value={form.address}
                        onChangeText={v => updateField('address', v)}
                    />
                </View>

                <TextInput
                    style={[styles.input, { backgroundColor: T.searchBg, color: T.text }]}
                    placeholder="Numéro de téléphone"
                    placeholderTextColor={T.sub}
                    keyboardType="phone-pad"
                    value={form.phone}
                    onChangeText={v => updateField('phone', v)}
                />

                <View style={styles.row}>
                    <TextInput
                        style={[styles.input, styles.inputHalf, { backgroundColor: T.searchBg, color: T.text }]}
                        placeholder="Email"
                        placeholderTextColor={T.sub}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={form.email}
                        onChangeText={v => updateField('email', v)}
                    />
                    <View style={[styles.input, styles.inputHalf, styles.passwordWrap, { backgroundColor: T.searchBg }]}>
                        <TextInput
                            style={[styles.passwordInput, { color: T.text }]}
                            placeholder="Mot de passe"
                            placeholderTextColor={T.sub}
                            secureTextEntry={!showPassword}
                            autoCapitalize="none"
                            value={form.password}
                            onChangeText={v => updateField('password', v)}
                        />
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                            <Ionicons
                                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                size={18}
                                color={T.sub}
                            />
                        </TouchableOpacity>
                    </View>
                </View>

                <TouchableOpacity style={styles.cguRow} onPress={() => setAcceptCGU(!acceptCGU)}>
                    <View style={[styles.checkbox, { borderColor: T.border }, acceptCGU && styles.checkboxChecked]}>
                        {acceptCGU && <Ionicons name="checkmark" size={12} color="#fff" />}
                    </View>
                    <Text style={[styles.cguText, { color: T.sub }]}>
                        J'accepte les{' '}
                        <Text style={{ color: TEAL, fontWeight: '700' }}>conditions générales d'utilisation</Text>
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.submitBtn, (!acceptCGU || submitting) && styles.submitBtnDisabled]}
                    onPress={handleRegister}
                    disabled={!acceptCGU || submitting}
                >
                    {submitting
                        ? <ActivityIndicator color="#fff" />
                        : <Text style={styles.submitText}>Créer mon compte</Text>
                    }
                </TouchableOpacity>

                <Text style={[styles.loginText, { color: T.sub }]}>
                    Déjà un compte ?{' '}
                    <Text style={styles.loginLink} onPress={() => router.push('/(auth)/login')}>
                        Se connecter
                    </Text>
                </Text>
            </ScrollView>

            <Modal visible={cityModalVisible} transparent animationType="slide" onRequestClose={() => setCityModalVisible(false)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setCityModalVisible(false)} />
                <View style={[styles.modalSheet, { backgroundColor: T.card }]}>
                    <View style={[styles.modalHeader, { borderBottomColor: T.border }]}>
                        <Text style={[styles.modalTitle, { color: T.text }]}>Choisir une ville</Text>
                        <TouchableOpacity onPress={() => setCityModalVisible(false)}>
                            <Ionicons name="close" size={22} color={T.sub} />
                        </TouchableOpacity>
                    </View>
                    <View style={[styles.searchWrap, { backgroundColor: T.searchBg }]}>
                        <Ionicons name="search-outline" size={16} color={T.sub} style={{ marginRight: 8 }} />
                        <TextInput
                            style={[styles.searchInput, { color: T.text }]}
                            placeholder="Rechercher..."
                            placeholderTextColor={T.sub}
                            value={citySearch}
                            onChangeText={setCitySearch}
                            autoFocus
                        />
                    </View>
                    <FlatList
                        data={filteredVilles}
                        keyExtractor={item => String(item.id)}
                        ItemSeparatorComponent={() => <View style={[styles.citySeparator, { backgroundColor: T.border }]} />}
                        ListEmptyComponent={<Text style={[styles.noResult, { color: T.sub }]}>Aucune ville trouvée</Text>}
                        renderItem={({ item }) => {
                            const isSelected = form.cityId === item.id;
                            return (
                                <TouchableOpacity
                                    style={[styles.cityItem, isSelected && styles.cityItemSelected]}
                                    onPress={() => {
                                        updateField('cityId', item.id);
                                        updateField('cityLabel', item.ville);
                                        setCityModalVisible(false);
                                    }}
                                >
                                    <Ionicons
                                        name={isSelected ? 'location' : 'location-outline'}
                                        size={18}
                                        color={isSelected ? TEAL : T.sub}
                                        style={{ marginRight: 12 }}
                                    />
                                    <Text style={[styles.cityItemText, { color: T.text }, isSelected && styles.cityItemTextSelected]}>
                                        {item.ville}
                                    </Text>
                                    {isSelected && <Ionicons name="checkmark" size={16} color={TEAL} style={{ marginLeft: 'auto' }} />}
                                </TouchableOpacity>
                            );
                        }}
                    />
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe:        { flex: 1, backgroundColor: '#fff' },
    loaderScreen:{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
    scroll:      { padding: 20, paddingBottom: 40 },

    pageTitle: { fontSize: 20, fontWeight: '800', color: '#1a202c', marginBottom: 16 },

    planGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
    planCard: {
        width: '47%', borderRadius: 14, borderWidth: 1.5, borderColor: '#e2e8f0',
        padding: 12, backgroundColor: '#fff', overflow: 'hidden',
    },
    planCardSelected: { borderColor: TEAL, backgroundColor: TEAL_LIGHT },
    planName:         { fontSize: 15, fontWeight: '700', color: '#1a202c', marginBottom: 4 },
    planNameSelected: { color: TEAL },
    planFeature:      { fontSize: 11, color: '#64748b', lineHeight: 17 },
    priceRow:         { flexDirection: 'row', alignItems: 'flex-end', marginTop: 8, gap: 4 },
    planPrice:        { fontSize: 32, fontWeight: '800', color: '#1a202c', lineHeight: 36 },
    planPriceSelected:{ color: TEAL },
    priceMeta:        { marginBottom: 2 },
    planCurrency:     { fontSize: 13, fontWeight: '700', color: '#475569' },
    planUnit:         { fontSize: 10, color: '#94a3b8' },

    compareRow: { alignItems: 'center', marginVertical: 14 },
    compareText:{ color: TEAL, fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' },

    sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1a202c', marginBottom: 14 },

    row:      { flexDirection: 'row', gap: 10, marginBottom: 10 },
    input:    { backgroundColor: '#f0f4f8', borderRadius: 10, height: 46, paddingHorizontal: 14, fontSize: 13, color: '#1a202c', marginBottom: 10, justifyContent: 'center' },
    inputHalf:{ flex: 1, marginBottom: 0 },
    pickerInput:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 12 },
    pickerPlaceholder: { color: '#b0b8c1', fontSize: 13 },
    pickerText:   { color: '#1a202c', fontSize: 13 },
    passwordWrap: { flexDirection: 'row', alignItems: 'center', paddingRight: 12, marginBottom: 0 },
    passwordInput:{ flex: 1, fontSize: 13, color: '#1a202c', height: '100%' },

    cguRow:        { flexDirection: 'row', alignItems: 'center', marginBottom: 20, marginTop: 4 },
    checkbox:      { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: '#b0b8c1', marginRight: 8, alignItems: 'center', justifyContent: 'center' },
    checkboxChecked:{ backgroundColor: TEAL, borderColor: TEAL },
    cguText:       { fontSize: 12, color: '#64748b', flex: 1 },

    submitBtn:        { backgroundColor: TEAL, borderRadius: 30, height: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 18, shadowColor: TEAL, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6 },
    submitBtnDisabled:{ opacity: 0.55 },
    submitText:       { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },

    loginText: { textAlign: 'center', fontSize: 12, color: '#64748b' },
    loginLink: { color: TEAL, fontWeight: '700' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
    modalSheet:   { backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: '72%', paddingBottom: Platform.OS === 'android' ? 20 : 0 },
    modalHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    modalTitle:   { fontSize: 16, fontWeight: '700', color: '#1a202c' },
    searchWrap:   { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f4f8', marginHorizontal: 16, marginVertical: 12, borderRadius: 10, paddingHorizontal: 12, height: 42 },
    searchInput:  { flex: 1, fontSize: 13, color: '#1a202c' },
    cityItem:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 13 },
    cityItemSelected: { backgroundColor: TEAL_LIGHT },
    cityItemText:     { fontSize: 14, color: '#334155' },
    cityItemTextSelected: { color: TEAL, fontWeight: '600' },
    citySeparator:    { height: 1, backgroundColor: '#f1f5f9', marginLeft: 46 },
    noResult:         { textAlign: 'center', color: '#94a3b8', fontSize: 13, paddingVertical: 30 },
});