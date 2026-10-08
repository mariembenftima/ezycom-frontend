import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import { router, useFocusEffect } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
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
import api from '../../../../utils/api';
import { loadSession } from '../../../../utils/auth';
import { loadDarkMode, saveDarkMode } from '../../../../utils/darkMode';
import { DARK_BG, TEAL } from '../../../../utils/theme';
import AppFooter from '../../../components/AppFooter';
import AppHeader from '../../../components/AppHeader';
const LIMIT_OPTIONS = [4, 8, 10, 20, 50];

export default function ProduitsScreen() {
  const [session, setSession] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  useEffect(() => {
    loadDarkMode().then(setDarkMode);
  }, []);
  const [produits, setProduits] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(4);

  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const [idCat, setIdCat] = useState(0);
  const [idSous, setIdSous] = useState(0);

  const [showLimitPicker, setShowLimitPicker] = useState(false);
  const [showCatPicker, setShowCatPicker] = useState(false);
  const [selectedProduit, setSelectedProduit] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const bg = darkMode ? DARK_BG : '#EEF4F8';
  const card = darkMode ? '#1A2A3D' : '#FFFFFF';
  const txt = darkMode ? '#FFFFFF' : '#0D1B2A';
  const sub = darkMode ? '#8899AA' : '#6A7A8A';

  const lastFetchRef = useRef(0);
  const MIN_REFRESH_INTERVAL_MS = 3000;

  useFocusEffect(
    useCallback(() => {
      loadSession().then(s => {
        setSession(s);
        if (s) {
          const now = Date.now();
          if (now - lastFetchRef.current < MIN_REFRESH_INTERVAL_MS) return;
          lastFetchRef.current = now;
          fetchCategories();
          fetchProduits(1);
        }
      });
    }, [])
  );


  const fetchCategories = async () => {
    try {
      const json = await api.get('/api/categories/categories-list.php');
      if (json.success) setCategories(json.data?.categories ?? json.data ?? []);
    } catch (_) { }
  };

  const fetchProduits = async (p = 1, q = search, cat = idCat, sous = idSous, lim = limit) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, limit: lim });
      if (q) params.append('search', q);
      if (cat) params.append('id_cat', cat);
      if (sous) params.append('id_sous_cat', sous);
      const json = await api.get(`/api/products/produits/products-list.php?${params}`);
      if (json.success) {
        setProduits(json.data?.produits ?? []);
        setTotal(json.data?.total ?? 0);
        setTotalPages(json.data?.pages ?? 1);
        setPage(p);
      }
    } catch (_) {
      Alert.alert('Erreur', 'Impossible de charger les produits.');
    } finally { setLoading(false); }
  };


  const [exporting, setExporting] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [csvImporting, setCsvImporting] = useState(false);

  const deleteProduit = (id) => {
    Alert.alert('Supprimer', 'Confirmer la suppression de ce produit ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/api/products/produits/products-delete.php?id=${id}`);
            fetchProduits(page);
          } catch (_) {
            Alert.alert('Erreur', 'Suppression échouée.');
          }
        },
      },
    ]);
  };

  const openDetails = (p) => {
    setSelectedProduit(p);
    setShowDetails(true);
  };

  const handleDownloadTemplate = async () => {
    try {
      const session = await loadSession();
      const token = await session?.token || await AsyncStorage.getItem('ezycom_token');
      const fileUri = FileSystem.documentDirectory + 'modele-produits.csv';
      const result = await FileSystem.downloadAsync(
        `${API_URL}/api/products/csv-template.php`,
        fileUri,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (result.status !== 200) throw new Error('Échec du téléchargement');
      await Sharing.shareAsync(result.uri, {
        mimeType: 'text/csv',
        dialogTitle: 'Modèle CSV produits',
        UTI: 'public.comma-separated-values-text',
      });
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de télécharger le modèle : ' + e.message);
    }
  };

  const handlePickFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/csv', '*/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (res.canceled) return;
      const asset = res.assets?.[0];
      if (!asset) return;
      setCsvFile({ name: asset.name, uri: asset.uri });
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de sélectionner le fichier : ' + e.message);
    }
  };

  const handleImportCSV = async () => {
    if (!csvFile) {
      Alert.alert('Aucun fichier', 'Veuillez d\'abord choisir un fichier CSV.');
      return;
    }
    setCsvImporting(true);
    try {
      const content = await FileSystem.readAsStringAsync(csvFile.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const data = await api.post('/api/products/import-csv.php', { csv: content });
      if (data.success) {
        const inserted = data.data?.inserted ?? 0;
        const errCount = data.data?.error_count ?? 0;
        Alert.alert(
          'Import terminé',
          `${inserted} produit(s) créé(s).` + (errCount > 0 ? `\n${errCount} erreur(s) ignorée(s).` : ''),
          [{ text: 'OK', onPress: () => { setCsvFile(null); fetchProduits(1); } }]
        );
      } else {
        Alert.alert('Erreur', data.message || 'Échec de l\'import.');
      }
    } catch (e) {
      Alert.alert('Erreur', e.message || 'Import impossible.');
    } finally {
      setCsvImporting(false);
    }
  };


  const fetchAllProduits = async () => {
    const params = new URLSearchParams({ page: 1, limit: 9999 });
    if (search) params.append('search', search);
    if (idCat) params.append('id_cat', idCat);
    if (idSous) params.append('id_sous_cat', idSous);
    const json = await api.get(`/api/products/produits/products-list.php?${params}`);
    return json.data?.produits ?? [];
};

  const COLONNES = [
    { key: 'ref', label: 'Référence' },
    { key: 'nom', label: 'Nom du produit' },
    { key: 'categorie_nom', label: 'Catégorie' },
    { key: 'sous_categorie_nom', label: 'Sous-catégorie' },
    { key: 'marque', label: 'Marque' },
    { key: 'modele', label: 'Modèle' },
    { key: 'couleur', label: 'Couleur' },
    { key: 'prix', label: 'Prix de vente (DT)' },
    { key: 'prix_achat', label: "Prix d'achat (DT)" },
    { key: 'qte', label: 'Quantité' },
    { key: 'seuil', label: "Seuil d'alerte" },
    { key: 'etat', label: 'Statut' },
    { key: 'description', label: 'Description' },
    { key: 'date_add', label: "Date d'ajout" },
  ];

  const formatVal = (key, val, produit) => {
    if (key === 'etat') return (val == 1 && parseInt(produit?.qte ?? val) > 0) ? 'Actif' : 'Inactif';
    if (val === null || val === undefined || val === '') return '—';
    return String(val);
  };

  const SAF = FileSystem.StorageAccessFramework;

  const saveWithSAF = async (content, fileName, mimeType, encoding = FileSystem.EncodingType.UTF8) => {
    try {
      const permissions = await SAF.requestDirectoryPermissionsAsync();
      if (!permissions.granted) {
        Alert.alert('Annulé', 'Aucun dossier sélectionné.');
        return;
      }

      const fileUri = await SAF.createFileAsync(
        permissions.directoryUri,
        fileName,
        mimeType
      );

      await FileSystem.writeAsStringAsync(fileUri, content, { encoding });

      Alert.alert('✓ Enregistré', `"${fileName}" a été sauvegardé dans le dossier choisi.`);
    } catch (e) {
      Alert.alert('Erreur', 'Impossible d\'enregistrer : ' + e.message);
    }
  };

  const saveFileSAF = async (sourceUri, fileName, mimeType) => {
    try {
      const permissions = await SAF.requestDirectoryPermissionsAsync();
      if (!permissions.granted) {
        Alert.alert('Annulé', 'Aucun dossier sélectionné.');
        return;
      }

      const destUri = await SAF.createFileAsync(
        permissions.directoryUri,
        fileName,
        mimeType
      );

      const base64 = await FileSystem.readAsStringAsync(sourceUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      await FileSystem.writeAsStringAsync(destUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      Alert.alert('✓ Enregistré', `"${fileName}" a été sauvegardé dans le dossier choisi.`);
    } catch (e) {
      Alert.alert('Erreur', 'Impossible d\'enregistrer : ' + e.message);
    }
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const data = await fetchAllProduits();
      if (!data.length) { Alert.alert('Export', 'Aucun produit à exporter.'); return; }

      const escapeCSV = (val) => {
        const s = String(val ?? '').replace(/"/g, '""');
        return /[",\n;]/.test(s) ? `"${s}"` : s;
      };

      const header = COLONNES.map(c => escapeCSV(c.label)).join(';');
      const rows = data.map(p =>
        COLONNES.map(c => escapeCSV(formatVal(c.key, p[c.key], p))).join(';')
      );

      const csv = '\uFEFF' + [header, ...rows].join('\n');
      const fileName = `produits_${new Date().toISOString().slice(0, 10)}.csv`;
      const fileUri = FileSystem.cacheDirectory + fileName;

      await FileSystem.writeAsStringAsync(fileUri, csv, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      await saveWithSAF(
        csv,
        fileName,
        'text/csv',
        FileSystem.EncodingType.UTF8
      );
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de générer le fichier CSV : ' + e.message);
    } finally {
      setExporting(false);
    }
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const data = await fetchAllProduits();
      if (!data.length) { Alert.alert('Export', 'Aucun produit à exporter.'); return; }

      const date = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

      const colWidths = {
        ref: '7%',
        nom: '13%',
        categorie_nom: '9%',
        sous_categorie_nom: '9%',
        marque: '7%',
        modele: '6%',
        couleur: '6%',
        prix: '6%',
        prix_achat: '6%',
        qte: '5%',
        seuil: '5%',
        etat: '6%',
        description: '12%',
        date_add: '8%',
      };

      const headerCols = COLONNES.map(c =>
        `<th style="width:${colWidths[c.key]}">${c.label}</th>`
      ).join('');

      const bodyRows = data.map((p, i) => {
        const bg = i % 2 === 0 ? '#ffffff' : '#f0fbfe';
        const cols = COLONNES.map(c => {
          const val = formatVal(c.key, p[c.key], p);
          const isEtat = c.key === 'etat';
          return `<td style="${isEtat ? `color:${p.etat == 1 && parseInt(p.qte) > 0 ? '#27AE60' : '#E74C3C'};font-weight:bold;` : ''}">${val}</td>`;
        }).join('');
        return `<tr style="background:${bg}">${cols}</tr>`;
      }).join('');

      const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  @page {
    size: A4 landscape;
    margin: 8mm 6mm;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: Arial, sans-serif;
    font-size: 7px;
    color: #1a2940;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
    padding-bottom: 4px;
    border-bottom: 1.5px solid #29B6D8;
  }
  h1 { color: #29B6D8; font-size: 13px; }
  .meta { font-size: 7px; color: #6A7A8A; }
  table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }
  thead tr {
    background: #29B6D8;
  }
  th {
    color: #fff;
    text-align: left;
    padding: 4px 3px;
    font-size: 6.5px;
    border: 0.5px solid #1a9bbf;
    word-break: break-word;
    line-height: 1.2;
  }
  td {
    padding: 3px;
    font-size: 6.5px;
    border: 0.5px solid #dde8f0;
    word-break: break-word;
    line-height: 1.3;
    vertical-align: top;
  }
  tfoot td {
    font-size: 6px;
    color: #8A9AAA;
    padding-top: 4px;
    border: none;
    text-align: right;
  }
</style>
</head>
<body>
  <div class="header">
    <h1>Liste des Produits — Ezycom</h1>
    <span class="meta">Exporté le ${date} &nbsp;·&nbsp; ${data.length} produit(s)</span>
  </div>
  <table>
    <thead><tr>${headerCols}</tr></thead>
    <tbody>${bodyRows}</tbody>
    <tfoot><tr><td colspan="${COLONNES.length}">Généré automatiquement par Ezycom · ${date}</td></tr></tfoot>
  </table>
</body>
</html>`;

      const { uri } = await Print.printToFileAsync({
        html,
        width: 842,
        height: 595,
      });

      const fileName = `produits_${new Date().toISOString().slice(0, 10)}.pdf`;
      const destUri = FileSystem.cacheDirectory + fileName;
      await FileSystem.copyAsync({ from: uri, to: destUri });

      await saveFileSAF(destUri, fileName, 'application/pdf');
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de générer le PDF : ' + e.message);
    } finally {
      setExporting(false);
    }
  };

  const cats = categories.filter(c => !c.parent_id);
  const sousOfCat = categories.filter(c => c.parent_id == idCat);
  const selectedCatNom = cats.find(c => c.id == idCat)?.nom;

  const getStatutColor = (etat, qte) =>
    etat == 1 && parseInt(qte) > 0
      ? { bg: '#E8F8F5', text: '#27AE60', border: '#A9DFBF' }
      : { bg: '#FDEDEC', text: '#E74C3C', border: '#F1948A' };

  const Pagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const range = 1;
    const shown = new Set();
    shown.add(1);
    shown.add(totalPages);
    for (let i = page - range; i <= page + range; i++) {
      if (i >= 1 && i <= totalPages) shown.add(i);
    }
    const sortedPages = Array.from(shown).sort((a, b) => a - b);

    let last = 0;
    for (const p of sortedPages) {
      if (p - last > 1) pages.push('...');
      pages.push(p);
      last = p;
    }

    return (
      <View style={styles.paginationRow}>
        <Text style={[styles.paginationInfo, { color: sub }]}>
          {Math.min((page - 1) * limit + 1, total)}–{Math.min(page * limit, total)} sur {total}
        </Text>
        <View style={styles.paginationBtns}>
          {page > 1 && (
            <TouchableOpacity style={styles.pageBtn} onPress={() => fetchProduits( page - 1)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={[styles.pageBtnTxt, { color: txt }]}>‹</Text>
            </TouchableOpacity>
          )}
          {pages.map((p, i) => (
            p === '...' ? (
              <View key={`ellipsis-${i}`} style={styles.pageEllipsis}>
                <Text style={[styles.pageBtnTxt, { color: sub }]}>...</Text>
              </View>
            ) : (
              <TouchableOpacity
                key={p}
                style={[styles.pageBtn, p === page && { backgroundColor: TEAL }]}
                onPress={() => fetchProduits( p)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[styles.pageBtnTxt, { color: p === page ? '#fff' : txt }]}>{p}</Text>
              </TouchableOpacity>
            )
          ))}
          {page < totalPages && (
            <TouchableOpacity style={styles.pageBtn} onPress={() => fetchProduits( page + 1)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={[styles.pageBtnTxt, { color: txt }]}>›</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
      <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} />
      <AppHeader
        session={session}
        darkMode={darkMode}
        onToggleDark={() => {
          const next = !darkMode;
          setDarkMode(next);
          saveDarkMode(next);
        }}
        onLogout={() => router.replace('/(auth)/login')}
      />

      {/* ── MODAL DÉTAILS PRODUIT ── */}
      <Modal visible={showDetails} transparent animationType="slide" onRequestClose={() => setShowDetails(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowDetails(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: card }]} onPress={() => { }}>
            {selectedProduit && (() => {
              const stat = getStatutColor(selectedProduit.etat, selectedProduit.qte);
              return (
                <>
                  <View style={styles.modalHeader}>
                    <Text style={[styles.modalTitle, { color: txt }]} numberOfLines={2}>
                      {selectedProduit.nom}
                    </Text>
                    <TouchableOpacity onPress={() => setShowDetails(false)}>
                      <Ionicons name="close" size={22} color={sub} />
                    </TouchableOpacity>
                  </View>

                  {selectedProduit.ref ? (
                    <Text style={[styles.modalRef, { color: sub }]}>REF : {selectedProduit.ref}</Text>
                  ) : null}

                  <View style={[styles.modalDivider, { backgroundColor: '#E2E8F0' }]} />

                  <View style={styles.modalRow}>
                    <Text style={[styles.modalLabel, { color: sub }]}>Catégorie</Text>
                    <Text style={[styles.modalValue, { color: txt }]}>
                      {selectedProduit.categorie_nom || '—'}
                      {selectedProduit.sous_categorie_nom ? ` › ${selectedProduit.sous_categorie_nom}` : ''}
                    </Text>
                  </View>

                  <View style={styles.modalRow}>
                    <Text style={[styles.modalLabel, { color: sub }]}>Prix de vente</Text>
                    <Text style={[styles.modalValue, { color: TEAL, fontWeight: '800' }]}>
                      {selectedProduit.prix} DT
                    </Text>
                  </View>

                  <View style={styles.modalRow}>
                    <Text style={[styles.modalLabel, { color: sub }]}>Prix d'achat</Text>
                    <Text style={[styles.modalValue, { color: txt }]}>
                      {selectedProduit.prix_achat || '—'} DT
                    </Text>
                  </View>

                  <View style={styles.modalRow}>
                    <Text style={[styles.modalLabel, { color: sub }]}>Quantité</Text>
                    <Text style={[styles.modalValue, { color: txt }]}>{selectedProduit.qte}</Text>
                  </View>

                  <View style={styles.modalRow}>
                    <Text style={[styles.modalLabel, { color: sub }]}>Statut</Text>
                    <View style={[styles.statutBadge, { backgroundColor: stat.bg, borderColor: stat.border }]}>
                      <Text style={[styles.statutTxt, { color: stat.text }]}>
                        {selectedProduit.etat == 1 && parseInt(selectedProduit.qte) > 0 ? '✓ Actif' : '✗ Inactif'}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.modalDivider, { backgroundColor: '#E2E8F0', marginVertical: 12 }]} />

                  <View style={styles.modalBtnRow}>
                    <TouchableOpacity
                      style={[styles.modalBtn, { backgroundColor: TEAL }]}
                      onPress={() => {
                        setShowDetails(false);
                        router.push({ pathname: '/(merchant)/stock/produits/modifier-produit', params: { id: selectedProduit.id } });
                      }}
                    >
                      <Ionicons name="pencil-outline" size={16} color="#fff" />
                      <Text style={styles.modalBtnTxt}>Modifier</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.modalBtn, { backgroundColor: '#F0F4F8' }]}
                      onPress={() => {
                        setShowDetails(false);
                        router.push({ pathname: '/(merchant)/stock/produits/historique-produit', params: { id: selectedProduit.id, nom: selectedProduit.nom } });
                      }}
                    >
                      <Ionicons name="archive-outline" size={16} color={sub} />
                      <Text style={[styles.modalBtnTxt, { color: sub }]}>Historique</Text>
                    </TouchableOpacity>
                  </View>
                </>
              );
            })()}
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── MODAL LIMIT PICKER ── */}
      <Modal visible={showLimitPicker} transparent animationType="fade" onRequestClose={() => setShowLimitPicker(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowLimitPicker(false)}>
          <View style={[styles.limitModal, { backgroundColor: card }]}>
            <Text style={[styles.limitModalTitle, { color: sub }]}>Entrées par page</Text>
            {LIMIT_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt}
                style={[styles.limitOption, opt === limit && { backgroundColor: '#E8F7FB' }]}
                onPress={() => {
                  setLimit(opt);
                  setShowLimitPicker(false);
                  fetchProduits( 1, search, idCat, idSous, opt);
                }}
              >
                <Text style={{ color: opt === limit ? TEAL : txt, fontWeight: opt === limit ? '700' : '400', fontSize: 14 }}>
                  {opt} par page
                </Text>
                {opt === limit && <Ionicons name="checkmark" size={16} color={TEAL} />}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* ── MODAL CATÉGORIE PICKER ── */}
      <Modal visible={showCatPicker} transparent animationType="fade" onRequestClose={() => setShowCatPicker(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowCatPicker(false)}>
          <View style={[styles.catModal, { backgroundColor: card }]}>
            <Text style={[styles.limitModalTitle, { color: sub }]}>Filtrer par catégorie</Text>
            <TouchableOpacity
              style={[styles.limitOption, idCat === 0 && { backgroundColor: '#E8F7FB' }]}
              onPress={() => { setIdCat(0); setIdSous(0); setShowCatPicker(false); fetchProduits( 1, search, 0, 0); }}
            >
              <Text style={{ color: idCat === 0 ? TEAL : txt, fontWeight: idCat === 0 ? '700' : '400', fontSize: 14 }}>
                Toutes les catégories
              </Text>
              {idCat === 0 && <Ionicons name="checkmark" size={16} color={TEAL} />}
            </TouchableOpacity>
            <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
              {cats.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.limitOption, idCat == c.id && { backgroundColor: '#E8F7FB' }]}
                  onPress={() => { setIdCat(c.id); setIdSous(0); setShowCatPicker(false); fetchProduits( 1, search, c.id, 0); }}
                >
                  <Text style={{ color: idCat == c.id ? TEAL : txt, fontWeight: idCat == c.id ? '700' : '400', fontSize: 14 }}>
                    {c.nom}
                  </Text>
                  {idCat == c.id && <Ionicons name="checkmark" size={16} color={TEAL} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.breadcrumbRow}>
          <Text style={[styles.breadcrumb, { color: sub }]}>Dashboard › </Text>
          <Text style={[styles.breadcrumb, { color: TEAL, fontWeight: '700' }]}>Produits</Text>
        </View>
        <Text style={[styles.pageTitle, { color: txt }]}>Produits</Text>

        {/* ── CSV IMPORT ── */}
        <View style={[styles.card, { backgroundColor: card }]}>
          <Text style={[styles.sectionLabel, { color: sub }]}>Charger votre fichier</Text>
          <View style={styles.importRow}>
            <TouchableOpacity
              style={[styles.csvBtn, { borderColor: TEAL }]}
              onPress={handleDownloadTemplate}
            >
              <Ionicons name="download-outline" size={14} color={TEAL} />
              <Text style={[styles.csvBtnTxt, { color: TEAL }]}> Modèle CSV</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.fileRow}>
            <TouchableOpacity
              style={[styles.fileInput, { borderColor: '#CBD5E0' }]}
              onPress={handlePickFile}
            >
              <Text style={[styles.fileInputTxt, { color: sub }]}>
                {csvFile ? csvFile.name : 'Choisir un fichier'}
              </Text>
              <Text style={[styles.fileInputSub, { color: sub }]}>
                {csvFile ? '  ✓ Prêt à importer' : '  Aucun fichier'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.importBtn, { backgroundColor: TEAL, opacity: csvImporting ? 0.6 : 1 }]}
              onPress={handleImportCSV}
              disabled={csvImporting}
            >
              <Ionicons name="arrow-up-outline" size={14} color="#fff" />
              <Text style={styles.importBtnTxt}> {csvImporting ? 'Import...' : 'Importer'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── TABLE PRODUITS ── */}
        <View style={[styles.card, { backgroundColor: card }]}>

          <View style={styles.tableHeader}>
            <Text style={[styles.tableTitle, { color: txt }]}>Mes produits</Text>
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: TEAL }]}
              onPress={() => router.push('/(merchant)/stock/produits/ajouter-produit')}
            >
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={styles.addBtnTxt}> Ajouter</Text>
            </TouchableOpacity>
          </View>

          {/* ── FILTRES ── */}
          <View style={styles.filterRow}>
            {/* Limit picker */}
            <TouchableOpacity
              style={[styles.limitPicker, { borderColor: '#CBD5E0' }]}
              onPress={() => setShowLimitPicker(true)}
            >
              <Text style={{ color: txt, fontSize: 13, fontWeight: '600' }}>{limit}</Text>
              <Ionicons name="chevron-down" size={13} color={sub} />
            </TouchableOpacity>
            <Text style={[styles.filterLabel, { color: sub }]}>/ page</Text>
            <TextInput
              style={[styles.searchInput, { borderColor: '#CBD5E0', color: txt, backgroundColor: card }]}
              placeholder="Rechercher..."
              placeholderTextColor={sub}
              value={searchInput}
              onChangeText={setSearchInput}
              onSubmitEditing={() => fetchProduits( 1, searchInput)}
              returnKeyType="search"
            />
          </View>

          {/* ── FILTRE CATÉGORIE ── */}
          <TouchableOpacity
            style={[styles.catDropdown, { borderColor: '#CBD5E0', backgroundColor: idCat === 0 ? '#F0F4F8' : '#E8F7FB' }]}
            onPress={() => setShowCatPicker(true)}
          >
            <Ionicons name="folder-outline" size={14} color={idCat === 0 ? sub : TEAL} />
            <Text style={{ color: idCat === 0 ? sub : TEAL, fontSize: 13, flex: 1, marginLeft: 6 }}>
              {idCat === 0 ? 'Toutes les catégories' : selectedCatNom}
            </Text>
            <Ionicons name="chevron-down" size={13} color={idCat === 0 ? sub : TEAL} />
          </TouchableOpacity>

          {/* Sous-catégories (si une catégorie est sélectionnée) */}
          {sousOfCat.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
              <TouchableOpacity
                style={[styles.subChip, { backgroundColor: idSous === 0 ? TEAL : '#F0F4F8', marginRight: 6 }]}
                onPress={() => { setIdSous(0); fetchProduits( 1, search, idCat, 0); }}
              >
                <Text style={{ color: idSous === 0 ? '#fff' : sub, fontSize: 12 }}>Toutes</Text>
              </TouchableOpacity>
              {sousOfCat.map(sc => (
                <TouchableOpacity
                  key={sc.id}
                  style={[styles.subChip, { backgroundColor: idSous == sc.id ? '#0D7A95' : '#E8F7FB', marginRight: 6 }]}
                  onPress={() => { setIdSous(sc.id); fetchProduits( 1, search, idCat, sc.id); }}
                >
                  <Text style={{ color: idSous == sc.id ? '#fff' : TEAL, fontSize: 12 }}>{sc.nom}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* ── CARTES PRODUITS ── */}
          {loading ? (
            <ActivityIndicator color={TEAL} style={{ marginVertical: 30 }} />
          ) : produits.length === 0 ? (
            <Text style={[styles.emptyTxt, { color: sub }]}>Aucun produit trouvé.</Text>
          ) : (
            produits.map((p, i) => {
              const stat = getStatutColor(p.etat, p.qte);
              const imgUrl = p.img1 ? `${API_URL}${p.img1}` : null;
              return (
                <View key={p.id} style={[styles.prodCard, { borderBottomColor: '#E2E8F0' }, i < produits.length - 1 && { borderBottomWidth: 1 }]}>
                  <View style={styles.prodCardLeft}>
                    {imgUrl ? (
                      <Image source={{ uri: imgUrl }} style={styles.prodImg} resizeMode="cover" />
                    ) : (
                      <View style={[styles.prodImgPlaceholder, { backgroundColor: '#E8F8FC' }]}>
                        <Ionicons name="image-outline" size={22} color="#29B6D8" />
                      </View>
                    )}
                  </View>
                  <View style={styles.prodCardBody}>
                    <View style={styles.prodCardTop}>
                      <Text style={[styles.prodNom, { color: txt, flex: 1 }]} numberOfLines={1}>{p.nom}</Text>
                      <View style={[styles.statutBadge, { backgroundColor: stat.bg, borderColor: stat.border }]}>
                        <Text style={[styles.statutTxt, { color: stat.text }]}>
                          {p.etat == 1 && parseInt(p.qte) > 0 ? 'Actif' : 'Inactif'}
                        </Text>
                      </View>
                    </View>
                    {p.ref ? <Text style={[styles.prodRef, { color: sub }]}>Réf: {p.ref}</Text> : null}
                    <View style={styles.prodMeta}>
                      <Text style={[styles.prodPrice, { color: TEAL }]}>{parseFloat(p.prix || 0).toFixed(3)} TND</Text>
                      <Text style={[styles.prodQte, { color: parseInt(p.qte) <= parseInt(p.seuil) ? '#E74C3C' : sub }]}>
                        Stock: {p.qte}
                      </Text>
                    </View>
                    <View style={styles.prodCardActions}>
                      <TouchableOpacity style={styles.cardActionBtn} onPress={() => openDetails(p)}>
                        <Ionicons name="information-circle-outline" size={14} color="#64748b" />
                        <Text style={styles.cardActionTxt} numberOfLines={1}>Détails</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.cardActionBtn} onPress={() => router.push(`/(merchant)/stock/produits/modifier-produit?id=${p.id}`)}>
                        <Ionicons name="pencil-outline" size={14} color="#64748b" />
                        <Text style={styles.cardActionTxt} numberOfLines={1}>Modifier</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.cardActionBtn, styles.cardActionBtnRed]} onPress={() => deleteProduit(p.id)}>
                        <Ionicons name="trash-outline" size={14} color="#E74C3C" />
                        <Text style={[styles.cardActionTxt, { color: '#E74C3C' }]} numberOfLines={1}>Supprimer</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })
          )}

          <Pagination />

          <View style={styles.exportRow}>
            <TouchableOpacity
              style={[styles.exportBtn, { backgroundColor: '#27AE60', opacity: exporting ? 0.6 : 1 }]}
              onPress={handleExportExcel}
              disabled={exporting}
            >
              {exporting
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.exportTxt}>Export Excel</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.exportBtn, { backgroundColor: '#E74C3C', opacity: exporting ? 0.6 : 1 }]}
              onPress={handleExportPDF}
              disabled={exporting}
            >
              {exporting
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.exportTxt}>Export PDF</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      <AppFooter />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingBottom: 80 },
  breadcrumbRow: { flexDirection: 'row', marginTop: 14, marginBottom: 4 },
  breadcrumb: { fontSize: 12 },
  pageTitle: { fontSize: 22, fontWeight: '800', marginBottom: 14 },
  card: { borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  sectionLabel: { fontSize: 13, marginBottom: 8 },
  importRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 10 },
  csvBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  csvBtnTxt: { fontSize: 13, fontWeight: '600' },
  fileRow: { flexDirection: 'row', gap: 8 },
  fileInput: { flex: 1, flexDirection: 'row', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  fileInputTxt: { fontSize: 13, fontWeight: '500' },
  fileInputSub: { fontSize: 12 },
  importBtn: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  importBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },
  tableHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  tableTitle: { fontSize: 17, fontWeight: '800' },
  addBtn: { flexDirection: 'row', alignItems: 'center', borderRadius: 22, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },
  filterRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  limitPicker: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, gap: 4 },
  filterLabel: { fontSize: 13 },
  searchInput: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13 },
  catDropdown: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 },
  subChip: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  emptyTxt: { textAlign: 'center', marginVertical: 30, fontSize: 14 },
  prodCard: { flexDirection: 'row', paddingVertical: 14, gap: 12 },
  prodCardLeft: { justifyContent: 'flex-start' },
  prodImg: { width: 70, height: 70, borderRadius: 10 },
  prodImgPlaceholder: { width: 70, height: 70, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  prodCardBody: { flex: 1 },
  prodCardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  prodNom: { fontSize: 14, fontWeight: '700' },
  prodRef: { fontSize: 11, marginBottom: 4 },
  prodMeta: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  prodPrice: { fontSize: 14, fontWeight: '800' },
  prodQte: { fontSize: 12, fontWeight: '600' },
  statutBadge: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  statutTxt: { fontSize: 11, fontWeight: '600' },
  prodCardActions: { flexDirection: 'row', gap: 6, marginTop: 4 },
  cardActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, paddingHorizontal: 4, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc', minWidth: 0 },
  cardActionBtnRed: { borderColor: '#fee2e2', backgroundColor: '#fff5f5' },
  cardActionTxt: { fontSize: 10, fontWeight: '600', color: '#64748b', flexShrink: 1 },
  paginationRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  paginationInfo: { fontSize: 12 },
  paginationBtns: { flexDirection: 'row', gap: 6 },
  pageBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0F4F8' },
  pageBtnTxt: { fontSize: 13, fontWeight: '600' },
  pageEllipsis: { minWidth: 20, height: 32, alignItems: 'center', justifyContent: 'center' },
  exportRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  exportBtn: { borderRadius: 22, paddingHorizontal: 18, paddingVertical: 10 },
  exportTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  modalTitle: { fontSize: 17, fontWeight: '800', flex: 1, marginRight: 12 },
  modalRef: { fontSize: 12, marginBottom: 14 },
  modalDivider: { height: 1, marginVertical: 4 },
  modalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 9 },
  modalLabel: { fontSize: 13 },
  modalValue: { fontSize: 13, fontWeight: '600', maxWidth: '55%', textAlign: 'right' },
  modalBtnRow: { flexDirection: 'row', gap: 10 },
  modalBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 22, paddingVertical: 12 },
  modalBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },

  limitModal: { position: 'absolute', top: '35%', alignSelf: 'center', width: 240, borderRadius: 16, overflow: 'hidden', elevation: 8 },
  catModal: { position: 'absolute', top: '20%', alignSelf: 'center', width: 280, borderRadius: 16, overflow: 'hidden', elevation: 8, maxHeight: '60%' },
  limitModalTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: 16, paddingVertical: 12 },
  limitOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 0.5, borderTopColor: '#E2E8F0' },
});