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
import { clearSession, loadSession } from '../../utils/auth';
import { loadDarkMode, saveDarkMode } from '../../utils/darkMode';
import AppFooter from '../components/AppFooter';
import AppHeader from '../components/AppHeader';

const LIGHT = { bg: '#EEF4F9', card: '#fff', cardBorder: '#E8EEF4', text: '#1A2940', subText: '#8A9AAA', input: '#F0F6FA', inputBorder: '#DDE8F0', label: '#4A6A8A' };
const DARK = { bg: '#0A1525', card: '#0F2035', cardBorder: '#1E3A50', text: '#E2EEF8', subText: '#5A8A9A', input: '#152D42', inputBorder: '#1E3A50', label: '#7AAAC0' };

export default function NewSale() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [products, setProducts] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [clientName, setClientName] = useState('');
  const [phone, setPhone] = useState('');
  const [items, setItems] = useState([{ id: Date.now(), productId: null, productNom: '', price: '', qty: 1 }]);

  const [prodModal, setProdModal] = useState(false);
  const [prodSearch, setProdSearch] = useState('');
  const [activeItemId, setActiveItemId] = useState(null);

  const T = darkMode ? DARK : LIGHT;

  useEffect(() => { loadDarkMode().then(setDarkMode); }, []);

  useEffect(() => {
    loadSession().then(s => {
      if (!s) { router.replace('/(auth)/login'); return; }
      setSession(s);
      fetchProducts();
      setLoading(false);
    });
  }, []);

  const fetchProducts = async () => {
    try {
      const data = await api.get('/api/products/produits/products-list.php');
      if (data.success) {
        const list = data.data?.produits ?? data.data ?? [];
        setProducts(Array.isArray(list) ? list : []);
      }
    } catch (_) { setProducts([]); }
  };

  const filteredProds = useMemo(() =>
    products.filter(p => prodSearch === '' || p.nom.toLowerCase().includes(prodSearch.toLowerCase())),
    [products, prodSearch]
  );

  const openProdModal = (itemId) => {
    setActiveItemId(itemId);
    setProdSearch('');
    setProdModal(true);
  };

  const selectProduct = (p) => {
    setItems(prev => prev.map(it =>
      it.id === activeItemId
        ? { ...it, productId: p.id, productNom: p.nom, price: String(p.prix || '') }
        : it
    ));
    setProdModal(false);
  };

  const updateItem = (id, field, value) => setItems(prev => prev.map(it => it.id === id ? { ...it, [field]: value } : it));
  const changeQty = (id, delta) => setItems(prev => prev.map(it => it.id === id ? { ...it, qty: Math.max(1, it.qty + delta) } : it));
  const addItem = () => setItems(prev => [...prev, { id: Date.now(), productId: null, productNom: '', price: '', qty: 1 }]);
  const removeItem = (id) => setItems(prev => prev.filter(it => it.id !== id));

  const total = items.reduce((sum, it) => sum + (parseFloat(it.price) || 0) * it.qty, 0);

  const handleConfirm = async () => {
    if (!clientName.trim()) return;
    setSubmitting(true);
    try {
      const data = await api.post('/api/orders/vente-create.php', {
        nom: clientName, prenom: '', tel: phone,
        items: items.map(it => ({ id_prod: it.productId, qte: it.qty, prix: parseFloat(it.price) || 0 })),
      });
      if (data.success) {
        Alert.alert(
          'Succès',
          'Vente enregistrée avec succès.',
          [{ text: 'OK', onPress: () => router.replace('/(merchant)/commandes/detail?etat=1') }]
        );
      } else {
        Alert.alert('Erreur', data.message || 'Échec de la vente.');
      }
    } catch (e) {
      Alert.alert('Erreur', e.message || 'Impossible d\'enregistrer la vente.');
    }
    finally { setSubmitting(false); }
  };

  const handleLogout = async () => { await clearSession(); router.replace('/(auth)/login'); };

  if (loading) return (
    <View style={[s.loadingScreen, { backgroundColor: T.bg }]}>
      <ActivityIndicator size="large" color="#29B6D8" />
    </View>
  );

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: T.bg }]}>
      <AppHeader
        session={session} darkMode={darkMode}
        onToggleDark={() => { const next = !darkMode; setDarkMode(next); saveDarkMode(next); }}
        onLogout={handleLogout}
      />

      <Modal visible={prodModal} transparent animationType="slide" onRequestClose={() => setProdModal(false)}>
        <Pressable style={s.modalOverlay} onPress={() => setProdModal(false)}>
          <Pressable style={[s.modalSheet, { backgroundColor: T.card }]} onPress={() => { }}>
            <Text style={[s.modalTitle, { color: T.text }]}>Choisir un produit</Text>
            <View style={[s.searchWrap, { backgroundColor: T.input, borderColor: T.inputBorder }]}>
              <Ionicons name="search-outline" size={16} color={T.subText} style={{ marginRight: 6 }} />
              <TextInput
                style={[s.searchInput, { color: T.text }]}
                placeholder="Rechercher..."
                placeholderTextColor={T.subText}
                value={prodSearch}
                onChangeText={setProdSearch}
                autoFocus
              />
            </View>
            <FlatList
              data={filteredProds}
              keyExtractor={p => String(p.id)}
              style={{ maxHeight: 350 }}
              renderItem={({ item: p }) => (
                <TouchableOpacity style={[s.prodItem, { borderBottomColor: T.cardBorder }]} onPress={() => selectProduct(p)}>
                  <Text style={[s.prodItemNom, { color: T.text }]}>{p.nom}</Text>
                  <Text style={[s.prodItemPrix, { color: '#29B6D8' }]}>{p.prix} DT</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={[s.emptyTxt, { color: T.subText }]}>Aucun produit trouvé</Text>}
            />
          </Pressable>
        </Pressable>
      </Modal>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={s.pageTitleRow}>
          <Text style={[s.pageTitle, { color: T.text }]}>Nouvelle vente</Text>
          <Text style={[s.breadcrumb, { color: T.subText }]}>Dashboard › Ventes</Text>
        </View>

        <View style={[s.card, { backgroundColor: T.card, borderColor: T.cardBorder }]}>
          <Text style={[s.cardTitle, { color: T.text }]}>Détails client</Text>

          <Text style={[s.label, { color: T.label }]}>Nom & prénom du client</Text>
          <TextInput
            style={[s.input, { backgroundColor: T.input, borderColor: T.inputBorder, color: T.text }]}
            placeholder="Entrez le nom complet..."
            placeholderTextColor={T.subText}
            value={clientName}
            onChangeText={setClientName}
          />

          <Text style={[s.label, { color: T.label }]}>Numéro de téléphone</Text>
          <View style={[s.phoneWrap, { backgroundColor: T.input, borderColor: T.inputBorder }]}>
            <Ionicons name="call-outline" size={18} color={T.subText} style={{ marginRight: 8 }} />
            <Text style={[s.phonePrefix, { color: T.subText }]}>+216</Text>
            <TextInput
              style={[s.phoneInput, { color: T.text }]}
              placeholder="..."
              placeholderTextColor={T.subText}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
          </View>
        </View>

        <View style={[s.card, { backgroundColor: T.card, borderColor: T.cardBorder }]}>
          <Text style={[s.cardTitle, { color: T.text }]}>Produits</Text>

          {items.map((item, index) => (
            <View key={item.id} style={index > 0 ? [s.itemSeparator, { borderTopColor: T.cardBorder }] : {}}>
              {index > 0 && (
                <TouchableOpacity style={s.removeBtn} onPress={() => removeItem(item.id)}>
                  <Ionicons name="close-circle" size={20} color="#E53E3E" />
                  <Text style={s.removeBtnText}>Retirer</Text>
                </TouchableOpacity>
              )}

              <Text style={[s.label, { color: T.label }]}>Produit</Text>
              <TouchableOpacity
                style={[s.selectBtn, { backgroundColor: T.input, borderColor: T.inputBorder }]}
                onPress={() => openProdModal(item.id)}
              >
                <Text style={[s.selectBtnText, { color: item.productNom ? T.text : T.subText }]} numberOfLines={1}>
                  {item.productNom || '-- Choisir un produit --'}
                </Text>
                <Ionicons name="chevron-down" size={16} color={T.subText} />
              </TouchableOpacity>

              <View style={s.priceQtyRow}>
                <View style={s.priceBlock}>
                  <Text style={[s.label, { color: T.label }]}>Prix (DT)</Text>
                  <View style={[s.priceWrap, { backgroundColor: T.input, borderColor: T.inputBorder }]}>
                    <TextInput
                      style={[s.priceInput, { color: T.text }]}
                      placeholder="0.00"
                      placeholderTextColor={T.subText}
                      keyboardType="decimal-pad"
                      value={item.price}
                      onChangeText={v => updateItem(item.id, 'price', v)}
                    />
                    <Text style={[s.dtLabel, { color: T.subText }]}>DT</Text>
                  </View>
                </View>
                <View style={s.qtyBlock}>
                  <Text style={[s.label, { color: T.label }]}>Quantité</Text>
                  <View style={[s.qtyWrap, { backgroundColor: T.input, borderColor: T.inputBorder }]}>
                    <TouchableOpacity style={s.qtyBtn} onPress={() => changeQty(item.id, -1)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Text style={s.qtyBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={[s.qtyValue, { color: T.text }]}>{item.qty}</Text>
                    <TouchableOpacity style={s.qtyBtn} onPress={() => changeQty(item.id, 1)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Text style={s.qtyBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          ))}

          <TouchableOpacity style={s.addProductBtn} onPress={addItem}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={s.addProductBtnText}>Ajouter un produit</Text>
          </TouchableOpacity>

          <View style={[s.totalRow, { borderTopColor: T.cardBorder }]}>
            <Text style={[s.totalLabel, { color: T.subText }]}>Total :</Text>
            <Text style={s.totalValue}>{total.toFixed(2)} DT</Text>
          </View>
        </View>

        <View style={s.actionRow}>
          <TouchableOpacity style={s.cancelBtn} onPress={() => router.back()}>
            <Text style={s.cancelBtnText}>Annuler</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.confirmBtn} onPress={handleConfirm} disabled={submitting}>
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <><Ionicons name="checkmark" size={20} color="#fff" /><Text style={s.confirmBtnText}>Confirmer</Text></>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>

      <AppFooter darkMode={darkMode} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  loadingScreen: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 30 },
  pageTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  pageTitle: { fontSize: 20, fontWeight: '800' },
  breadcrumb: { fontSize: 12 },
  card: { borderRadius: 16, borderWidth: 1, padding: 20, marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: '800', marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 4 },
  input: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13, fontSize: 14, marginBottom: 4 },
  phoneWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, marginBottom: 4 },
  phonePrefix: { fontSize: 14, fontWeight: '600', marginRight: 6 },
  phoneInput: { flex: 1, fontSize: 14 },
  selectBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, marginBottom: 4 },
  selectBtnText: { flex: 1, fontSize: 14 },
  priceQtyRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  priceBlock: { flex: 1 },
  qtyBlock: { flex: 1 },
  priceWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13 },
  priceInput: { flex: 1, fontSize: 14 },
  dtLabel: { fontSize: 13, fontWeight: '700', marginLeft: 4 },
  qtyWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 10 },
  qtyBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#29B6D8', justifyContent: 'center', alignItems: 'center' },
  qtyBtnText: { color: '#fff', fontSize: 18, fontWeight: '700', lineHeight: 22 },
  qtyValue: { fontSize: 16, fontWeight: '800', minWidth: 30, textAlign: 'center' },
  itemSeparator: { borderTopWidth: 1, marginTop: 16, paddingTop: 12 },
  removeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end', marginBottom: 8 },
  removeBtnText: { fontSize: 12, color: '#E53E3E', fontWeight: '600' },
  addProductBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#29B6D8', borderRadius: 50, paddingVertical: 14, marginTop: 20 },
  addProductBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  totalRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'baseline', gap: 8, borderTopWidth: 1, marginTop: 20, paddingTop: 16 },
  totalLabel: { fontSize: 16, fontWeight: '600' },
  totalValue: { fontSize: 26, fontWeight: '900', color: '#29B6D8' },
  actionRow: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, backgroundColor: '#E8533A', borderRadius: 50, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  confirmBtn: { flex: 1, flexDirection: 'row', gap: 8, backgroundColor: '#29B6D8', borderRadius: 50, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '70%' },
  modalTitle: { fontSize: 16, fontWeight: '800', marginBottom: 14 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 14 },
  prodItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1 },
  prodItemNom: { fontSize: 14, fontWeight: '600', flex: 1 },
  prodItemPrix: { fontSize: 14, fontWeight: '700', marginLeft: 8 },
  emptyTxt: { textAlign: 'center', padding: 20, fontSize: 14 },
});