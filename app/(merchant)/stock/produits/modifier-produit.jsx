import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
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
const TABS = ['Informations', 'Catégorie', 'Images', 'Confirmation'];

export default function ModifierProduitScreen() {
  const { id } = useLocalSearchParams();
  const [session, setSession]   = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [categories, setCategories] = useState([]);
  const [showCatPicker, setShowCatPicker] = useState(false);

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
  const [photos, setPhotos]         = useState([null, null, null, null]);
  const [existingImgs, setExistingImgs] = useState([null, null, null, null]);

  const bg    = darkMode ? DARK_BG  : '#EEF4F8';
  const card  = darkMode ? '#1A2A3D' : '#FFFFFF';
  const txt   = darkMode ? '#FFFFFF' : '#0D1B2A';
  const sub   = darkMode ? '#8899AA' : '#6A7A8A';
  const inputBg = darkMode ? '#243347' : '#FFFFFF';
  const border  = darkMode ? '#2E4060' : '#CBD5E0';

  useEffect(() => {
    loadSession().then(s => {
      setSession(s);
      if (s && id) {
        fetchCategories(s.token);
        fetchProduit(s.token);
      }
    });
  }, []);

  const authHeaders = token => ({ 'X-Token': token, 'Content-Type': 'application/json' });

  const fetchCategories = async (token) => {
    try {
      const res = await fetch(`${API_URL}/api/categories`, { headers: authHeaders(token) });
      const json = await res.json();
      if (json.success) setCategories(json.data?.categories ?? []);
    } catch (_) {}
  };

  const fetchProduit = async (token) => {
    try {
      const res = await fetch(`${API_URL}/api/products/${id}`, { headers: authHeaders(token) });
      const json = await res.json();
      if (json.success) {
        const p = json.data.produit;
        setNom(p.nom ?? '');
        setRef(p.ref ?? '');
        setMarque(p.marque ?? '');
        setModele(p.modele ?? '');
        setCouleur(p.couleur ?? '');
        setDescription(p.description ?? '');
        setPrix(p.prix ?? '');
        setPrixAchat(p.prix_achat ?? '');
        setQte(String(p.qte ?? ''));
        setSeuil(String(p.seuil ?? '1'));
        setIdCat(p.id_cat ?? 0);
        setIdSous(p.id_sous_cat ?? 0);
        setExistingImgs([p.img1 ?? null, p.img2 ?? null, p.img3 ?? null, p.img4 ?? null]);
      } else {
        Alert.alert('Erreur', 'Produit introuvable.');
        router.back();
      }
    } catch (_) {
      Alert.alert('Erreur', 'Impossible de charger le produit.');
      router.back();
    } finally {
      setLoading(false);
    }
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

  const handleUpdate = async () => {
    if (!nom.trim())      { Alert.alert('Erreur', 'Le nom est obligatoire.'); return; }
    if (!prix.trim())     { Alert.alert('Erreur', 'Le prix est obligatoire.'); return; }

    setSaving(true);
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

      const res = await fetch(`${API_URL}/api/products/${id}`, {
        method: 'POST',
        headers: { 'X-Token': session.token },
        body: form,
      });
      const json = await res.json();
      if (json.success) {
        Alert.alert('Succès', 'Produit mis à jour avec succès.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('Erreur', json.message ?? 'Mise à jour échouée.');
      }
    } catch (_) {
      Alert.alert('Erreur', 'Une erreur est survenue.');
    } finally {
      setSaving(false);
    }
  };

  const cats = categories.filter(c => !c.parent_id);
  const sousOfSelected = categories.filter(c => c.parent_id == idCat);
  const selectedCatNom  = cats.find(c => c.id == idCat)?.nom ?? '';
  const selectedSousNom = sousOfSelected.find(c => c.id == idSous)?.nom ?? '';

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

  const TabBar = () => (
    <View style={styles.tabBar}>
      {TABS.map((t, i) => (
        <TouchableOpacity
          key={t}
          style={[styles.tabItem, i === activeTab && styles.tabActive]}
          onPress={() => setActiveTab(i)}
        >
          <Text style={[styles.tabTxt, { color: i === activeTab ? TEAL : sub }]}>{t}</Text>
          {i === activeTab && <View style={styles.tabUnderline} />}
        </TouchableOpacity>
      ))}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={TEAL} size="large" />
      </SafeAreaView>
    );
  }

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
          <Text style={[styles.breadcrumb, { color: TEAL, fontWeight: '700' }]}>Modifier</Text>
        </View>
        <Text style={[styles.pageTitle, { color: txt }]}>Modifier produit</Text>

        <View style={[styles.card, { backgroundColor: card }]}>
          <Text style={[styles.cardTitle, { color: txt }]}>Modifier le produit</Text>
          <TabBar />

          {activeTab === 0 && (
            <View>
              <Text style={[styles.sectionTitle, { color: txt }]}>Informations</Text>
              <Field label="Nom produit" required value={nom} onChangeText={setNom} placeholder="Nom du produit" />
              <Field label="Référence" value={ref} onChangeText={setRef} placeholder="Référence" />
              <Field label="Marque" value={marque} onChangeText={setMarque} placeholder="Marque" />
              <Field label="Modèle" value={modele} onChangeText={setModele} placeholder="Modèle" />
              <Field label="Couleur" value={couleur} onChangeText={setCouleur} placeholder="Couleur" />

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Field label="Prix d'achat" required value={prixAchat} onChangeText={setPrixAchat} placeholder="Prix d'achat" keyboardType="decimal-pad" />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Field label="Prix de vente" required value={prix} onChangeText={setPrix} placeholder="Prix de vente" keyboardType="decimal-pad" />
                </View>
              </View>

              <View style={styles.fieldWrap}>
                <Text style={[styles.label, { color: sub }]}>Description</Text>
                <TextInput
                  style={[styles.textarea, { borderColor: border, backgroundColor: inputBg, color: txt }]}
                  placeholder="Description"
                  placeholderTextColor={sub}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Field label="Seuil" value={seuil} onChangeText={setSeuil} keyboardType="numeric" />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Field label="Quantité" required value={qte} onChangeText={setQte} keyboardType="numeric" />
                </View>
              </View>

              <View style={styles.navBtnRow}>
                <TouchableOpacity
                  style={[styles.nextBtn, { backgroundColor: TEAL }]}
                  onPress={() => setActiveTab(1)}
                >
                  <Text style={styles.nextBtnTxt}>Suivant →</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {activeTab === 1 && (
            <View>
              <Text style={[styles.sectionTitle, { color: txt }]}>Catégorie</Text>

              <Text style={[styles.label, { color: sub }]}>Catégorie <Text style={{ color: '#E74C3C' }}>*</Text></Text>
              <TouchableOpacity
                style={[styles.select, { borderColor: border, backgroundColor: inputBg }]}
                onPress={() => setShowCatPicker(!showCatPicker)}
              >
                <Text style={{ color: selectedCatNom ? txt : sub, flex: 1 }}>
                  {selectedCatNom || '-- Sélectionnez une catégorie --'}
                </Text>
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
                  <Text style={[styles.label, { color: sub, marginTop: 12 }]}>Sous-catégorie</Text>
                  <View style={[styles.select, { borderColor: border, backgroundColor: inputBg }]}>
                    <Text style={{ color: selectedSousNom ? txt : sub }}>
                      {selectedSousNom || '-- Sous-catégorie (optionnel) --'}
                    </Text>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                    {sousOfSelected.map(sc => (
                      <TouchableOpacity
                        key={sc.id}
                        style={[styles.subChip, { backgroundColor: idSous == sc.id ? TEAL : '#F0F4F8', marginRight: 8 }]}
                        onPress={() => setIdSous(idSous == sc.id ? 0 : sc.id)}
                      >
                        <Text style={{ color: idSous == sc.id ? '#fff' : sub, fontSize: 12 }}>{sc.nom}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}

              <View style={styles.navBtnRow}>
                <TouchableOpacity style={[styles.prevBtn, { borderColor: border }]} onPress={() => setActiveTab(0)}>
                  <Text style={{ color: sub, fontWeight: '600' }}>← Précédent</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.nextBtn, { backgroundColor: TEAL }]} onPress={() => setActiveTab(2)}>
                  <Text style={styles.nextBtnTxt}>Suivant →</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {activeTab === 2 && (
            <View>
              <Text style={[styles.sectionTitle, { color: txt }]}>Images</Text>
              <View style={styles.imgGrid}>
                {[0, 1, 2, 3].map(i => {
                  const hasNew  = !!photos[i];
                  const hasExisting = !!existingImgs[i];
                  const label = i === 0 ? 'Photo 1 (Principal)' : `Photo ${i + 1}`;
                  return (
                    <View key={i} style={styles.imgItem}>
                      <Text style={[styles.label, { color: i === 0 ? TEAL : sub, fontWeight: i === 0 ? '700' : '400' }]}>
                        {label}
                      </Text>
                      <View style={styles.filePickerRow}>
                        <TouchableOpacity
                          style={[styles.filePickerBtn, { borderColor: border, backgroundColor: inputBg }]}
                          onPress={() => pickImage(i)}
                        >
                          <Text style={{ color: txt, fontSize: 12 }}>Choisir un fichier</Text>
                        </TouchableOpacity>
                        <Text style={[styles.fileNameTxt, { color: sub }]} numberOfLines={1}>
                          {hasNew ? photos[i].uri.split('/').pop() : 'Aucun fichier'}
                        </Text>
                      </View>
                      {hasNew ? (
                        <Image source={{ uri: photos[i].uri }} style={styles.imgPreview} resizeMode="cover" />
                      ) : hasExisting ? (
                        <Image source={{ uri: existingImgs[i] }} style={styles.imgPreview} resizeMode="cover" />
                      ) : (
                        <View style={[styles.imgPlaceholder, { borderColor: border }]}>
                          <Ionicons name="add" size={28} color={sub} />
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>

              <View style={styles.navBtnRow}>
                <TouchableOpacity style={[styles.prevBtn, { borderColor: border }]} onPress={() => setActiveTab(1)}>
                  <Text style={{ color: sub, fontWeight: '600' }}>← Précédent</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.nextBtn, { backgroundColor: TEAL }]} onPress={() => setActiveTab(3)}>
                  <Text style={styles.nextBtnTxt}>Suivant →</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {activeTab === 3 && (
            <View style={styles.confirmContainer}>
              <Text style={[styles.sectionTitle, { color: txt }]}>Confirmation</Text>
              <View style={styles.confirmCenter}>
                <View style={styles.confirmIcon}>
                  <Text style={{ fontSize: 48 }}>📋</Text>
                </View>
                <Text style={[styles.confirmTitle, { color: txt }]}>Tout est prêt</Text>
                <Text style={[styles.confirmSub, { color: sub }]}>Confirmer les modifications</Text>
              </View>

              <View style={styles.navBtnRow}>
                <TouchableOpacity style={[styles.prevBtn, { borderColor: border }]} onPress={() => setActiveTab(2)}>
                  <Text style={{ color: sub, fontWeight: '600' }}>← Précédent</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.nextBtn, { backgroundColor: TEAL }, saving && { opacity: 0.6 }]}
                  onPress={handleUpdate}
                  disabled={saving}
                >
                  {saving
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.nextBtnTxt}>Mettre à jour</Text>}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
      <AppFooter />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:             { flex: 1 },
  scroll:           { paddingHorizontal: 16, paddingBottom: 80 },
  breadcrumbRow:    { flexDirection: 'row', marginTop: 14, marginBottom: 4, flexWrap: 'wrap' },
  breadcrumb:       { fontSize: 12 },
  pageTitle:        { fontSize: 22, fontWeight: '800', marginBottom: 14 },
  card:             { borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  cardTitle:        { fontSize: 17, fontWeight: '800', marginBottom: 14 },
  sectionTitle:     { fontSize: 15, fontWeight: '800', marginBottom: 14 },
  tabBar:           { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', marginBottom: 18 },
  tabItem:          { flex: 1, alignItems: 'center', paddingBottom: 10, position: 'relative' },
  tabTxt:           { fontSize: 12, fontWeight: '600' },
  tabActive:        {},
  tabUnderline:     { position: 'absolute', bottom: 0, left: '10%', right: '10%', height: 2, backgroundColor: TEAL, borderRadius: 2 },
  label:            { fontSize: 13, marginBottom: 5 },
  fieldWrap:        { marginBottom: 12 },
  input:            { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14 },
  textarea:         { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, height: 90, textAlignVertical: 'top' },
  row:              { flexDirection: 'row' },
  select:           { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 4 },
  picker:           { borderWidth: 1, borderRadius: 10, marginBottom: 8, overflow: 'hidden' },
  pickerItem:       { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  subChip:          { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  navBtnRow:        { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 20 },
  prevBtn:          { borderWidth: 1.5, borderRadius: 22, paddingHorizontal: 20, paddingVertical: 11 },
  nextBtn:          { borderRadius: 22, paddingHorizontal: 24, paddingVertical: 11 },
  nextBtnTxt:       { color: '#fff', fontWeight: '700', fontSize: 14 },
  imgGrid:          { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  imgItem:          { width: '47%' },
  filePickerRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  filePickerBtn:    { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  fileNameTxt:      { fontSize: 11, flex: 1 },
  imgPreview:       { width: '100%', height: 120, borderRadius: 10 },
  imgPlaceholder:   { width: '100%', height: 120, borderRadius: 10, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  confirmContainer: {},
  confirmCenter:    { alignItems: 'center', paddingVertical: 30 },
  confirmIcon:      { marginBottom: 16 },
  confirmTitle:     { fontSize: 20, fontWeight: '800', marginBottom: 6 },
  confirmSub:       { fontSize: 14 },
});