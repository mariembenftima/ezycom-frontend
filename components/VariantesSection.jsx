// components/VariantesSection.jsx
// Composant réutilisable pour gérer les variantes dans ajouter-produit.jsx
// et modifier-produit.jsx
//
// USAGE dans ajouter-produit.jsx :
//   import VariantesSection from '../../../../components/VariantesSection';
//   ...
//   <VariantesSection token={token} variantes={variantes} onVariantesChange={setVariantes} />
//
// Puis dans handleSubmit, après la création du produit :
//   for (const v of variantes) {
//     await fetch(`${API_URL}/api/products/${productId}/variation`, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json', 'X-Token': token },
//       body: JSON.stringify(v),
//     });
//   }

import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { API_URL } from '../config';

const TEAL     = '#29B6D8';
const TEAL_BG  = '#E8F8FC';
const BORDER   = '#E5E7EB';
const GRAY     = '#6B7280';
const RED      = '#EF4444';
const RED_BG   = '#FEE2E2';

// Extrait le hex d'une valeur couleur ex: "Noir #000000" → "#000000"
function extractHex(valeur) {
  const match = valeur.match(/#([0-9A-Fa-f]{6})/);
  return match ? match[0] : null;
}

// Retourne le nom sans le hex ex: "Noir #000000" → "Noir"
function cleanLabel(valeur) {
  return valeur.replace(/#[0-9A-Fa-f]{6}/, '').trim();
}

// Chip sélectionnable pour taille ou couleur
function ValeurChip({ valeur, selected, onPress }) {
  const hex = extractHex(valeur.valeur);
  const label = cleanLabel(valeur.valeur);

  if (hex) {
    // Chip couleur : cercle coloré + nom
    const isWhite = hex.toLowerCase() === '#ffffff';
    return (
      <TouchableOpacity
        style={[styles.colorChip, selected && styles.colorChipActive]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={[
          styles.colorDot,
          { backgroundColor: hex },
          isWhite && styles.colorDotWhite,
        ]} />
        <Text style={[
          styles.chipText,
          selected && styles.chipTextActive,
        ]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  }

  // Chip taille : texte simple
  return (
    <TouchableOpacity
      style={[styles.sizeChip, selected && styles.sizeChipActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.sizeChipText, selected && styles.sizeChipTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function VariantesSection({ token, variantes = [], onVariantesChange }) {
  const [attributs, setAttributs]       = useState([]);  // [{id, nom, valeurs:[]}]
  const [loadingAttr, setLoadingAttr]   = useState(true);

  // Sélection en cours pour construire une nouvelle variante
  const [selectedValeurs, setSelectedValeurs] = useState({}); // { id_attribut: id_valeur }
  const [prixVariante,    setPrixVariante]    = useState('');
  const [qteVariante,     setQteVariante]     = useState('');
  const [skuVariante,     setSkuVariante]     = useState('');
  const [errVariante,     setErrVariante]     = useState('');

  // Charger les attributs du commerçant
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res  = await fetch(`${API_URL}/api/products/attributs`, {
          headers: { 'X-Token': token },
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setAttributs(data.data);
        }
      } catch (_) {
        /* silencieux */
      } finally {
        setLoadingAttr(false);
      }
    })();
  }, [token]);

  const toggleValeur = (idAttribut, idValeur) => {
    setSelectedValeurs(prev => {
      // Si déjà sélectionné → désélectionner
      if (prev[idAttribut] === idValeur) {
        const copy = { ...prev };
        delete copy[idAttribut];
        return copy;
      }
      return { ...prev, [idAttribut]: idValeur };
    });
    setErrVariante('');
  };

  // Ajouter la variante à la liste locale
  const ajouterVariante = () => {
    if (Object.keys(selectedValeurs).length === 0) {
      setErrVariante('Sélectionnez au moins une valeur (taille ou couleur).');
      return;
    }
    if (!prixVariante.trim() || isNaN(parseFloat(prixVariante))) {
      setErrVariante('Le prix de la variante est obligatoire.');
      return;
    }

    // Construire le label lisible pour affichage ex: "S / Noir"
    const labels = Object.entries(selectedValeurs).map(([idAttr, idVal]) => {
      const attr = attributs.find(a => a.id === parseInt(idAttr));
      const val  = attr?.valeurs.find(v => v.id === idVal);
      return val ? cleanLabel(val.valeur) : '';
    }).filter(Boolean);

    const nouvelleVariante = {
      valeurs:    Object.values(selectedValeurs),  // [id_valeur1, id_valeur2]
      prix:       parseFloat(prixVariante),
      qte:        parseInt(qteVariante) || 0,
      sku:        skuVariante.trim(),
      _label:     labels.join(' / '),              // usage interne affichage seulement
    };

    onVariantesChange([...variantes, nouvelleVariante]);

    // Reset sélection
    setSelectedValeurs({});
    setPrixVariante('');
    setQteVariante('');
    setSkuVariante('');
    setErrVariante('');
  };

  const supprimerVariante = (index) => {
    Alert.alert(
      'Supprimer la variante',
      'Êtes-vous sûr de vouloir supprimer cette variante ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => onVariantesChange(variantes.filter((_, i) => i !== index)),
        },
      ]
    );
  };

  if (loadingAttr) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Variantes</Text>
        <ActivityIndicator color={TEAL} style={{ marginTop: 12 }} />
      </View>
    );
  }

  if (attributs.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Variantes</Text>
        <Text style={styles.emptyText}>
          Aucun attribut configuré. Ajoutez des attributs (Taille, Couleur...)
          depuis le back-office web Ezycom.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Variantes</Text>
      <Text style={styles.cardSub}>
        Créez des combinaisons taille / couleur avec leur prix et stock propres
      </Text>

      {/* Sélecteurs d'attributs */}
      {attributs.map(attr => (
        <View key={attr.id} style={styles.attrBlock}>
          <Text style={styles.attrLabel}>{attr.nom}</Text>
          <View style={styles.chipsRow}>
            {attr.valeurs.map(val => (
              <ValeurChip
                key={val.id}
                valeur={val}
                selected={selectedValeurs[attr.id] === val.id}
                onPress={() => toggleValeur(attr.id, val.id)}
              />
            ))}
          </View>
        </View>
      ))}

      {/* Prix et quantité de la variante */}
      <View style={styles.row}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={styles.fieldLabel}>Prix (TND)</Text>
          <TextInput
            style={styles.input}
            value={prixVariante}
            onChangeText={v => { setPrixVariante(v); setErrVariante(''); }}
            placeholder="0.000"
            placeholderTextColor="#9CA3AF"
            keyboardType="decimal-pad"
          />
        </View>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.fieldLabel}>Stock</Text>
          <TextInput
            style={styles.input}
            value={qteVariante}
            onChangeText={v => { setQteVariante(v); setErrVariante(''); }}
            placeholder="0"
            placeholderTextColor="#9CA3AF"
            keyboardType="numeric"
          />
        </View>
      </View>

      <View style={{ marginBottom: 12 }}>
        <Text style={styles.fieldLabel}>SKU (optionnel)</Text>
        <TextInput
          style={styles.input}
          value={skuVariante}
          onChangeText={setSkuVariante}
          placeholder="Ex: REF-S-NOIR"
          placeholderTextColor="#9CA3AF"
          autoCapitalize="characters"
        />
      </View>

      {errVariante ? (
        <Text style={styles.errorText}>{errVariante}</Text>
      ) : null}

      {/* Bouton ajouter variante */}
      <TouchableOpacity
        style={styles.addBtn}
        onPress={ajouterVariante}
        activeOpacity={0.8}
      >
        <Text style={styles.addBtnText}>+ Ajouter cette variante</Text>
      </TouchableOpacity>

      {/* Liste des variantes ajoutées */}
      {variantes.length > 0 && (
        <View style={styles.variantesList}>
          <Text style={styles.variantesTitle}>
            {variantes.length} variante{variantes.length > 1 ? 's' : ''} ajoutée{variantes.length > 1 ? 's' : ''}
          </Text>
          {variantes.map((v, i) => (
            <View key={i} style={styles.varianteRow}>
              <View style={styles.varianteInfo}>
                <Text style={styles.varianteLabel}>{v._label || 'Variante ' + (i + 1)}</Text>
                <Text style={styles.varianteSub}>
                  {v.prix.toFixed(3)} TND · Stock : {v.qte}
                  {v.sku ? ` · ${v.sku}` : ''}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => supprimerVariante(i)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.deleteBtn}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius:    12,
    padding:         16,
    borderWidth:     1,
    borderColor:     BORDER,
    marginBottom:    4,
  },
  cardTitle: {
    fontSize:     15,
    fontWeight:   '600',
    color:        '#111827',
    marginBottom:  4,
  },
  cardSub: {
    fontSize:     12,
    color:        GRAY,
    marginBottom: 14,
  },
  emptyText: {
    fontSize:  13,
    color:     GRAY,
    marginTop: 8,
    lineHeight: 20,
  },

  // Attributs
  attrBlock: {
    marginBottom: 14,
  },
  attrLabel: {
    fontSize:     13,
    fontWeight:   '500',
    color:        '#374151',
    marginBottom:  8,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:            8,
  },

  // Chip taille
  sizeChip: {
    paddingHorizontal: 14,
    paddingVertical:    8,
    borderRadius:      8,
    borderWidth:       1,
    borderColor:       BORDER,
    backgroundColor:   '#F9FAFB',
  },
  sizeChipActive: {
    backgroundColor: TEAL_BG,
    borderColor:     TEAL,
  },
  sizeChipText: {
    fontSize:   13,
    color:      GRAY,
    fontWeight: '500',
  },
  sizeChipTextActive: {
    color: TEAL,
  },

  // Chip couleur
  colorChip: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:             6,
    paddingHorizontal: 10,
    paddingVertical:    7,
    borderRadius:   8,
    borderWidth:    1,
    borderColor:    BORDER,
    backgroundColor:'#F9FAFB',
  },
  colorChipActive: {
    backgroundColor: TEAL_BG,
    borderColor:     TEAL,
  },
  colorDot: {
    width:        16,
    height:       16,
    borderRadius: 8,
  },
  colorDotWhite: {
    borderWidth: 1,
    borderColor: BORDER,
  },
  chipText: {
    fontSize: 12,
    color:    GRAY,
  },
  chipTextActive: {
    color: TEAL,
  },

  // Champs
  row: {
    flexDirection: 'row',
    marginBottom:  12,
  },
  fieldLabel: {
    fontSize:     13,
    fontWeight:   '500',
    color:        '#374151',
    marginBottom:  6,
  },
  input: {
    borderWidth:       1,
    borderColor:       BORDER,
    borderRadius:      8,
    paddingHorizontal: 12,
    paddingVertical:   10,
    fontSize:          14,
    color:             '#111827',
    backgroundColor:   '#fff',
  },
  errorText: {
    fontSize:     12,
    color:        RED,
    marginBottom:  8,
  },

  // Bouton ajouter
  addBtn: {
    borderWidth:     1.5,
    borderColor:     TEAL,
    borderRadius:    10,
    borderStyle:     'dashed',
    paddingVertical: 12,
    alignItems:      'center',
    backgroundColor: TEAL_BG,
    marginTop:        4,
  },
  addBtnText: {
    color:      TEAL,
    fontSize:   14,
    fontWeight: '600',
  },

  // Liste variantes
  variantesList: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop:     12,
  },
  variantesTitle: {
    fontSize:     12,
    fontWeight:   '500',
    color:        GRAY,
    marginBottom:  8,
  },
  varianteRow: {
    flexDirection:  'row',
    alignItems:     'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  varianteInfo: {
    flex: 1,
  },
  varianteLabel: {
    fontSize:   13,
    fontWeight: '500',
    color:      '#111827',
  },
  varianteSub: {
    fontSize:  11,
    color:     GRAY,
    marginTop:  2,
  },
  deleteBtn: {
    fontSize:  22,
    color:     RED,
    lineHeight: 26,
    paddingHorizontal: 4,
  },
});