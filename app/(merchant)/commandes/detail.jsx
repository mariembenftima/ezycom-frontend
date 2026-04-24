// app/(merchant)/commandes/detail.jsx
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image, Linking, Modal,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_URL } from '../../../config';
import { loadSession } from '../../../utils/auth';

const TEAL   = '#29B6D8';
const BORDER = '#E5E7EB';
const GRAY   = '#6B7280';

const STATUTS = [
  { etat: 0, label: 'En attente',  color: '#D97706', bg: '#FEF3C7' },
  { etat: 1, label: 'Confirmée',   color: '#2563EB', bg: '#DBEAFE' },
  { etat: 2, label: 'Dispatchée',  color: '#7C3AED', bg: '#EDE9FE' },
  { etat: 5, label: 'Livrée',      color: '#059669', bg: '#D1FAE5' },
  { etat: 7, label: 'Annulée',     color: '#DC2626', bg: '#FEE2E2' },
];

const getStatut = (etat) => STATUTS.find(s => s.etat === etat) || STATUTS[0];

// ── Timeline ──────────────────────────────────────────────────────────────────
const Timeline = ({ historique }) => (
  <View style={styles.timelineContainer}>
    {historique.map((h, i) => {
      const s = getStatut(h.etat);
      return (
        <View key={h.id} style={styles.timelineRow}>
          <View style={styles.timelineLeft}>
            <View style={[styles.timelineDot, { backgroundColor: s.color }]} />
            {i < historique.length - 1 && <View style={styles.timelineLine} />}
          </View>
          <View style={styles.timelineContent}>
            <Text style={[styles.timelineLabel, { color: s.color }]}>{s.label}</Text>
            <Text style={styles.timelineMotif}>{h.motif}</Text>
            <Text style={styles.timelineDate}>
              {h.date ? new Date(h.date).toLocaleString('fr-FR') : ''}
            </Text>
          </View>
        </View>
      );
    })}
  </View>
);

export default function DetailCommandeScreen() {
  const { id }           = useLocalSearchParams();
  const [token,          setToken]          = useState(null);
  const [commande,       setCommande]       = useState(null);
  const [articles,       setArticles]       = useState([]);
  const [historique,     setHistorique]     = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [showStatutModal,setShowStatutModal] = useState(false);
  const [savingStatut,   setSavingStatut]   = useState(false);

  useEffect(() => {
    (async () => {
      const session = await loadSession();
      if (!session?.token) { router.replace('/(auth)/login'); return; }
      setToken(session.token);
      fetchDetail(session.token);
    })();
  }, [id]);

  const fetchDetail = async (tok) => {
    setLoading(true);
    try {
      const res  = await fetch(`${API_URL}/api/orders/${id}`, { headers: { 'X-Token': tok } });
      const data = await res.json();
      if (data.success) {
        setCommande(data.data.commande);
        setArticles(Array.isArray(data.data.articles) ? data.data.articles : []);
        setHistorique(Array.isArray(data.data.historique) ? data.data.historique : []);
      } else {
        Alert.alert('Erreur', data.message); router.back();
      }
    } catch (_) {
      Alert.alert('Erreur réseau', 'Impossible de charger la commande.'); router.back();
    } finally { setLoading(false); }
  };

  const changerStatut = async (etat, motif = '') => {
    setSavingStatut(true);
    try {
      const res  = await fetch(`${API_URL}/api/orders/${id}/status`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Token': token },
        body:    JSON.stringify({ etat, motif }),
      });
      const data = await res.json();
      if (data.success) {
        setShowStatutModal(false);
        fetchDetail(token);
      } else {
        Alert.alert('Erreur', data.message);
      }
    } catch (_) {
      Alert.alert('Erreur réseau', 'Impossible de mettre à jour.');
    } finally { setSavingStatut(false); }
  };

  const confirmerAnnulation = () => {
    Alert.alert(
      'Annuler la commande',
      'Êtes-vous sûr de vouloir annuler cette commande ?',
      [
        { text: 'Non', style: 'cancel' },
        { text: 'Oui, annuler', style: 'destructive', onPress: () => changerStatut(7, 'Annulée par le marchand') },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={TEAL} size="large" />
      </SafeAreaView>
    );
  }

  if (!commande) return null;

  const statut      = getStatut(commande.etat);
  const client      = [commande.nom, commande.prenom].filter(Boolean).join(' ') || 'Client inconnu';
  const prixTotal   = commande.prix   ? parseFloat(commande.prix).toFixed(3)  : '0.000';
  const fraisLiv    = commande.frais  ? parseFloat(commande.frais).toFixed(3) : '0.000';
  const dateAdd     = commande.date_add ? new Date(commande.date_add).toLocaleString('fr-FR') : '';

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>#{commande.code_barre || commande.id}</Text>
          <Text style={styles.headerDate}>{dateAdd}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: statut.bg }]}>
          <Text style={[styles.badgeText, { color: statut.color }]}>{statut.label}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Client */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Client</Text>
          <Text style={styles.clientName}>{client}</Text>
          {commande.tel ? (
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#DBEAFE' }]}
                onPress={() => Linking.openURL(`tel:${commande.tel}`)}
              >
                <Text style={[styles.actionBtnText, { color: '#2563EB' }]}>📞 Appeler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#D1FAE5' }]}
                onPress={() => Linking.openURL(`whatsapp://send?phone=${commande.tel}`)}
              >
                <Text style={[styles.actionBtnText, { color: '#059669' }]}>💬 WhatsApp</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          {commande.adresse ? <Text style={styles.infoText}>{commande.adresse}, {commande.ville} {commande.gouvernerat}</Text> : null}
          {commande.email   ? <Text style={styles.infoText}>{commande.email}</Text> : null}
        </View>

        {/* Articles */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Articles ({articles.length})</Text>
          {articles.map((a, i) => (
            <View key={i} style={styles.articleRow}>
              {a.produit_img ? (
                <Image source={{ uri: `${API_URL}${a.produit_img}` }} style={styles.articleImg} />
              ) : (
                <View style={[styles.articleImg, { backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={{ fontSize: 18 }}>📦</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.articleNom}>{a.produit_nom || 'Produit supprimé'}</Text>
                {a.produit_ref   ? <Text style={styles.articleMeta}>Réf: {a.produit_ref}</Text>   : null}
                {a.variation_sku ? <Text style={styles.articleMeta}>SKU: {a.variation_sku}</Text> : null}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.articleQte}>x{a.qte}</Text>
                <Text style={styles.articlePrix}>{a.prix ? parseFloat(a.prix).toFixed(3) : '—'}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Totaux */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Totaux</Text>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Sous-total</Text>
            <Text style={styles.totalVal}>{prixTotal} TND</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Frais de livraison</Text>
            <Text style={styles.totalVal}>{fraisLiv} TND</Text>
          </View>
          <View style={[styles.totalRow, styles.totalFinal]}>
            <Text style={[styles.totalLabel, { fontWeight: '700', color: '#111827' }]}>Total</Text>
            <Text style={[styles.totalVal, { fontWeight: '700', color: TEAL, fontSize: 16 }]}>
              {(parseFloat(prixTotal) + parseFloat(fraisLiv)).toFixed(3)} TND
            </Text>
          </View>
        </View>

        {/* Timeline */}
        {historique.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Historique</Text>
            <Timeline historique={historique} />
          </View>
        )}

        {/* Actions statut */}
        {commande.etat !== 7 && (
          <View style={styles.actionsSection}>
            <TouchableOpacity
              style={styles.btnChangerStatut}
              onPress={() => setShowStatutModal(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.btnChangerStatutText}>Changer le statut</Text>
            </TouchableOpacity>
            {commande.etat !== 5 && (
              <TouchableOpacity style={styles.btnAnnuler} onPress={confirmerAnnulation} activeOpacity={0.8}>
                <Text style={styles.btnAnnulerText}>Annuler la commande</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Modal changement statut */}
      <Modal visible={showStatutModal} transparent animationType="slide" onRequestClose={() => setShowStatutModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Changer le statut</Text>
            {STATUTS.filter(s => s.etat !== 7 && s.etat !== commande.etat).map(s => (
              <TouchableOpacity
                key={s.etat}
                style={[styles.modalOption, { backgroundColor: s.bg }]}
                onPress={() => changerStatut(s.etat)}
                disabled={savingStatut}
              >
                {savingStatut ? (
                  <ActivityIndicator color={s.color} size="small" />
                ) : (
                  <Text style={[styles.modalOptionText, { color: s.color }]}>{s.label}</Text>
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowStatutModal(false)}>
              <Text style={styles.modalCancelText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:              { flex: 1, backgroundColor: '#F9FAFB' },
  header:            { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: BORDER },
  backBtn:           { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  backIcon:          { fontSize: 28, color: TEAL, lineHeight: 32 },
  headerTitle:       { fontSize: 15, fontWeight: '700', color: '#111827' },
  headerDate:        { fontSize: 11, color: GRAY },
  badge:             { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText:         { fontSize: 11, fontWeight: '600' },
  scroll:            { padding: 14, gap: 12 },
  section:           { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: BORDER },
  sectionTitle:      { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 10 },
  clientName:        { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 8 },
  actionsRow:        { flexDirection: 'row', gap: 8, marginBottom: 8 },
  actionBtn:         { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  actionBtnText:     { fontSize: 13, fontWeight: '600' },
  infoText:          { fontSize: 12, color: GRAY, marginTop: 3 },
  articleRow:        { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: BORDER },
  articleImg:        { width: 48, height: 48, borderRadius: 8 },
  articleNom:        { fontSize: 13, fontWeight: '600', color: '#111827' },
  articleMeta:       { fontSize: 11, color: GRAY, marginTop: 2 },
  articleQte:        { fontSize: 13, fontWeight: '600', color: '#111827' },
  articlePrix:       { fontSize: 12, color: TEAL, marginTop: 2 },
  totalRow:          { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  totalFinal:        { borderTopWidth: 1, borderTopColor: BORDER, marginTop: 4, paddingTop: 10 },
  totalLabel:        { fontSize: 13, color: GRAY },
  totalVal:          { fontSize: 13, color: '#111827' },
  timelineContainer: { gap: 0 },
  timelineRow:       { flexDirection: 'row', gap: 10 },
  timelineLeft:      { alignItems: 'center', width: 16 },
  timelineDot:       { width: 12, height: 12, borderRadius: 6, marginTop: 3 },
  timelineLine:      { flex: 1, width: 2, backgroundColor: BORDER, marginVertical: 2 },
  timelineContent:   { flex: 1, paddingBottom: 14 },
  timelineLabel:     { fontSize: 12, fontWeight: '700' },
  timelineMotif:     { fontSize: 12, color: GRAY, marginTop: 1 },
  timelineDate:      { fontSize: 10, color: '#9CA3AF', marginTop: 2 },
  actionsSection:    { gap: 10 },
  btnChangerStatut:  { backgroundColor: TEAL, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  btnChangerStatutText:{ color: '#fff', fontSize: 15, fontWeight: '700' },
  btnAnnuler:        { backgroundColor: '#FEE2E2', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  btnAnnulerText:    { color: '#DC2626', fontSize: 15, fontWeight: '700' },
  modalOverlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox:          { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 10 },
  modalTitle:        { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 },
  modalOption:       { paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  modalOptionText:   { fontSize: 14, fontWeight: '700' },
  modalCancel:       { paddingVertical: 14, alignItems: 'center', borderTopWidth: 1, borderTopColor: BORDER, marginTop: 4 },
  modalCancelText:   { fontSize: 14, color: GRAY, fontWeight: '600' },
});