import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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
import api from '../../utils/api';
import { loadSession } from '../../utils/auth';
import { loadDarkMode, saveDarkMode } from '../../utils/darkMode';
import { DARK, LIGHT } from '../../utils/theme';
import AppFooter from '../components/AppFooter';
import AppHeader from '../components/AppHeader';

const LIGHT_EXT = { ...LIGHT, cardBorder: '#E8EEF4', input: '#F0F6FA', inputBorder: '#DDE8F0', label: '#4A6A8A', subText: LIGHT.sub };
const DARK_EXT  = { ...DARK,  cardBorder: '#1E3A50', input: '#152D42', inputBorder: '#1E3A50', label: '#7AAAC0', subText: DARK.sub };

const GOUVERNERATS = [
    'Ariana','Béja','Ben Arous','Bizerte','Gabès','Gafsa','Jendouba','Kairouan',
    'Kasserine','Kébili','Kef','Mahdia','Manouba','Médenine','Monastir','Nabeul',
    'Sfax','Sidi Bouzid','Siliana','Sousse','Tataouine','Tozeur','Tunis','Zaghouan',
];

export default function AjouterCommande() {
    const [session,      setSession]      = useState(null);
    const [darkMode,     setDarkMode]     = useState(false);
    const [loading,      setLoading]      = useState(true);
    const [submitting,   setSubmitting]   = useState(false);
    const [products,     setProducts]     = useState([]);
    const [villes,       setVilles]       = useState([]);
    const [form,         setForm]         = useState({
        nom: '', prenom: '', tel: '', tel2: '', remarque: '',
        gouvernerat: '', ville: '', villeId: null, adresse: '',
    });
    const [items,        setItems]        = useState([
        { id: Date.now(), productId: null, productNom: '', prix: '', qte: 1 },
    ]);
    const [gouvModal,    setGouModal]     = useState(false);
    const [villeModal,   setVilleModal]   = useState(false);
    const [villeSearch,  setVilleSearch]  = useState('');
    const [prodModal,    setProdModal]    = useState(false);
    const [prodSearch,   setProdSearch]   = useState('');
    const [activeItemId, setActiveItemId] = useState(null);

    useEffect(() => { loadDarkMode().then(setDarkMode); }, []);

    const T = darkMode ? DARK_EXT : LIGHT_EXT;

    useEffect(() => {
        loadSession().then(s => {
            if (!s) { router.replace('/(auth)/login'); return; }
            setSession(s);
            Promise.all([fetchProducts(), fetchVilles()]).finally(() => setLoading(false));
        });
    }, []);

    const fetchProducts = async () => {
        try {
            const data = await api.get('/api/products/produits/products-list.php');
            if (data.success) {
                const list = data.data?.produits ?? data.data ?? [];
                setProducts(Array.isArray(list) ? list : []);
            }
        } catch (_) {}
    };

    const fetchVilles = async () => {
        try {
            const data = await api.get('/api/villes/villes-list.php');
            if (data.success) setVilles(Array.isArray(data.data) ? data.data : []);
        } catch (_) {}
    };

    const updateForm  = (key, val) => setForm(prev => ({ ...prev, [key]: val }));
    const updateItem  = (id, key, val) => setItems(prev => prev.map(it => it.id === id ? { ...it, [key]: val } : it));
    const changeQty   = (id, delta) => setItems(prev => prev.map(it => it.id === id ? { ...it, qte: Math.max(1, it.qte + delta) } : it));
    const addItem     = () => setItems(prev => [...prev, { id: Date.now(), productId: null, productNom: '', prix: '', qte: 1 }]);
    const removeItem  = (id) => setItems(prev => prev.filter(it => it.id !== id));

    const openProdModal = (itemId) => { setActiveItemId(itemId); setProdSearch(''); setProdModal(true); };
    const selectProduct = (p) => {
        setItems(prev => prev.map(it => it.id === activeItemId ? { ...it, productId: p.id, productNom: p.nom, prix: String(p.prix || '') } : it));
        setProdModal(false);
    };

    const filteredVilles = useMemo(() =>
        villes.filter(v => villeSearch === '' || v.ville.toLowerCase().includes(villeSearch.toLowerCase())),
        [villes, villeSearch]
    );

    const filteredProds = useMemo(() =>
        products.filter(p => prodSearch === '' || p.nom.toLowerCase().includes(prodSearch.toLowerCase())),
        [products, prodSearch]
    );

    const total = items.reduce((sum, it) => sum + (parseFloat(it.prix) || 0) * it.qte, 0);

    const handleSubmit = async () => {
        if (!form.nom.trim()) { Alert.alert('Erreur', 'Le nom est obligatoire.'); return; }
        if (!form.tel.trim()) { Alert.alert('Erreur', 'Le téléphone est obligatoire.'); return; }
        if (items.some(it => !it.productId)) { Alert.alert('Erreur', 'Sélectionnez un produit pour chaque ligne.'); return; }

        setSubmitting(true);
        try {
            const data = await api.post('/api/orders/orders-create.php', {
                nom: form.nom, prenom: form.prenom, tel: form.tel, tel2: form.tel2,
                msg: form.remarque, gouvernerat: form.gouvernerat,
                ville: form.villeId, adresse: form.adresse,
                items: items.map(it => ({ id_prod: it.productId, qte: it.qte, prix: parseFloat(it.prix) || 0 })),
            });
            if (data.success) {
                Alert.alert('Succès', 'Commande ajoutée avec succès.', [
                    { text: 'OK', onPress: () => router.replace('/(merchant)/commandes/detail') },
                ]);
            } else {
                Alert.alert('Erreur', data.message || 'Erreur lors de la création.');
            }
        } catch (_) {
            Alert.alert('Erreur', 'Impossible de contacter le serveur.');
        } finally { setSubmitting(false); }
    };

    if (loading) return (
        <View style={[s.center, { backgroundColor: T.bg }]}>
            <ActivityIndicator size="large" color="#29B6D8" />
        </View>
    );

    return (
        <SafeAreaView style={[s.safe, { backgroundColor: T.bg }]}>
            <AppHeader
                session={session} darkMode={darkMode}
                onToggleDark={() => { const next = !darkMode; setDarkMode(next); saveDarkMode(next); }}
                onLogout={() => router.replace('/(auth)/login')}
            />

            <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={s.pageTitleRow}>
                    <Text style={[s.pageTitle, { color: T.text }]}>Commandes</Text>
                    <Text style={[s.breadcrumb, { color: T.subText }]}>Dashboard › Commandes › Nouvelle commande</Text>
                </View>

                <View style={[s.card, { backgroundColor: T.card, borderColor: T.cardBorder }]}>
                    <Text style={[s.cardTitle, { color: T.text }]}>Coordonnées</Text>
                    <View style={s.row}>
                        <View style={s.half}>
                            <Text style={[s.label, { color: T.label }]}>Nom</Text>
                            <TextInput style={[s.input, { backgroundColor: T.input, borderColor: T.inputBorder, color: T.text }]} placeholder="Nom..." placeholderTextColor={T.subText} value={form.nom} onChangeText={v => updateForm('nom', v)} />
                        </View>
                        <View style={s.half}>
                            <Text style={[s.label, { color: T.label }]}>Prénom</Text>
                            <TextInput style={[s.input, { backgroundColor: T.input, borderColor: T.inputBorder, color: T.text }]} placeholder="Prénom..." placeholderTextColor={T.subText} value={form.prenom} onChangeText={v => updateForm('prenom', v)} />
                        </View>
                    </View>

                    <Text style={[s.label, { color: T.label }]}>Téléphone</Text>
                    <View style={[s.phoneWrap, { backgroundColor: T.input, borderColor: T.inputBorder }]}>
                        <Ionicons name="call-outline" size={18} color={T.subText} style={{ marginRight: 8 }} />
                        <Text style={[s.phonePrefix, { color: T.subText }]}>+216</Text>
                        <TextInput style={[s.phoneInput, { color: T.text }]} placeholder="..." placeholderTextColor={T.subText} keyboardType="phone-pad" value={form.tel} onChangeText={v => updateForm('tel', v)} />
                    </View>

                    <View style={s.row}>
                        <View style={s.half}>
                            <Text style={[s.label, { color: T.label }]}>Téléphone 2</Text>
                            <TextInput style={[s.input, { backgroundColor: T.input, borderColor: T.inputBorder, color: T.text }]} placeholder="Optionnel..." placeholderTextColor={T.subText} keyboardType="phone-pad" value={form.tel2} onChangeText={v => updateForm('tel2', v)} />
                        </View>
                        <View style={s.half}>
                            <Text style={[s.label, { color: T.label }]}>Remarque</Text>
                            <TextInput style={[s.input, { backgroundColor: T.input, borderColor: T.inputBorder, color: T.text }]} placeholder="Note..." placeholderTextColor={T.subText} value={form.remarque} onChangeText={v => updateForm('remarque', v)} />
                        </View>
                    </View>

                    <Text style={[s.label, { color: T.label }]}>Gouvernorat</Text>
                    <TouchableOpacity style={[s.picker, { backgroundColor: T.input, borderColor: T.inputBorder }]} onPress={() => setGouModal(true)} activeOpacity={0.7}>
                        <Text style={form.gouvernerat ? [s.pickerText, { color: T.text }] : [s.pickerPlaceholder, { color: T.subText }]}>{form.gouvernerat || 'Sélectionner...'}</Text>
                        <Ionicons name="chevron-down" size={18} color={T.subText} />
                    </TouchableOpacity>

                    <Text style={[s.label, { color: T.label }]}>Ville</Text>
                    <TouchableOpacity style={[s.picker, { backgroundColor: T.input, borderColor: T.inputBorder }]} onPress={() => { setVilleSearch(''); setVilleModal(true); }} activeOpacity={0.7}>
                        <Text style={form.ville ? [s.pickerText, { color: T.text }] : [s.pickerPlaceholder, { color: T.subText }]}>{form.ville || 'Sélectionner...'}</Text>
                        <Ionicons name="chevron-down" size={18} color={T.subText} />
                    </TouchableOpacity>

                    <Text style={[s.label, { color: T.label }]}>Adresse complète</Text>
                    <View style={[s.phoneWrap, { backgroundColor: T.input, borderColor: T.inputBorder }]}>
                        <Ionicons name="location-outline" size={18} color={T.subText} style={{ marginRight: 8 }} />
                        <TextInput style={[s.phoneInput, { color: T.text }]} placeholder="Rue, N°, Ville..." placeholderTextColor={T.subText} value={form.adresse} onChangeText={v => updateForm('adresse', v)} />
                    </View>
                </View>

                <View style={[s.card, { backgroundColor: T.card, borderColor: T.cardBorder }]}>
                    <Text style={[s.cardTitle, { color: T.text }]}>Produits</Text>
                    {items.map((item, index) => (
                        <View key={item.id}>
                            {index > 0 && (
                                <View style={[s.itemSeparator, { borderTopColor: T.cardBorder }]}>
                                    <TouchableOpacity style={s.removeBtn} onPress={() => removeItem(item.id)}>
                                        <Ionicons name="close-circle" size={20} color="#E53E3E" />
                                        <Text style={s.removeBtnText}>Retirer</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                            <Text style={[s.label, { color: T.label }]}>Produit</Text>
                            <TouchableOpacity style={[s.picker, { backgroundColor: T.input, borderColor: T.inputBorder }]} onPress={() => openProdModal(item.id)} activeOpacity={0.7}>
                                <Text style={item.productNom ? [s.pickerText, { color: T.text }] : [s.pickerPlaceholder, { color: T.subText }]}>{item.productNom || 'Sélectionner un produit...'}</Text>
                                <Ionicons name="chevron-down" size={18} color={T.subText} />
                            </TouchableOpacity>
                            <View style={s.row}>
                                <View style={s.half}>
                                    <Text style={[s.label, { color: T.label }]}>Prix (TND)</Text>
                                    <View style={[s.phoneWrap, { backgroundColor: T.input, borderColor: T.inputBorder }]}>
                                        <TextInput style={[s.phoneInput, { color: T.text }]} placeholder="0.000" placeholderTextColor={T.subText} keyboardType="decimal-pad" value={item.prix} onChangeText={v => updateItem(item.id, 'prix', v)} />
                                        <Text style={{ color: T.subText, fontSize: 12 }}>TND</Text>
                                    </View>
                                </View>
                                <View style={s.half}>
                                    <Text style={[s.label, { color: T.label }]}>Quantité</Text>
                                    <View style={[s.qtyWrap, { backgroundColor: T.input, borderColor: T.inputBorder }]}>
                                        <TouchableOpacity style={s.qtyBtn} onPress={() => changeQty(item.id, -1)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}><Text style={s.qtyBtnText}>−</Text></TouchableOpacity>
                                        <Text style={[s.qtyValue, { color: T.text }]}>{item.qte}</Text>
                                        <TouchableOpacity style={s.qtyBtn} onPress={() => changeQty(item.id, 1)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}><Text style={s.qtyBtnText}>+</Text></TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        </View>
                    ))}
                    <TouchableOpacity style={s.addProductBtn} onPress={addItem}>
                        <Ionicons name="add" size={20} color="#fff" />
                        <Text style={s.addProductBtnText}>Ajouter vos produits</Text>
                    </TouchableOpacity>
                    <View style={[s.totalRow, { borderTopColor: T.cardBorder }]}>
                        <Text style={[s.totalLabel, { color: T.subText }]}>Total :</Text>
                        <Text style={s.totalValue}>{total.toFixed(3)} TND</Text>
                    </View>
                </View>

                <View style={s.actionRow}>
                    <TouchableOpacity style={s.cancelBtn} onPress={() => router.back()}>
                        <Text style={s.cancelBtnText}>Annuler</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.confirmBtn} onPress={handleSubmit} disabled={submitting}>
                        {submitting ? <ActivityIndicator color="#fff" /> : <><Ionicons name="checkmark" size={20} color="#fff" /><Text style={s.confirmBtnText}>Confirmer</Text></>}
                    </TouchableOpacity>
                </View>
                <View style={{ height: 30 }} />
            </ScrollView>

            <Modal visible={gouvModal} transparent animationType="slide" onRequestClose={() => setGouModal(false)}>
                <Pressable style={s.modalOverlay} onPress={() => setGouModal(false)}>
                    <Pressable style={[s.modalPanel, { backgroundColor: T.card }]} onPress={() => {}}>
                        <View style={s.modalHeader}>
                            <Text style={[s.modalTitle, { color: T.text }]}>Gouvernorat</Text>
                            <TouchableOpacity onPress={() => setGouModal(false)}><Ionicons name="close" size={22} color={T.subText} /></TouchableOpacity>
                        </View>
                        <FlatList
                            data={GOUVERNERATS}
                            keyExtractor={g => g}
                            renderItem={({ item: g }) => (
                                <TouchableOpacity style={[s.modalItem, { borderBottomColor: T.cardBorder }, form.gouvernerat === g && { backgroundColor: '#E8F8FC' }]}
                                    onPress={() => { updateForm('gouvernerat', g); updateForm('ville', ''); updateForm('villeId', null); setGouModal(false); }}>
                                    <Text style={[s.modalItemText, { color: T.text }, form.gouvernerat === g && { color: '#29B6D8', fontWeight: '700' }]}>{g}</Text>
                                    {form.gouvernerat === g && <Ionicons name="checkmark" size={16} color="#29B6D8" />}
                                </TouchableOpacity>
                            )}
                        />
                    </Pressable>
                </Pressable>
            </Modal>

            <Modal visible={villeModal} transparent animationType="slide" onRequestClose={() => setVilleModal(false)}>
                <Pressable style={s.modalOverlay} onPress={() => setVilleModal(false)}>
                    <Pressable style={[s.modalPanel, { backgroundColor: T.card }]} onPress={() => {}}>
                        <View style={s.modalHeader}>
                            <Text style={[s.modalTitle, { color: T.text }]}>Ville</Text>
                            <TouchableOpacity onPress={() => setVilleModal(false)}><Ionicons name="close" size={22} color={T.subText} /></TouchableOpacity>
                        </View>
                        <TextInput style={[s.modalSearch, { backgroundColor: T.input, borderColor: T.inputBorder, color: T.text }]} placeholder="Rechercher..." placeholderTextColor={T.subText} value={villeSearch} onChangeText={setVilleSearch} />
                        <FlatList
                            data={filteredVilles}
                            keyExtractor={v => String(v.id)}
                            renderItem={({ item: v }) => (
                                <TouchableOpacity style={[s.modalItem, { borderBottomColor: T.cardBorder }, form.villeId === v.id && { backgroundColor: '#E8F8FC' }]}
                                    onPress={() => { updateForm('ville', v.ville); updateForm('villeId', v.id); setVilleModal(false); }}>
                                    <Text style={[s.modalItemText, { color: T.text }, form.villeId === v.id && { color: '#29B6D8', fontWeight: '700' }]}>{v.ville}</Text>
                                    {form.villeId === v.id && <Ionicons name="checkmark" size={16} color="#29B6D8" />}
                                </TouchableOpacity>
                            )}
                        />
                    </Pressable>
                </Pressable>
            </Modal>

            <Modal visible={prodModal} transparent animationType="slide" onRequestClose={() => setProdModal(false)}>
                <Pressable style={s.modalOverlay} onPress={() => setProdModal(false)}>
                    <Pressable style={[s.modalPanel, { backgroundColor: T.card }]} onPress={() => {}}>
                        <View style={s.modalHeader}>
                            <Text style={[s.modalTitle, { color: T.text }]}>Choisir un produit</Text>
                            <TouchableOpacity onPress={() => setProdModal(false)}><Ionicons name="close" size={22} color={T.subText} /></TouchableOpacity>
                        </View>
                        <TextInput style={[s.modalSearch, { backgroundColor: T.input, borderColor: T.inputBorder, color: T.text }]} placeholder="Rechercher..." placeholderTextColor={T.subText} value={prodSearch} onChangeText={setProdSearch} />
                        <FlatList
                            data={filteredProds}
                            keyExtractor={p => String(p.id)}
                            renderItem={({ item: p }) => (
                                <TouchableOpacity style={[s.modalItem, { borderBottomColor: T.cardBorder }]} onPress={() => selectProduct(p)}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[s.modalItemText, { color: T.text }]}>{p.nom}</Text>
                                        {p.prix ? <Text style={{ fontSize: 12, color: '#29B6D8' }}>{parseFloat(p.prix).toFixed(3)} TND</Text> : null}
                                    </View>
                                    <Ionicons name="chevron-forward" size={16} color={T.subText} />
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={<Text style={[s.modalItemText, { color: T.subText, textAlign: 'center', padding: 20 }]}>Aucun produit trouvé</Text>}
                        />
                    </Pressable>
                </Pressable>
            </Modal>

            <AppFooter darkMode={darkMode} />
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe:              { flex: 1 },
    center:            { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scroll:            { flex: 1 },
    scrollContent:     { padding: 16, paddingBottom: 30 },
    pageTitleRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    pageTitle:         { fontSize: 20, fontWeight: '800' },
    breadcrumb:        { fontSize: 11, flexShrink: 1, textAlign: 'right' },
    card:              { borderRadius: 16, borderWidth: 1, padding: 20, marginBottom: 16 },
    cardTitle:         { fontSize: 16, fontWeight: '800', marginBottom: 20 },
    row:               { flexDirection: 'row', gap: 12 },
    half:              { flex: 1 },
    label:             { fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 4 },
    input:             { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13, fontSize: 14, marginBottom: 4 },
    phoneWrap:         { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, marginBottom: 4 },
    phonePrefix:       { fontSize: 14, fontWeight: '600', marginRight: 6 },
    phoneInput:        { flex: 1, fontSize: 14 },
    picker:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 4 },
    pickerText:        { fontSize: 14 },
    pickerPlaceholder: { fontSize: 14 },
    qtyWrap:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 10 },
    qtyBtn:            { width: 30, height: 30, borderRadius: 15, backgroundColor: '#29B6D8', justifyContent: 'center', alignItems: 'center' },
    qtyBtnText:        { color: '#fff', fontSize: 18, fontWeight: '700', lineHeight: 22 },
    qtyValue:          { fontSize: 16, fontWeight: '800', minWidth: 30, textAlign: 'center' },
    itemSeparator:     { borderTopWidth: 1, marginTop: 16, paddingTop: 12 },
    removeBtn:         { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end', marginBottom: 8 },
    removeBtnText:     { fontSize: 12, color: '#E53E3E', fontWeight: '600' },
    addProductBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#29B6D8', borderRadius: 50, paddingVertical: 14, marginTop: 20 },
    addProductBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    totalRow:          { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'baseline', gap: 8, borderTopWidth: 1, marginTop: 20, paddingTop: 16 },
    totalLabel:        { fontSize: 16, fontWeight: '600' },
    totalValue:        { fontSize: 26, fontWeight: '900', color: '#29B6D8' },
    actionRow:         { flexDirection: 'row', gap: 12 },
    cancelBtn:         { flex: 1, backgroundColor: '#E8533A', borderRadius: 50, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
    cancelBtnText:     { color: '#fff', fontSize: 16, fontWeight: '700' },
    confirmBtn:        { flex: 1, flexDirection: 'row', gap: 8, backgroundColor: '#29B6D8', borderRadius: 50, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
    confirmBtnText:    { color: '#fff', fontSize: 16, fontWeight: '700' },
    modalOverlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalPanel:        { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '75%', padding: 16 },
    modalHeader:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    modalTitle:        { fontSize: 16, fontWeight: '700' },
    modalSearch:       { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 13, marginBottom: 10 },
    modalItem:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    modalItemText:     { fontSize: 14 },
});