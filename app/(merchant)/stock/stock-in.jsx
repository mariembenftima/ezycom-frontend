import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_URL } from '../../../config';
import { loadSession } from '../../../utils/auth';
import AppFooter from '../../components/AppFooter';
import AppHeader from '../../components/AppHeader';

const TEAL    = '#29B6D8';
const DARK_BG = '#0F1B2D';

export default function StockInScreen() {
  const [session,    setSession]    = useState(null);
  const [darkMode,   setDarkMode]   = useState(false);
  const [categories, setCategories] = useState([]);
  const [produits,   setProduits]   = useState([]);
  const [loading,    setLoading]    = useState(false);

  const [idCat,     setIdCat]     = useState(null);
  const [idProduit, setIdProduit] = useState(null);
  const [qte,       setQte]       = useState('');

  const [showCatModal,  setShowCatModal]  = useState(false);
  const [showProdModal, setShowProdModal] = useState(false);

  const bg    = darkMode ? DARK_BG  : '#EEF4F8';
  const card  = darkMode ? '#1A2A3D' : '#FFFFFF';
  const txt   = darkMode ? '#FFFFFF' : '#0D1B2A';
  const sub   = darkMode ? '#8899AA' : '#6A7A8A';
  const input = darkMode ? '#243347' : '#F8FAFC';
  const bord  = darkMode ? '#2E4060' : '#CBD5E0';

  useEffect(() => {
    loadSession().then(s => {
      if (!s) { router.replace('/(auth)/login'); return; }
      setSession(s);
      fetchCategories(s.token);
    });
  }, []);

  const authHeaders = token => ({ 'X-Token': token, 'Content-Type': 'application/json' });

  const fetchCategories = async (token) => {
    try {
      const res  = await fetch(`${API_URL}/api/categories`, { headers: authHeaders(token) });
      const json = await res.json();
      if (json.success) setCategories(json.data?.categories ?? json.data ?? []);
    } catch (_) {}
  };

  const fetchProduits = async (token, catId) => {
    try {
      const res  = await fetch(`${API_URL}/api/products?id_cat=${catId}&limit=999`, { headers: authHeaders(token) });
      const json = await res.json();
      if (json.success) setProduits(json.data?.produits ?? []);
    } catch (_) { setProduits([]); }
  };

  const selectCat = (cat) => {
    setIdCat(cat.id);
    setIdProduit(null);
    setProduits([]);
    setShowCatModal(false);
    fetchProduits(session.token, cat.id);
  };

  const handleSubmit = async () => {
    if (!idProduit) { Alert.alert('Erreur', 'Veuillez sélectionner un produit.'); return; }
    if (!qte.trim() || parseInt(qte) <= 0) { Alert.alert('Erreur', 'Entrez une quantité valide.'); return; }

    setLoading(true);
    try {
      const res  = await fetch(`${API_URL}/api/stock/entree`, {
        method: 'POST',
        headers: authHeaders(session.token),
        body: JSON.stringify({ id_produit: idProduit, qte: parseInt(qte), raison: 'Ajout de stock' }),
      });
      const json = await res.json();
      if (json.success) {
        Alert.alert('Succès', json.message, [{ text: 'OK', onPress: () => {
          setIdCat(null); setIdProduit(null); setQte(''); setProduits([]);
        }}]);
      } else {
        Alert.alert('Erreur', json.message ?? 'Opération échouée.');
      }
    } catch (_) {
      Alert.alert('Erreur', 'Impossible de contacter le serveur.');
    } finally {
      setLoading(false);
    }
  };

  const cats    = categories.filter(c => !c.parent_id);
  const catNom  = cats.find(c => c.id === idCat)?.nom;
  const prodNom = produits.find(p => p.id === idProduit)?.nom;

  const PickerModal = ({ visible, onClose, title, items, selected, onSelect }) => (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={[styles.pickerModal, { backgroundColor: card }]}>
          <Text style={[styles.pickerTitle, { color: sub }]}>{title}</Text>
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 320 }}>
            {items.length === 0 ? (
              <Text style={[styles.emptyTxt, { color: sub }]}>Aucun élément disponible</Text>
            ) : items.map(item => (
              <TouchableOpacity
                key={item.id}
                style={[styles.pickerItem, item.id === selected && { backgroundColor: '#E8F7FB' }]}
                onPress={() => onSelect(item)}
              >
                <Text style={{ color: item.id === selected ? TEAL : txt, fontWeight: item.id === selected ? '700' : '400', fontSize: 14 }}>
                  {item.nom}
                </Text>
                {item.id === selected && <Ionicons name="checkmark" size={16} color={TEAL} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
      <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} />
      <AppHeader
        session={session} darkMode={darkMode}
        onToggleDark={() => setDarkMode(d => !d)}
        onLogout={() => router.replace('/(auth)/login')}
      />

      <PickerModal
        visible={showCatModal} onClose={() => setShowCatModal(false)}
        title="Sélectionnez une catégorie"
        items={cats} selected={idCat}
        onSelect={selectCat}
      />

      <PickerModal
        visible={showProdModal} onClose={() => setShowProdModal(false)}
        title="Sélectionnez un produit"
        items={produits} selected={idProduit}
        onSelect={(p) => { setIdProduit(p.id); setShowProdModal(false); }}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.breadcrumbRow}>
          <Text style={[styles.breadcrumb, { color: sub }]}>Dashboard › </Text>
          <Text style={[styles.breadcrumb, { color: TEAL, fontWeight: '700' }]}>Détail de stock</Text>
        </View>
        <Text style={[styles.pageTitle, { color: txt }]}>Détail de stock</Text>

        <View style={[styles.card, { backgroundColor: card }]}>

          {/* Catégorie + Produit */}
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: sub }]}>Catégorie</Text>
              <TouchableOpacity
                style={[styles.select, { borderColor: bord, backgroundColor: input }]}
                onPress={() => setShowCatModal(true)}
              >
                <Text style={{ color: catNom ? txt : sub, flex: 1, fontSize: 13 }} numberOfLines={1}>
                  {catNom ?? 'Sélectionnez une catégorie'}
                </Text>
                <Ionicons name="chevron-down" size={16} color={sub} />
              </TouchableOpacity>
            </View>

            <View style={{ width: 12 }} />

            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: sub }]}>Produit</Text>
              <TouchableOpacity
                style={[styles.select, { borderColor: bord, backgroundColor: idCat ? input : '#F0F4F8' }]}
                onPress={() => idCat ? setShowProdModal(true) : Alert.alert('Info', 'Sélectionnez d\'abord une catégorie.')}
              >
                <Text style={{ color: prodNom ? txt : sub, flex: 1, fontSize: 13 }} numberOfLines={1}>
                  {prodNom ?? 'Sélectionnez une catégorie'}
                </Text>
                <Ionicons name="chevron-down" size={16} color={sub} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Quantité — aligné à droite comme dans la maquette */}
          <View style={[styles.row, { marginTop: 16 }]}>
            <View style={{ flex: 1 }} />
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: sub }]}>Quantité</Text>
              <TextInput
                style={[styles.inputField, { borderColor: bord, backgroundColor: input, color: txt }]}
                placeholder=""
                placeholderTextColor={sub}
                keyboardType="numeric"
                value={qte}
                onChangeText={setQte}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, { opacity: loading ? 0.6 : 1 }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.submitTxt}>Ajouter</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <AppFooter />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:         { flex: 1 },
  scroll:       { paddingHorizontal: 16, paddingBottom: 80 },
  breadcrumbRow:{ flexDirection: 'row', marginTop: 14, marginBottom: 4 },
  breadcrumb:   { fontSize: 12 },
  pageTitle:    { fontSize: 22, fontWeight: '800', marginBottom: 14 },
  card:         { borderRadius: 16, padding: 20, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  row:          { flexDirection: 'row' },
  label:        { fontSize: 13, marginBottom: 6 },
  select:       { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13, gap: 6 },
  inputField:   { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13, fontSize: 14 },
  submitBtn:    { backgroundColor: TEAL, borderRadius: 30, paddingVertical: 15, alignItems: 'center', marginTop: 28 },
  submitTxt:    { color: '#fff', fontWeight: '700', fontSize: 16 },
  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  pickerModal:  { width: '85%', borderRadius: 16, overflow: 'hidden', elevation: 8 },
  pickerTitle:  { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: 16, paddingVertical: 12 },
  pickerItem:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 0.5, borderTopColor: '#E2E8F0' },
  emptyTxt:     { textAlign: 'center', padding: 20, fontSize: 13 },
});