import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { loadSession } from '../../../../utils/auth';
import AppFooter from '../../../components/AppFooter';
import AppHeader from '../../../components/AppHeader';

const TEAL = '#29B6D8';
const DARK_BG = '#0F1B2D';
const LIMIT_OPTIONS = [4, 8, 10, 20, 50];

export default function ProduitsScreen() {
  const [session, setSession]         = useState(null);
  const [darkMode, setDarkMode]       = useState(false);
  const [produits, setProduits]       = useState([]);
  const [categories, setCategories]   = useState([]);
  const [loading, setLoading]         = useState(true);

  const [page, setPage]               = useState(1);
  const [totalPages, setTotalPages]   = useState(1);
  const [total, setTotal]             = useState(0);
  const [limit, setLimit]             = useState(4);

  const [search, setSearch]           = useState('');
  const [idCat, setIdCat]             = useState(0);
  const [idSous, setIdSous]           = useState(0);

  const [showLimitPicker, setShowLimitPicker] = useState(false);
  const [showCatPicker, setShowCatPicker]     = useState(false);
  const [selectedProduit, setSelectedProduit] = useState(null);
  const [showDetails, setShowDetails]         = useState(false);

  const bg   = darkMode ? DARK_BG  : '#EEF4F8';
  const card = darkMode ? '#1A2A3D' : '#FFFFFF';
  const txt  = darkMode ? '#FFFFFF' : '#0D1B2A';
  const sub  = darkMode ? '#8899AA' : '#6A7A8A';

  useFocusEffect(
    useCallback(() => {
      loadSession().then(s => {
        setSession(s);
        if (s) {
          fetchCategories(s.token);
          fetchProduits(s.token, 1);
        }
      });
    }, [])
  );

  const authHeaders = token => ({ 'X-Token': token, 'Content-Type': 'application/json' });

  const fetchCategories = async (token) => {
    try {
      const res  = await fetch(`${API_URL}/api/categories`, { headers: authHeaders(token) });
      const json = await res.json();
      if (json.success) setCategories(json.data?.categories ?? json.data ?? []);
    } catch (_) {}
  };

  const fetchProduits = async (token, p = 1, q = search, cat = idCat, sous = idSous, lim = limit) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, limit: lim });
      if (q)    params.append('search', q);
      if (cat)  params.append('id_cat', cat);
      if (sous) params.append('id_sous_cat', sous);

      const res  = await fetch(`${API_URL}/api/products?${params}`, { headers: authHeaders(token) });
      const json = await res.json();
      if (json.success) {
        setProduits(json.data?.produits ?? []);
        setTotal(json.data?.total ?? 0);
        setTotalPages(json.data?.pages ?? 1);
        setPage(p);
      }
    } catch (_) {
      Alert.alert('Erreur', 'Impossible de charger les produits.');
    } finally {
      setLoading(false);
    }
  };

  const [exporting, setExporting] = useState(false);

  const deleteProduit = (id) => {
    Alert.alert('Supprimer', 'Confirmer la suppression de ce produit ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive',
        onPress: async () => {
          try {
            await fetch(`${API_URL}/api/products/${id}`, {
              method: 'DELETE', headers: authHeaders(session.token),
            });
            fetchProduits(session.token, page);
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

  // Récupère TOUS les produits (sans pagination) pour l'export
  const fetchAllProduits = async () => {
    const params = new URLSearchParams({ page: 1, limit: 9999 });
    if (search)  params.append('search', search);
    if (idCat)   params.append('id_cat', idCat);
    if (idSous)  params.append('id_sous_cat', idSous);
    const res  = await fetch(`${API_URL}/api/products?${params}`, { headers: authHeaders(session.token) });
    const json = await res.json();
    return json.data?.produits ?? [];
  };

  const COLONNES = [
    { key: 'ref',                label: 'Référence' },
    { key: 'nom',                label: 'Nom du produit' },
    { key: 'categorie_nom',      label: 'Catégorie' },
    { key: 'sous_categorie_nom', label: 'Sous-catégorie' },
    { key: 'marque',             label: 'Marque' },
    { key: 'modele',             label: 'Modèle' },
    { key: 'couleur',            label: 'Couleur' },
    { key: 'prix',               label: 'Prix de vente (DT)' },
    { key: 'prix_achat',         label: "Prix d'achat (DT)" },
    { key: 'qte',                label: 'Quantité' },
    { key: 'seuil',              label: "Seuil d'alerte" },
    { key: 'etat',               label: 'Statut' },
    { key: 'description',        label: 'Description' },
    { key: 'date_add',           label: "Date d'ajout" },
  ];

  const formatVal = (key, val, produit) => {
    if (key === 'etat') return (val == 1 && parseInt(produit?.qte ?? val) > 0) ? 'Actif' : 'Inactif';
    if (val === null || val === undefined || val === '') return '—';
    return String(val);
  };

  // SAF = Storage Access Framework
  // L'utilisateur choisit le dossier UNE SEULE FOIS → après ça sauvegarde direct
  const SAF = FileSystem.StorageAccessFramework;

  const saveWithSAF = async (content, fileName, mimeType, encoding = FileSystem.EncodingType.UTF8) => {
    try {
      // Demande à l'utilisateur de choisir un dossier (ex: Téléchargements)
      const permissions = await SAF.requestDirectoryPermissionsAsync();
      if (!permissions.granted) {
        Alert.alert('Annulé', 'Aucun dossier sélectionné.');
        return;
      }

      // Crée le fichier dans le dossier choisi
      const fileUri = await SAF.createFileAsync(
        permissions.directoryUri,
        fileName,
        mimeType
      );

      // Écrit le contenu
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

      // Lit le fichier source en base64 et l'écrit dans la destination
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
      const rows   = data.map(p =>
        COLONNES.map(c => escapeCSV(formatVal(c.key, p[c.key], p))).join(';')
      );

      const csv      = '\uFEFF' + [header, ...rows].join('\n');
      const fileName = `produits_${new Date().toISOString().slice(0, 10)}.csv`;
      const fileUri  = FileSystem.cacheDirectory + fileName;

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

      // Calcul de la largeur de chaque colonne (en %) pour tenir en A4 paysage
      const colWidths = {
        ref:                '7%',
        nom:                '13%',
        categorie_nom:      '9%',
        sous_categorie_nom: '9%',
        marque:             '7%',
        modele:             '6%',
        couleur:            '6%',
        prix:               '6%',
        prix_achat:         '6%',
        qte:                '5%',
        seuil:              '5%',
        etat:               '6%',
        description:        '12%',
        date_add:           '8%',
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
        width:  842,
        height: 595,
      });

      const fileName = `produits_${new Date().toISOString().slice(0, 10)}.pdf`;
      const destUri  = FileSystem.cacheDirectory + fileName;
      await FileSystem.copyAsync({ from: uri, to: destUri });

      await saveFileSAF(destUri, fileName, 'application/pdf');
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de générer le PDF : ' + e.message);
    } finally {
      setExporting(false);
    }
  };

  const cats         = categories.filter(c => !c.parent_id);
  const sousOfCat    = categories.filter(c => c.parent_id == idCat);
  const selectedCatNom = cats.find(c => c.id == idCat)?.nom;

  const getStatutColor = (etat, qte) =>
    etat == 1 && parseInt(qte) > 0
      ? { bg: '#E8F8F5', text: '#27AE60', border: '#A9DFBF' }
      : { bg: '#FDEDEC', text: '#E74C3C', border: '#F1948A' };

  const Pagination = () => {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) pages.push(i);
    return (
      <View style={styles.paginationRow}>
        <Text style={[styles.paginationInfo, { color: sub }]}>
          {Math.min((page - 1) * limit + 1, total)}–{Math.min(page * limit, total)} sur {total}
        </Text>
        <View style={styles.paginationBtns}>
          {page > 1 && (
            <TouchableOpacity style={styles.pageBtn} onPress={() => fetchProduits(session.token, page - 1)}>
              <Text style={{ color: txt, fontWeight: '600' }}>‹</Text>
            </TouchableOpacity>
          )}
          {pages.map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.pageBtn, p === page && { backgroundColor: TEAL }]}
              onPress={() => fetchProduits(session.token, p)}
            >
              <Text style={{ color: p === page ? '#fff' : txt, fontWeight: '600' }}>{p}</Text>
            </TouchableOpacity>
          ))}
          {page < totalPages && (
            <TouchableOpacity style={styles.pageBtn} onPress={() => fetchProduits(session.token, page + 1)}>
              <Text style={{ color: txt, fontWeight: '600' }}>›</Text>
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
        onToggleDark={() => setDarkMode(d => !d)}
        onLogout={() => router.replace('/(auth)/login')}
      />

      {/* ── MODAL DÉTAILS PRODUIT ── */}
      <Modal visible={showDetails} transparent animationType="slide" onRequestClose={() => setShowDetails(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowDetails(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: card }]} onPress={() => {}}>
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
                  fetchProduits(session?.token, 1, search, idCat, idSous, opt);
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
              onPress={() => { setIdCat(0); setIdSous(0); setShowCatPicker(false); fetchProduits(session?.token, 1, search, 0, 0); }}
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
                  onPress={() => { setIdCat(c.id); setIdSous(0); setShowCatPicker(false); fetchProduits(session?.token, 1, search, c.id, 0); }}
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
            <TouchableOpacity style={[styles.csvBtn, { borderColor: TEAL }]}>
              <Ionicons name="download-outline" size={14} color={TEAL} />
              <Text style={[styles.csvBtnTxt, { color: TEAL }]}> Modèle CSV</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.fileRow}>
            <View style={[styles.fileInput, { borderColor: '#CBD5E0' }]}>
              <Text style={[styles.fileInputTxt, { color: sub }]}>Choisir un fichier</Text>
              <Text style={[styles.fileInputSub, { color: sub }]}>  Aucun fichier</Text>
            </View>
            <TouchableOpacity style={[styles.importBtn, { backgroundColor: TEAL }]}>
              <Ionicons name="arrow-up-outline" size={14} color="#fff" />
              <Text style={styles.importBtnTxt}> Importer</Text>
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
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={() => fetchProduits(session?.token, 1)}
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
                onPress={() => { setIdSous(0); fetchProduits(session?.token, 1, search, idCat, 0); }}
              >
                <Text style={{ color: idSous === 0 ? '#fff' : sub, fontSize: 12 }}>Toutes</Text>
              </TouchableOpacity>
              {sousOfCat.map(sc => (
                <TouchableOpacity
                  key={sc.id}
                  style={[styles.subChip, { backgroundColor: idSous == sc.id ? '#0D7A95' : '#E8F7FB', marginRight: 6 }]}
                  onPress={() => { setIdSous(sc.id); fetchProduits(session?.token, 1, search, idCat, sc.id); }}
                >
                  <Text style={{ color: idSous == sc.id ? '#fff' : TEAL, fontSize: 12 }}>{sc.nom}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* ── EN-TÊTE TABLEAU 4 COLONNES ── */}
          <View style={[styles.colHeader, { borderBottomColor: '#E2E8F0' }]}>
            <Text style={[styles.colTxt, { color: sub, flex: 3 }]}>Produit</Text>
            <Text style={[styles.colTxt, { color: sub, flex: 1, textAlign: 'center' }]}>Détails</Text>
            <Text style={[styles.colTxt, { color: sub, flex: 1.4, textAlign: 'center' }]}>Statut</Text>
            <Text style={[styles.colTxt, { color: sub, flex: 0.8, textAlign: 'center' }]}>Suppr.</Text>
          </View>

          {/* ── LIGNES TABLEAU ── */}
          {loading ? (
            <ActivityIndicator color={TEAL} style={{ marginVertical: 30 }} />
          ) : produits.length === 0 ? (
            <Text style={[styles.emptyTxt, { color: sub }]}>Aucun produit trouvé.</Text>
          ) : (
            produits.map(p => {
              const stat = getStatutColor(p.etat, p.qte);
              return (
                <View key={p.id} style={[styles.prodRow, { borderBottomColor: '#E2E8F0' }]}>

                  {/* Colonne 1 : Nom + Ref */}
                  <View style={{ flex: 3 }}>
                    <Text style={[styles.prodNom, { color: TEAL }]} numberOfLines={1}>{p.nom}</Text>
                    {p.ref ? <Text style={[styles.prodRef, { color: sub }]}>REF: {p.ref}</Text> : null}
                  </View>

                  {/* Colonne 2 : Détails */}
                  <TouchableOpacity
                    style={{ flex: 1, alignItems: 'center' }}
                    onPress={() => openDetails(p)}
                  >
                    <View style={styles.detailBtn}>
                      <Ionicons name="information-circle-outline" size={20} color={TEAL} />
                    </View>
                  </TouchableOpacity>

                  {/* Colonne 3 : Statut */}
                  <View style={{ flex: 1.4, alignItems: 'center' }}>
                    <View style={[styles.statutBadge, { backgroundColor: stat.bg, borderColor: stat.border }]}>
                      <Text style={[styles.statutTxt, { color: stat.text }]}>
                        {p.etat == 1 && parseInt(p.qte) > 0 ? '✓ Actif' : '✗ Inactif'}
                      </Text>
                    </View>
                  </View>

                  {/* Colonne 4 : Supprimer */}
                  <TouchableOpacity
                    style={{ flex: 0.8, alignItems: 'center' }}
                    onPress={() => deleteProduit(p.id)}
                  >
                    <View style={styles.deleteBtn}>
                      <Ionicons name="trash-outline" size={16} color="#E74C3C" />
                    </View>
                  </TouchableOpacity>

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
  safe:            { flex: 1 },
  scroll:          { paddingHorizontal: 16, paddingBottom: 80 },
  breadcrumbRow:   { flexDirection: 'row', marginTop: 14, marginBottom: 4 },
  breadcrumb:      { fontSize: 12 },
  pageTitle:       { fontSize: 22, fontWeight: '800', marginBottom: 14 },
  card:            { borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  sectionLabel:    { fontSize: 13, marginBottom: 8 },
  importRow:       { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 10 },
  csvBtn:          { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  csvBtnTxt:       { fontSize: 13, fontWeight: '600' },
  fileRow:         { flexDirection: 'row', gap: 8 },
  fileInput:       { flex: 1, flexDirection: 'row', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  fileInputTxt:    { fontSize: 13, fontWeight: '500' },
  fileInputSub:    { fontSize: 12 },
  importBtn:       { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  importBtnTxt:    { color: '#fff', fontWeight: '700', fontSize: 13 },
  tableHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  tableTitle:      { fontSize: 17, fontWeight: '800' },
  addBtn:          { flexDirection: 'row', alignItems: 'center', borderRadius: 22, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnTxt:       { color: '#fff', fontWeight: '700', fontSize: 13 },
  filterRow:       { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  limitPicker:     { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, gap: 4 },
  filterLabel:     { fontSize: 13 },
  searchInput:     { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13 },
  catDropdown:     { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 },
  subChip:         { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  colHeader:       { flexDirection: 'row', paddingBottom: 8, borderBottomWidth: 1, marginBottom: 4 },
  colTxt:          { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  emptyTxt:        { textAlign: 'center', marginVertical: 30, fontSize: 14 },
  prodRow:         { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1 },
  prodNom:         { fontSize: 13, fontWeight: '700' },
  prodRef:         { fontSize: 11, marginTop: 2 },
  statutBadge:     { borderRadius: 20, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 3 },
  statutTxt:       { fontSize: 11, fontWeight: '600' },
  detailBtn:       { width: 32, height: 32, borderRadius: 8, backgroundColor: '#E8F7FB', alignItems: 'center', justifyContent: 'center' },
  deleteBtn:       { width: 32, height: 32, borderRadius: 8, backgroundColor: '#FDEDEC', alignItems: 'center', justifyContent: 'center' },
  paginationRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  paginationInfo:  { fontSize: 12 },
  paginationBtns:  { flexDirection: 'row', gap: 6 },
  pageBtn:         { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0F4F8' },
  exportRow:       { flexDirection: 'row', gap: 10, marginTop: 16 },
  exportBtn:       { borderRadius: 22, paddingHorizontal: 18, paddingVertical: 10 },
  exportTxt:       { color: '#fff', fontWeight: '700', fontSize: 13 },

  modalOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalCard:       { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36 },
  modalHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  modalTitle:      { fontSize: 17, fontWeight: '800', flex: 1, marginRight: 12 },
  modalRef:        { fontSize: 12, marginBottom: 14 },
  modalDivider:    { height: 1, marginVertical: 4 },
  modalRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 9 },
  modalLabel:      { fontSize: 13 },
  modalValue:      { fontSize: 13, fontWeight: '600', maxWidth: '55%', textAlign: 'right' },
  modalBtnRow:     { flexDirection: 'row', gap: 10 },
  modalBtn:        { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 22, paddingVertical: 12 },
  modalBtnTxt:     { color: '#fff', fontWeight: '700', fontSize: 14 },

  limitModal:      { position: 'absolute', top: '35%', alignSelf: 'center', width: 240, borderRadius: 16, overflow: 'hidden', elevation: 8 },
  catModal:        { position: 'absolute', top: '20%', alignSelf: 'center', width: 280, borderRadius: 16, overflow: 'hidden', elevation: 8, maxHeight: '60%' },
  limitModalTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: 16, paddingVertical: 12 },
  limitOption:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 0.5, borderTopColor: '#E2E8F0' },
});