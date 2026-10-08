import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../utils/api';
import { DARK, LIGHT, NAVY, TEAL } from '../../utils/theme';

const NOTIF_POLL_INTERVAL_MS = 30000;

const SIDEBAR_WIDTH = 270;
const { width: SW } = Dimensions.get('window');

const PLAN_COLORS = {
  GRATUIT: { bg: '#E8EEF4', text: '#6A7A8A', border: '#C8D4E0' },
  ESSOR: { bg: '#E8F5E9', text: '#2E7D32', border: '#A5D6A7' },
  PROSPERITE: { bg: '#FFF3E0', text: '#E65100', border: '#FFCC80' },
  EMPIRE: { bg: '#FFF0ED', text: '#C0392B', border: '#FFAB91' },
};

const MENU = [
  { type: 'link', icon: 'grid-outline', label: 'Tableau de bord', route: '/(merchant)/dashboard' },
  {
    type: 'section', icon: 'cube-outline', label: 'Stock',
    children: [
      { label: 'Catégories', route: '/(merchant)/stock/categories' },
      { label: 'Produits', route: '/(merchant)/stock/produits/produits' },
      { label: 'Entrée Stock', route: '/(merchant)/stock/stock-in' },
      { label: 'Sortie Stock', route: '/(merchant)/stock/stock-out' },
    ],
  },
  { type: 'link', icon: 'cart-outline', label: 'Ajouter Vente', route: '/(merchant)/ajouter-vente' },
  { type: 'link', icon: 'clipboard-outline', label: 'Ajouter Commande', route: '/(merchant)/ajouter-commande' },
  {
    type: 'section', icon: 'list-outline', label: 'Commandes',
    children: [
      { label: 'Toutes', route: '/(merchant)/commandes/detail' },
      { label: 'En attente', route: '/(merchant)/commandes/detail?etat=0' },
      { label: 'Confirmées', route: '/(merchant)/commandes/detail?etat=1' },
      { label: 'Dispatchées', route: '/(merchant)/commandes/detail?etat=2' },
      { label: 'Livrées', route: '/(merchant)/commandes/detail?etat=5' },
      { label: 'Annulées', route: '/(merchant)/commandes/detail?etat=7' },
    ],
  },
  { type: 'link', icon: 'people-outline', label: 'Mes clients', route: '/(merchant)/clients' },
  { type: 'link', icon: 'bar-chart-outline', label: 'Statistiques', route: '/(merchant)/statistiques' },
  { type: 'link', icon: 'sparkles-outline', label: 'Prédictions IA', route: '/(merchant)/stock/produits/predictions' },
  { type: 'link', icon: 'alert-circle-outline', label: 'Réclamations', route: '/(merchant)/reclamations/reclamations' },
  { type: 'link', icon: 'people-circle-outline', label: 'Équipe', route: '/(merchant)/equipe/equipe' },
  {
    type: 'section', icon: 'receipt-outline', label: 'Facturation',
    children: [
      { label: 'Factures', route: '/(merchant)/facture/factures' },
      { label: 'Ajouter Facture', route: '/(merchant)/facture/ajouter-facture' },
      { label: 'Infos Facturation', route: '/(merchant)/facture/informations-facturation' },
    ],
  },
  { type: 'link', icon: 'settings-outline', label: 'Paramètres', route: '/(merchant)/parametres' },
  { type: 'link', icon: 'pricetag-outline', label: 'Nos abonnements', route: '/(auth)/packs' },
];

export default function AppHeader({ session, darkMode, onToggleDark, onLogout }) {
  const insets = useSafeAreaInsets();
  const [profileOpen, setProfileOpen] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [isOpen, setIsOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [notifRecent, setNotifRecent] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);

  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  const T = darkMode ? DARK : LIGHT;

  const { user, shop } = session || {};
  const plan = (shop?.plan || 'gratuit').toUpperCase();
  const planStyle = PLAN_COLORS[plan] || PLAN_COLORS.GRATUIT;
  const firstName = user?.name?.split(' ')[0] || 'Utilisateur';
  const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';

  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const data = await api.get('/api/notifications/count-and-list.php');
        if (data.success) {
          setNotifCount(data.data.count);
          setNotifRecent(data.data.recent);
        }
      } catch (e) {
        console.error('Erreur notifs:', e.message);
      }
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, NOTIF_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const toggleSection = (label) =>
    setExpanded(prev => ({ ...prev, [label]: !prev[label] }));

  const openSidebar = () => {
    setIsOpen(true);
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
      Animated.timing(overlayAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
    ]).start();
  };

  const closeSidebar = (callback) => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: -SIDEBAR_WIDTH, duration: 240, useNativeDriver: true }),
      Animated.timing(overlayAnim, { toValue: 0, duration: 240, useNativeDriver: true }),
    ]).start(() => {
      setIsOpen(false);
      if (callback) callback();
    });
  };

  const navigateTo = (route) => closeSidebar(() => router.push(route));

  const handleLogout = () => {
    closeSidebar(() => {
      setProfileOpen(false);
      if (onLogout) onLogout();
    });
  };

  const openNotif = (id) => {
    setNotifOpen(false);
    router.push(`/(merchant)/commandes/commande-detail?id=${id}`);
  };

  const formatNotifDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      <StatusBar barStyle={T.barStyle} backgroundColor={T.statusBg} />
      <View style={[s.header, { backgroundColor: T.header, borderBottomColor: T.headerBorder, paddingTop: insets.top + 12 }]}>
        <View style={s.headerLeft}>
          <TouchableOpacity style={s.hamburger} onPress={openSidebar} activeOpacity={0.7}>
            <View style={[s.bar, { backgroundColor: T.hamBar }]} />
            <View style={[s.bar, { backgroundColor: T.hamBar }]} />
            <View style={[s.bar, { backgroundColor: T.hamBar }]} />
          </TouchableOpacity>
          <View style={s.greetingBlock}>
            <View style={s.greetingRow}>
              <Text style={[s.greetingName, { color: T.text }]}>Bonjour, {firstName} !</Text>
              <View style={[s.planBadge, { backgroundColor: planStyle.bg, borderColor: planStyle.border }]}>
                <Text style={[s.planText, { color: planStyle.text }]}>{plan}</Text>
              </View>
            </View>
            <Text style={[s.greetingSub, { color: T.sub }]}>Vous utilisez le pack</Text>
          </View>
        </View>
        <View style={s.headerRight}>
          <TouchableOpacity style={s.iconBtn} onPress={onToggleDark}>
            <Ionicons name={darkMode ? 'moon' : 'sunny-outline'} size={22} color={darkMode ? TEAL : '#B0BCC8'} />
          </TouchableOpacity>
          <TouchableOpacity style={s.iconBtn} onPress={() => setNotifOpen(true)}>
            <Ionicons name="notifications-outline" size={22} color={T.sub} />
            {notifCount > 0 && (
              <View style={s.notifBadge}>
                <Text style={s.notifBadgeText}>{notifCount > 9 ? '9+' : notifCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={s.avatar} onPress={() => setProfileOpen(true)}>
            <Text style={s.avatarText}>{initials}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={profileOpen} transparent animationType="fade" onRequestClose={() => setProfileOpen(false)}>
        <Pressable style={s.profileOverlay} onPress={() => setProfileOpen(false)}>
          <Pressable style={[s.profilePanel, darkMode && s.profilePanelDark]} onPress={() => { }}>
            <View style={s.profileHeader}>
              <View style={s.profileAvatar}>
                <Text style={s.profileAvatarText}>{initials}</Text>
              </View>
              <View style={{ marginLeft: 14 }}>
                <Text style={[s.profileName, darkMode && { color: '#E2EEF8' }]}>{user?.name || 'Utilisateur'}</Text>
                <Text style={[s.profileRole, { color: darkMode ? DARK.sub : LIGHT.sub }]}>E-commerçant</Text>
              </View>
            </View>
            <View style={[s.profileDivider, darkMode && { backgroundColor: '#1E3A50' }]} />
            <Text style={[s.profileSectionLabel, darkMode && { color: '#5A8A9A' }]}>Mon compte</Text>
            <TouchableOpacity style={s.profileItem}
              onPress={() => { setProfileOpen(false); router.push('/(merchant)/parametres'); }}>
              <Ionicons name="person-outline" size={18} color={darkMode ? '#A8C0D0' : '#6A7A8A'} style={{ marginRight: 12 }} />
              <Text style={[s.profileItemText, darkMode && { color: '#C8DCE8' }]}>Paramètres</Text>
              <Ionicons name="chevron-forward" size={16} color={darkMode ? '#3A6A8A' : '#C8D4E0'} style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>
            <View style={[s.profileDivider, darkMode && { backgroundColor: '#1E3A50' }]} />
            <TouchableOpacity style={s.profileItem} onPress={handleLogout}>
              <Ionicons name="power-outline" size={18} color="#E53E3E" style={{ marginRight: 12 }} />
              <Text style={s.profileLogoutText}>Déconnexion</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={notifOpen} transparent animationType="fade" onRequestClose={() => setNotifOpen(false)}>
        <Pressable style={s.notifOverlay} onPress={() => setNotifOpen(false)}>
          <Pressable style={[s.notifPanel, { backgroundColor: T.card }]} onPress={() => { }}>
            <View style={[s.notifHeader, { borderBottomColor: T.border }]}>
              <Text style={[s.notifTitle, { color: T.text }]}>Notifications</Text>
              <TouchableOpacity onPress={() => setNotifOpen(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={22} color={T.sub} />
              </TouchableOpacity>
            </View>
            {notifCount === 0 ? (
              <Text style={[s.notifEmpty, { color: T.sub }]}>Aucune nouvelle commande</Text>
            ) : (
              <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
                {notifRecent.map((n) => (
                  <TouchableOpacity
                    key={n.id}
                    style={[s.notifItem, { borderBottomColor: T.border }]}
                    onPress={() => openNotif(n.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.notifItemName, { color: T.text }]}>{n.nom} {n.prenom}</Text>
                    <Text style={[s.notifItemMeta, { color: T.sub }]}>Commande #{n.id} - {n.total} DT</Text>
                    <Text style={[s.notifItemDate, { color: T.sub }]}>{formatNotifDate(n.date_add)}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {isOpen && (
        <Animated.View style={[s.overlay, { opacity: overlayAnim }]} pointerEvents="auto">
          <Pressable style={{ flex: 1 }} onPress={() => closeSidebar()} />
        </Animated.View>
      )}

      <Animated.View style={[s.sidebar, { backgroundColor: T.card, transform: [{ translateX: slideAnim }] }]}>
        <View style={[s.sidebarLogo, { borderBottomColor: T.border }]}>
          <Text style={[s.logoEzy, { color: T.text }]}>Ezy</Text>
          <Text style={s.logoCom}>com</Text>
          <Text style={[s.logoSub, { color: T.sub }]}>  Stock & Delivery</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          {MENU.map((item, i) => {
            if (item.type === 'link') {
              return (
                <TouchableOpacity key={i} style={[s.menuItem, { borderBottomColor: T.border }]}
                  onPress={() => navigateTo(item.route)} activeOpacity={0.7}>
                  <Ionicons name={item.icon} size={18} color={T.sub} style={s.menuIcon} />
                  <Text style={[s.menuLabel, { color: darkMode ? DARK.hamBar : LIGHT.hamBar }]}>{item.label}</Text>
                </TouchableOpacity>
              );
            }
            if (item.type === 'section') {
              const isExpanded = expanded[item.label] ?? false;
              return (
                <View key={i}>
                  <TouchableOpacity style={[s.sectionHeader, { backgroundColor: T.statBg }]}
                    onPress={() => toggleSection(item.label)} activeOpacity={0.8}>
                    <Ionicons name={item.icon} size={18} color={TEAL} style={s.menuIcon} />
                    <Text style={s.sectionLabel}>{item.label}</Text>
                    <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={TEAL} />
                  </TouchableOpacity>
                  {isExpanded && item.children.map((child, j) => (
                    <TouchableOpacity key={j} style={[s.childItem, { borderBottomColor: T.border }]}
                      onPress={() => navigateTo(child.route)} activeOpacity={0.7}>
                      <View style={[s.childDot, { backgroundColor: T.sub }]} />
                      <Text style={[s.childLabel, { color: T.sub }]}>{child.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              );
            }
            return null;
          })}

          <View style={[s.planCard, { backgroundColor: T.card, borderWidth: 1, borderColor: T.border }]}>
            <Text style={s.planCardEmoji}>🎉</Text>
            <Text style={[s.planCardTitle, { color: T.text }]}>
              {shop?.plan ? shop.plan.charAt(0).toUpperCase() + shop.plan.slice(1) : 'Gratuit'}
            </Text>
            <Text style={[s.planCardSub, { color: T.sub }]}>Boostez encore votre activité</Text>
            <TouchableOpacity style={s.planCardBtn} onPress={() => navigateTo('/(auth)/packs')}>
              <Text style={s.planCardBtnText}>Changer votre pack</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
            <Ionicons name="log-out-outline" size={18} color="#E53E3E" style={s.menuIcon} />
            <Text style={s.logoutLabel}>Déconnexion</Text>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>
    </>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, paddingTop: 12, borderBottomWidth: 1 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hamburger: { justifyContent: 'center', gap: 5, marginRight: 12, padding: 4 },
  bar: { width: 22, height: 2.5, borderRadius: 2 },
  greetingBlock: { flex: 1 },
  greetingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  greetingName: { fontSize: 15, fontWeight: '800' },
  greetingSub: { fontSize: 11, marginTop: 1 },
  planBadge: { borderRadius: 50, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1.5 },
  planText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  iconBtn: { padding: 6, position: 'relative' },
  notifBadge: { position: 'absolute', top: 2, right: 2, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 },
  notifBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: TEAL, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 13, fontWeight: '800', color: '#fff' },
  overlay: { position: 'absolute', top: 0, left: 0, width: SW, height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 10 },
  sidebar: { position: 'absolute', top: 0, left: 0, width: SIDEBAR_WIDTH, height: '100%', backgroundColor: NAVY, paddingTop: 50, zIndex: 11, shadowColor: '#000', shadowOffset: { width: 6, height: 0 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 20 },
  sidebarLogo: { flexDirection: 'row', alignItems: 'baseline', paddingHorizontal: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#1E3A50' },
  logoEzy: { fontSize: 26, fontWeight: '800', color: '#fff' },
  logoCom: { fontSize: 26, fontWeight: '800', color: TEAL },
  logoSub: { fontSize: 10, color: '#5A8A9A', marginLeft: 4 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#1E3A50' },
  menuIcon: { marginRight: 12 },
  menuLabel: { fontSize: 13, color: '#C8DCE8', fontWeight: '500' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 20, backgroundColor: '#152D42' },
  sectionLabel: { flex: 1, fontSize: 13, color: TEAL, fontWeight: '700' },
  childItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 28, borderBottomWidth: 1, borderBottomColor: '#1E3A50' },
  childDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#5A8A9A', marginRight: 12 },
  childLabel: { fontSize: 12, color: '#A8C0D0' },
  planCard: { margin: 16, backgroundColor: '#fff', borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 8 },
  planCardEmoji: { fontSize: 32, marginBottom: 8 },
  planCardTitle: { fontSize: 18, fontWeight: '800', color: '#1A2940', marginBottom: 4 },
  planCardSub: { fontSize: 12, color: '#8A9AAA', textAlign: 'center', marginBottom: 16 },
  planCardBtn: { backgroundColor: '#1A2940', borderRadius: 50, paddingVertical: 12, paddingHorizontal: 24, width: '100%' },
  planCardBtnText: { color: '#fff', fontWeight: '700', textAlign: 'center', fontSize: 13 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20, marginBottom: 40, borderTopWidth: 1, borderTopColor: '#1E3A50' },
  logoutLabel: { fontSize: 13, color: '#E53E3E', fontWeight: '600' },
  profileOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: 70, paddingRight: 12 },
  profilePanel: { width: 240, backgroundColor: '#fff', borderRadius: 18, paddingVertical: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 10 },
  profilePanelDark: { backgroundColor: NAVY },
  profileHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  profileAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: TEAL, justifyContent: 'center', alignItems: 'center' },
  profileAvatarText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  profileName: { fontSize: 14, fontWeight: '800', color: '#1A2940' },
  profileRole: { fontSize: 12, color: '#8A9AAA', marginTop: 2 },
  profileDivider: { height: 1, backgroundColor: '#E8EEF4' },
  profileSectionLabel: { fontSize: 11, color: '#B0BCC8', fontWeight: '700', letterSpacing: 0.5, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  profileItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13 },
  profileItemText: { fontSize: 14, color: '#1A2940', fontWeight: '500' },
  profileLogoutText: { fontSize: 14, color: '#E53E3E', fontWeight: '600' },
  notifOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: 70, paddingRight: 12 },
  notifPanel: { width: 300, maxWidth: '90%', borderRadius: 18, paddingVertical: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 10 },
  notifHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  notifTitle: { fontSize: 15, fontWeight: '800' },
  notifEmpty: { fontSize: 13, textAlign: 'center', paddingVertical: 30, paddingHorizontal: 16 },
  notifItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  notifItemName: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  notifItemMeta: { fontSize: 12, marginBottom: 2 },
  notifItemDate: { fontSize: 11 },
});