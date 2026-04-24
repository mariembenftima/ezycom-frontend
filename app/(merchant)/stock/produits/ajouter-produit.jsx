// app/(merchant)/stock/produits/ajouter-produit.jsx

import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import VariantesSection from '../../../../components/VariantesSection';
import { API_URL } from '../../../../config';
import { loadSession } from '../../../../utils/auth';

const TEAL = '#29B6D8';
const TEAL_BG = '#E8F8FC';
const GRAY = '#6B7280';
const BORDER = '#E5E7EB';
const RED = '#EF4444';
const MAX_IMAGES = 4;

// ── Field hors du composant — évite la fermeture du clavier au re-render ────
const Field = ({ label, value, onChange, placeholder, keyboardType = 'default',
  multiline = false, required = false, hasError = false, errorMessage = '' }) => (
  <View style={styles.fieldWrapper}>
    <Text style={styles.fieldLabel}>
      {label}{required && <Text style={{ color: RED }}> *</Text>}
    </Text>
    <TextInput
      style={[styles.input, multiline && styles.inputMultiline, hasError && styles.inputError]}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor="#9CA3AF"
      keyboardType={keyboardType}
      multiline={multiline}
      numberOfLines={multiline ? 4 : 1}
      textAlignVertical={multiline ? 'top' : 'center'}
    />
    {hasError && <Text style={styles.errorText}>{errorMessage}</Text>}
  </View>
);

export default function AjouterProduit() {
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [nom, setNom] = useState('');
  const [ref, setRef] = useState('');
  const [prix, setPrix] = useState('');
  const [prixAchat, setPrixAchat] = useState('');
  const [qte, setQte] = useState('');
  const [description, setDescription] = useState('');
  const [idCat, setIdCat] = useState('');
  const [idSousCat, setIdSousCat] = useState('');
  const [categories, setCategories] = useState([]);
  const [images, setImages] = useState([]);
  const [variantes, setVariantes] = useState([]);   // ← NOUVEAU
  const [errors, setErrors] = useState({});

  useEffect(() => {
    (async () => {
      const session = await loadSession();
      if (!session?.token) { router.replace('/(auth)/login'); return; }
      setToken(session.token);
      fetchCategories(session.token);
    })();
  }, []);

  const fetchCategories = async (tok) => {
    try {
      const res = await fetch(`${API_URL}/api/categories`, { headers: { 'X-Token': tok } });
      const data = await res.json();
      if (data.success) setCategories(Array.isArray(data.data) ? data.data : []);
    } catch (_) { }
  };

  const validate = () => {
    const e = {};
    if (!nom.trim()) e.nom = 'Le nom est obligatoire.';
    if (!prix.trim()) e.prix = 'Le prix est obligatoire.';
    if (prix && isNaN(parseFloat(prix))) e.prix = 'Prix invalide.';
    if (prixAchat && isNaN(parseFloat(prixAchat))) e.prixAchat = 'Prix achat invalide.';
    if (qte && isNaN(parseInt(qte))) e.qte = 'Quantité invalide.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const pickImage = async () => {
    if (images.length >= MAX_IMAGES) { Alert.alert('Maximum atteint', `Max ${MAX_IMAGES} images.`); return; }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission refusée', "Autorisez l'accès à la galerie."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.85 });
    if (result.canceled) return;
    const asset = result.assets[0];
    const ext = asset.uri.split('.').pop().toLowerCase() || 'jpg';
    const mimes = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
    setImages(prev => [...prev, { uri: asset.uri, name: `photo_${Date.now()}.${ext}`, type: mimes[ext] || 'image/jpeg', uploading: false, uploaded: false, error: null }]);
  };

  const takePhoto = async () => {
    if (images.length >= MAX_IMAGES) { Alert.alert('Maximum atteint', `Max ${MAX_IMAGES} images.`); return; }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission refusée', "Autorisez l'accès à la caméra."); return; }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.85 });
    if (result.canceled) return;
    setImages(prev => [...prev, { uri: result.assets[0].uri, name: `photo_${Date.now()}.jpg`, type: 'image/jpeg', uploading: false, uploaded: false, error: null }]);
  };

  const removeImage = (index) => setImages(prev => prev.filter((_, i) => i !== index));

  const uploadImage = async (imageObj, productId, tok) => {
    const fd = new FormData();
    fd.append('image', { uri: imageObj.uri, name: imageObj.name, type: imageObj.type });
    const res = await fetch(`${API_URL}/api/products/${productId}/image`, { method: 'POST', headers: { 'X-Token': tok }, body: fd });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Erreur upload image');
  };

  // ── NOUVEAU : upload variante ──────────────────────────────────────────────
  const uploadVariante = async (variante, productId, tok) => {
    const res = await fetch(`${API_URL}/api/products/${productId}/variation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Token': tok },
      body: JSON.stringify(variante),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Erreur variante');
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      // Étape 1 : créer le produit
      const res = await fetch(`${API_URL}/api/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Token': token },
        body: JSON.stringify({
          nom: nom.trim(), ref: ref.trim(),
          prix: parseFloat(prix) || 0, prix_achat: parseFloat(prixAchat) || 0,
          qte: parseInt(qte) || 0, description: description.trim(),
          id_cat: idCat ? parseInt(idCat) : null, id_sous_cat: idSousCat ? parseInt(idSousCat) : null,
          etat: 1,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) { Alert.alert('Erreur', data.message || 'Impossible de créer le produit.'); setLoading(false); return; }
      const productId = data.data?.id;

      // Étape 2 : images
      if (images.length > 0 && productId) {
        const errs = [];
        for (let i = 0; i < images.length; i++) {
          setImages(prev => prev.map((img, idx) => idx === i ? { ...img, uploading: true } : img));
          try {
            await uploadImage(images[i], productId, token);
            setImages(prev => prev.map((img, idx) => idx === i ? { ...img, uploading: false, uploaded: true } : img));
          } catch (err) {
            errs.push(`Image ${i + 1} : ${err.message}`);
            setImages(prev => prev.map((img, idx) => idx === i ? { ...img, uploading: false, error: err.message } : img));
          }
        }
        if (errs.length > 0) { Alert.alert('Erreurs images', errs.join('\n'), [{ text: 'OK', onPress: () => router.back() }]); setLoading(false); return; }
      }

      // Étape 3 : variantes   ← NOUVEAU BLOC
      if (variantes.length > 0 && productId) {
        const errs = [];
        for (const v of variantes) {
          try { await uploadVariante(v, productId, token); }
          catch (err) { errs.push(`Variante ${v._label || ''} : ${err.message}`); }
        }
        if (errs.length > 0) { Alert.alert('Erreurs variantes', errs.join('\n'), [{ text: 'OK', onPress: () => router.back() }]); setLoading(false); return; }
      }

      Alert.alert('Succès', 'Produit ajouté avec succès !', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (_) {
      Alert.alert('Erreur réseau', 'Vérifiez votre connexion et réessayez.');
    } finally {
      setLoading(false);
    }
  };

  const renderImages = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Photos du produit</Text>
      <Text style={styles.cardSub}>{images.length}/{MAX_IMAGES} — Appuyez pour ajouter</Text>
      <View style={styles.imageGrid}>
        {images.map((img, index) => (
          <View key={index} style={styles.imageSlot}>
            <Image source={{ uri: img.uri }} style={styles.imageThumbnail} />
            {img.uploading && <View style={styles.imageOverlay}><ActivityIndicator color="#fff" size="small" /></View>}
            {img.uploaded && <View style={[styles.imageBadge, { backgroundColor: '#10B981' }]}><Text style={styles.imageBadgeText}>✓</Text></View>}
            {img.error && <View style={[styles.imageBadge, { backgroundColor: RED }]}><Text style={styles.imageBadgeText}>!</Text></View>}
            {!img.uploading && (
              <TouchableOpacity style={styles.imageDelete} onPress={() => removeImage(index)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.imageDeleteText}>×</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
        {images.length < MAX_IMAGES && (
          <View style={styles.addSlotWrapper}>
            <TouchableOpacity style={styles.addSlotGalerie} onPress={pickImage} activeOpacity={0.7}>
              <Text style={styles.addSlotIcon}>🖼</Text><Text style={styles.addSlotLabel}>Galerie</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addSlotCamera} onPress={takePhoto} activeOpacity={0.7}>
              <Text style={styles.addSlotIcon}>📷</Text><Text style={styles.addSlotLabel}>Caméra</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      <Text style={styles.imageHint}>Formats acceptés : JPG, PNG, WEBP — Max 5 Mo par image</Text>
    </View>
  );



  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ajouter un produit</Text>
        <View style={{ width: 36 }} />
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Informations */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Informations générales</Text>
            <Field label="Nom du produit" value={nom} onChange={setNom} placeholder="Ex : Cafetière électrique" required hasError={!!errors.nom} errorMessage={errors.nom} />
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}><Field label="Référence" value={ref} onChange={setRef} placeholder="REF-001" hasError={!!errors.ref} errorMessage={errors.ref} /></View>
              <View style={{ flex: 1, marginLeft: 8 }}><Field label="Quantité" value={qte} onChange={setQte} placeholder="0" keyboardType="numeric" hasError={!!errors.qte} errorMessage={errors.qte} /></View>
            </View>
            <Field label="Description" value={description} onChange={setDescription} placeholder="Décrivez votre produit..." multiline hasError={!!errors.description} errorMessage={errors.description} />
          </View>

          {/* Prix */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Prix</Text>
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}><Field label="Prix de vente (TND)" value={prix} onChange={setPrix} placeholder="0.000" keyboardType="decimal-pad" required hasError={!!errors.prix} errorMessage={errors.prix} /></View>
              <View style={{ flex: 1, marginLeft: 8 }}><Field label="Prix d'achat (TND)" value={prixAchat} onChange={setPrixAchat} placeholder="0.000" keyboardType="decimal-pad" hasError={!!errors.prixAchat} errorMessage={errors.prixAchat} /></View>
            </View>
          </View>

          {/* Catégorie */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Catégorie</Text>
            <View style={styles.fieldWrapper}>
              <Text style={styles.fieldLabel}>Catégorie principale</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                {categories.filter(c => !c.parent_id).map(cat => (
                  <TouchableOpacity key={cat.id} style={[styles.chip, idCat === String(cat.id) && styles.chipActive]}
                    onPress={() => { setIdCat(p => p === String(cat.id) ? '' : String(cat.id)); setIdSousCat(''); }}>
                    <Text style={[styles.chipText, idCat === String(cat.id) && styles.chipTextActive]}>{cat.nom}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            {idCat !== '' && categories.filter(c => String(c.parent_id) === idCat).length > 0 && (
              <View style={styles.fieldWrapper}>
                <Text style={styles.fieldLabel}>Sous-catégorie</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                  {categories.filter(c => String(c.parent_id) === idCat).map(sc => (
                    <TouchableOpacity key={sc.id} style={[styles.chip, idSousCat === String(sc.id) && styles.chipActive]}
                      onPress={() => setIdSousCat(p => p === String(sc.id) ? '' : String(sc.id))}>
                      <Text style={[styles.chipText, idSousCat === String(sc.id) && styles.chipTextActive]}>{sc.nom}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Images */}
          {renderImages()}

          {/* Variantes ← NOUVEAU */}
          <VariantesSection token={token} variantes={variantes} onVariantesChange={setVariantes} />

          {/* Bouton */}
          <TouchableOpacity style={[styles.submitBtn, loading && styles.submitBtnDisabled]} onPress={handleSubmit} disabled={loading} activeOpacity={0.8}>
            {loading ? (
              <View style={styles.submitLoading}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.submitText}>
                  {images.filter(i => i.uploaded).length < images.length
                    ? `Images (${images.filter(i => i.uploaded).length}/${images.length})...`
                    : variantes.length > 0 ? `Variantes...` : 'Enregistrement...'}
                </Text>
              </View>
            ) : (
              <Text style={styles.submitText}>Enregistrer le produit</Text>
            )}
          </TouchableOpacity>
          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: BORDER },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 28, color: TEAL, lineHeight: 32 },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#111827' },
  scroll: { padding: 16, gap: 12 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: BORDER, marginBottom: 4 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 4 },
  cardSub: { fontSize: 12, color: GRAY, marginBottom: 12 },
  fieldWrapper: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: BORDER, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#111827', backgroundColor: '#fff' },
  inputMultiline: { height: 100, paddingTop: 10 },
  inputError: { borderColor: RED },
  errorText: { fontSize: 12, color: RED, marginTop: 4 },
  row: { flexDirection: 'row' },
  chipScroll: { flexDirection: 'row' },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: BORDER, marginRight: 8, backgroundColor: '#F9FAFB' },
  chipActive: { backgroundColor: TEAL_BG, borderColor: TEAL },
  chipText: { fontSize: 13, color: GRAY },
  chipTextActive: { color: TEAL, fontWeight: '600' },
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginVertical: 12 },
  imageSlot: { width: 80, height: 80, borderRadius: 10, overflow: 'hidden', position: 'relative' },
  imageThumbnail: { width: '100%', height: '100%', resizeMode: 'cover' },
  imageOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  imageBadge: { position: 'absolute', bottom: 4, left: 4, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  imageBadgeText: { fontSize: 10, color: '#fff', fontWeight: '700' },
  imageDelete: { position: 'absolute', top: 2, right: 2, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  imageDeleteText: { color: '#fff', fontSize: 14, lineHeight: 18, fontWeight: '700' },
  addSlotWrapper: { flexDirection: 'row', gap: 8 },
  addSlotGalerie: { width: 80, height: 80, borderRadius: 10, borderWidth: 1.5, borderColor: TEAL, borderStyle: 'dashed', backgroundColor: TEAL_BG, alignItems: 'center', justifyContent: 'center', gap: 4 },
  addSlotCamera: { width: 80, height: 80, borderRadius: 10, borderWidth: 1.5, borderColor: BORDER, borderStyle: 'dashed', backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center', gap: 4 },
  addSlotIcon: { fontSize: 22 },
  addSlotLabel: { fontSize: 10, color: GRAY },
  imageHint: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
  submitBtn: { backgroundColor: TEAL, borderRadius: 12, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  submitBtnDisabled: { opacity: 0.7 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  submitLoading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});