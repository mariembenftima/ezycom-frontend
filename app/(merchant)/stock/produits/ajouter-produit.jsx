import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { API_URL } from '../../../../config';
import { loadSession } from '../../../../utils/auth';
import AppFooter from '../../../components/AppFooter';
import AppHeader from '../../../components/AppHeader';

const TEAL = '#29B6D8';
const DARK_BG = '#0F1B2D';

export default function AjouterProduitScreen() {
  const [session, setSession]   = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [categories, setCategories] = useState([]);

  const [nom, setNom]               = useState('');
  const [ref, setRef]               = useState('');
  const [marque, setMarque]         = useState('');
  const [modele, setModele]         = useState('');
  const [couleur, setCouleur]       = useState('');
  const [description, setDescription] = useState('');
  const [prix, setPrix]             = useState('');
  const [prixAchat, setPrixAchat]   = useState('');
  const [qte, setQte]               = useState('');
  const [seuil, setSeuil]           = useState('1');
  const [idCat, setIdCat]           = useState(0);
  const [idSous, setIdSous]         = useState(0);
  const [showCatPicker, setShowCatPicker] = useState(false);
  const [photos, setPhotos]         = useState([null, null, null, null]);

  const bg   = darkMode ? DARK_BG  : '#EEF4F8';
  const card = darkMode ? '#1A2A3D' : '#FFFFFF';
  const txt  = darkMode ? '#FFFFFF' : '#0D1B2A';
  const sub  = darkMode ? '#8899AA' : '#6A7A8A';
  const inputBg = darkMode ? '#243347' : '#F8FAFC';
  const border  = darkMode ? '#2E4060' : '#CBD5E0';

  useEffect(() => {
    loadSession().then(s => {
      setSession(s);
      if (s) fetchCategories(s.token);
    });
  }, []);

  const authHeaders = token => ({ 'X-Token': token });

  const fetchCategories = async (token) => {
    try {
      const res = await fetch(`${API_URL}/api/categories`, { headers: authHeaders(token) });
      const json = await res.json();
      if (json.success) setCategories(json.data?.categories ?? json.data ?? []);
    } catch (_) {}
  };

  const pickImage = async (index) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission refusée'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (!result.canceled) {
      const updated = [...photos];
      updated[index] = result.assets[0];
      setPhotos(updated);
    }
  };

  const handleSubmit = async () => {
    if (!nom.trim())   { Alert.alert('Erreur', 'Le nom du produit est obligatoire.'); return; }
    if (!prix.trim())  { Alert.alert('Erreur', 'Le prix de vente est obligatoire.'); return; }
    if (!prixAchat.trim()) { Alert.alert("Erreur", "Le prix d'achat est obligatoire."); return; }
    if (!qte.trim())   { Alert.alert('Erreur', 'La quantité est obligatoire.'); return; }
    if (!idCat)        { Alert.alert('Erreur', 'Veuillez sélectionner une catégorie.'); return; }

    setLoading(true);
    try {
      const form = new FormData();
      form.append('nom', nom.trim());
      form.append('ref', ref.trim());
      form.append('marque', marque.trim());
      form.append('modele', modele.trim());
      form.append('couleur', couleur.trim());
      form.append('description', description.trim());
      form.append('prix', prix.trim());
      form.append('prix_achat', prixAchat.trim());
      form.append('qte', qte);
      form.append('seuil', seuil);
      form.append('id_cat', idCat);
      if (idSous) form.append('id_sous_cat', idSous);

      const imgKeys = ['img1', 'img2', 'img3', 'img4'];
      photos.forEach((p, i) => {
        if (p) {
          const ext = p.uri.split('.').pop();
          form.append(imgKeys[i], { uri: p.uri, type: `image/${ext}`, name: `photo${i + 1}.${ext}` });
        }
      });

      const res = await fetch(`${API_URL}/api/products`, {
        method: 'POST',
        headers: { 'X-Token': session.token },
        body: form,
      });
      const json = await res.json();
      if (json.success) {
        Alert.alert('Succès', 'Produit ajouté avec succès.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('Erreur', json.message ?? 'Impossible d\'ajouter le produit.');
      }
    } catch (_) {
      Alert.alert('Erreur', 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  const cats = categories.filter(c => !c.parent_id);
  const sousOfSelected = categories.filter(c => c.parent_id == idCat);
  const selectedCatNom = cats.find(c => c.id == idCat)?.nom;
  const selectedSousNom = sousOfSelected.find(c => c.id == idSous)?.nom;

  const Field = ({ label, required, ...props }) => (
    <View style={styles.fieldWrap}>
      <Text style={[styles.label, { color: sub }]}>{label}{required && <Text style={{ color: '#E74C3C' }}> *</Text>}</Text>
      <TextInput
        style={[styles.input, { borderColor: border, backgroundColor: inputBg, color: txt }]}
        placeholderTextColor={sub}
        {...props}
      />
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
      <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} />
      <AppHeader
        session={session} darkMode={darkMode}
        onToggleDark={() => setDarkMode(d => !d)}
        onLogout={() => router.replace('/(auth)/login')}
      />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.breadcrumbRow}>
          <Text style={[styles.breadcrumb, { color: sub }]}>Dashboard › Produits › </Text>
          <Text style={[styles.breadcrumb, { color: TEAL, fontWeight: '700' }]}>Ajouter produit</Text>
        </View>
        <Text style={[styles.pageTitle, { color: txt }]}>Produit</Text>

        <View style={[styles.card, { backgroundColor: card }]}>
          <Text style={[styles.cardTitle, { color: txt }]}>Ajouter un nouveau produit</Text>

          <Text style={[styles.sectionTitle, { color: txt }]}>Catégorie</Text>
          <Text style={[styles.label, { color: sub }]}>Catégorie <Text style={{ color: '#E74C3C' }}>*</Text></Text>
          <TouchableOpacity
            style={[styles.select, { borderColor: border, backgroundColor: inputBg }]}
            onPress={() => setShowCatPicker(!showCatPicker)}
          >
            <Text style={{ color: selectedCatNom ? txt : sub, flex: 1 }}>
              {selectedCatNom ?? '-- Sélectionnez une catégorie --'}
            </Text>
            <Ionicons name="chevron-down" size={16} color={sub} />
          </TouchableOpacity>

          {showCatPicker && (
            <View style={[styles.picker, { backgroundColor: card, borderColor: border }]}>
              {cats.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.pickerItem, idCat == c.id && { backgroundColor: '#E8F7FB' }]}
                  onPress={() => { setIdCat(c.id); setIdSous(0); setShowCatPicker(false); }}
                >
                  <Text style={{ color: idCat == c.id ? TEAL : txt, fontWeight: idCat == c.id ? '700' : '400' }}>
                    {c.nom}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {sousOfSelected.length > 0 && (
            <>
              <Text style={[styles.label, { color: sub, marginTop: 10 }]}>Sous-catégorie</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {sousOfSelected.map(sc => (
                  <TouchableOpacity
                    key={sc.id}
                    style={[styles.subChip, { backgroundColor: idSous == sc.id ? TEAL : '#F0F4F8' }]}
                    onPress={() => setIdSous(idSous == sc.id ? 0 : sc.id)}
                  >
                    <Text style={{ color: idSous == sc.id ? '#fff' : sub, fontSize: 12 }}>{sc.nom}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          <Text style={[styles.sectionTitle, { color: txt, marginTop: 18 }]}>Informations</Text>
          <Field label="Nom produit" required placeholder="Entrez le nom du produit" value={nom} onChangeText={setNom} />
          <Field label="Référence" placeholder="Référence du produit (optionnel)" value={ref} onChangeText={setRef} />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Field label="Marque" placeholder="Marque (optionnel)" value={marque} onChangeText={setMarque} />
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Field label="Modèle" placeholder="Modèle (optionnel)" value={modele} onChangeText={setModele} />
            </View>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Field label="Couleur principale" placeholder="Couleur (optionnel)" value={couleur} onChangeText={setCouleur} />
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Field label="Quantité" required placeholder="Quantité en stock" value={qte} onChangeText={setQte} keyboardType="numeric" />
            </View>
          </View>

          <View style={styles.fieldWrap}>
            <Text style={[styles.label, { color: sub }]}>Description</Text>
            <TextInput
              style={[styles.textarea, { borderColor: border, backgroundColor: inputBg, color: txt }]}
              placeholder="Description détaillée (optionnel)"
              placeholderTextColor={sub}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Field label="Prix de vente (DT)" required placeholder="Prix de vente en DT" value={prix} onChangeText={setPrix} keyboardType="decimal-pad" />
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Field label="Prix d'achat (DT)" required placeholder="Prix d'achat en DT" value={prixAchat} onChangeText={setPrixAchat} keyboardType="decimal-pad" />
            </View>
          </View>

          <Field label="Seuil d'alerte" value={seuil} onChangeText={setSeuil} keyboardType="numeric" />
          <Text style={[styles.hint, { color: sub }]}>Quantité minimale avant alerte de rupture de stock</Text>

          <Text style={[styles.sectionTitle, { color: txt, marginTop: 18 }]}>Images</Text>
          <View style={[styles.infoBox, { backgroundColor: '#EBF8FF', borderColor: '#BEE3F8' }]}>
            <Ionicons name="information-circle-outline" size={16} color={TEAL} />
            <Text style={{ color: TEAL, fontSize: 12, marginLeft: 6, flex: 1 }}>
              <Text style={{ fontWeight: '700' }}>Format acceptés : JPG, JPEG, PNG, WEBP{'\n'}</Text>
              Taille maximale : 1 MB par image
            </Text>
          </View>

          {['Photo 1 (Principal)', 'Photo 2', 'Photo 3', 'Photo 4'].map((label, i) => (
            <View key={i} style={{ marginBottom: 14 }}>
              <Text style={[styles.label, { color: i === 0 ? TEAL : sub, fontWeight: i === 0 ? '700' : '400' }]}>{label}</Text>
              <View style={styles.filePickerRow}>
                <TouchableOpacity
                  style={[styles.filePickerBtn, { borderColor: border, backgroundColor: inputBg }]}
                  onPress={() => pickImage(i)}
                >
                  <Text style={{ color: txt, fontSize: 13 }}>Choisir un fichier</Text>
                </TouchableOpacity>
                <Text style={[styles.fileNameTxt, { color: sub }]}>
                  {photos[i] ? photos[i].uri.split('/').pop() : 'Aucun fichier choisi'}
                </Text>
              </View>
              {photos[i] && (
                <Image source={{ uri: photos[i].uri }} style={styles.previewImg} resizeMode="cover" />
              )}
              <Text style={[styles.hint, { color: sub }]}>{i === 0 ? 'Image principale du produit (recommandée)' : 'Image optionnelle'}</Text>
            </View>
          ))}

          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: TEAL }, loading && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Ionicons name="add" size={16} color="#fff" />
                  <Text style={styles.submitTxt}> Ajouter le produit</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: border }]}
              onPress={() => router.back()}
            >
              <Text style={{ color: sub, fontWeight: '600' }}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      <AppFooter />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:          { flex: 1 },
  scroll:        { paddingHorizontal: 16, paddingBottom: 80 },
  breadcrumbRow: { flexDirection: 'row', marginTop: 14, marginBottom: 4, flexWrap: 'wrap' },
  breadcrumb:    { fontSize: 12 },
  pageTitle:     { fontSize: 22, fontWeight: '800', marginBottom: 14 },
  card:          { borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  cardTitle:     { fontSize: 17, fontWeight: '800', marginBottom: 16 },
  sectionTitle:  { fontSize: 15, fontWeight: '800', marginBottom: 12 },
  label:         { fontSize: 13, marginBottom: 5 },
  hint:          { fontSize: 11, marginTop: 4, marginBottom: 4 },
  fieldWrap:     { marginBottom: 12 },
  input:         { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14 },
  textarea:      { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, height: 90, textAlignVertical: 'top' },
  row:           { flexDirection: 'row' },
  select:        { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 4 },
  picker:        { borderWidth: 1, borderRadius: 10, marginBottom: 8, overflow: 'hidden' },
  pickerItem:    { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  subChip:       { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8 },
  infoBox:       { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 14 },
  filePickerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  filePickerBtn: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 9 },
  fileNameTxt:   { fontSize: 13 },
  previewImg:    { width: '100%', height: 160, borderRadius: 10, marginTop: 8 },
  btnRow:        { flexDirection: 'row', gap: 10, marginTop: 10 },
  submitBtn:     { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', borderRadius: 22, paddingVertical: 13 },
  submitTxt:     { color: '#fff', fontWeight: '700', fontSize: 15 },
  cancelBtn:     { flex: 0.5, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderRadius: 22, paddingVertical: 13 },
});