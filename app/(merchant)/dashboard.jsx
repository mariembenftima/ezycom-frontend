import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const SIDEBAR_WIDTH  = 270;
const { width: SW }  = Dimensions.get('window');

const PLAN_COLORS = {
  GRATUIT:    { bg: '#E8EEF4', text: '#6A7A8A', border: '#C8D4E0' },
  ESSOR:      { bg: '#E8F5E9', text: '#2E7D32', border: '#A5D6A7' },
  PROSPERITE: { bg: '#FFF3E0', text: '#E65100', border: '#FFCC80' },
  EMPIRE:     { bg: '#FFF0ED', text: '#C0392B', border: '#FFAB91' },
};

const LIGHT = {
  header: '#fff', headerBorder: '#E8EEF4', text: '#1A2940',
  subText: '#8A9AAA', barStyle: 'dark-content', statusBg: '#fff', hamBar: '#1A2940',
};
const DARK = {
  header: '#0F2035', headerBorder: '#1E3A50', text: '#E2EEF8',
  subText: '#5A8A9A', barStyle: 'light-content', statusBg: '#0F2035', hamBar: '#C8DCE8',
};

const MENU = [
  { type: 'link', icon: 'grid-outline',          label: 'Tableau de bord',    route: '/(merchant)/dashboard' },
  {
    type: 'section', icon: 'cube-outline', label: 'Stock',
    children: [
      { label: 'Catégories',   route: '/(merchant)/stock/categories' },
      { label: 'Produits',     route: '/(merchant)/stock/produits/produits' },
      { label: 'Entrée Stock', route: '/(merchant)/stock/stock-in' },
      { label: 'Sortie Stock', route: '/(merchant)/stock/stock-out' },
    ],
  },
  { type: 'link', icon: 'cart-outline',           label: 'Ajouter Vente',      route: '/(merchant)/ajouter-vente' },
  { type: 'link', icon: 'clipboard-outline',      label: 'Ajouter Commande',   route: '/(merchant)/new-order' },
  {
    type: 'section', icon: 'list-outline', label: 'Commandes',
    children: [
      { label: 'Toutes',            route: '/(merchant)/orders' },
      { label: 'Crées',             route: '/(merchant)/orders?status=pending' },
      { label: 'Validées',          route: '/(merchant)/orders?status=confirmed' },
      { label: 'À enlevées',        route: '/(merchant)/orders?status=pickup' },
      { label: 'Chez transporteur', route: '/(merchant)/orders?status=transit' },
      { label: 'En cours',          route: '/(merchant)/orders?status=shipping' },
      { label: 'Livrés',            route: '/(merchant)/orders?status=delivered' },
      { label: 'Retour',            route: '/(merchant)/orders?status=return' },
      { label: 'Annuler',           route: '/(merchant)/orders?status=cancelled' },
    ],
  },
  { type: 'link', icon: 'mail-outline',           label: 'Réclamations',       route: '/(merchant)/claims' },
  { type: 'link', icon: 'chatbubble-outline',     label: 'Messenger',          route: '/(merchant)/messenger' },
  { type: 'link', icon: 'people-outline',         label: 'Mes clients',        route: '/(merchant)/clients' },
  { type: 'link', icon: 'person-add-outline',     label: 'Mon Équipe',         route: '/(merchant)/team' },
  {
    type: 'section', icon: 'cash-outline', label: 'Finance',
    children: [{ label: 'Caisse', route: '/(merchant)/finance' }],
  },
  {
    type: 'section', icon: 'document-text-outline', label: 'Facturation',
    children: [
      { label: 'Factures',                     route: '/(merchant)/invoices' },
      { label: 'Ajouter une nouvelle facture', route: '/(merchant)/invoices/new' },
      { label: 'Informations de facturation',  route: '/(merchant)/invoices/settings' },
    ],
  },
  {
    type: 'section', icon: 'globe-outline', label: 'ezy.ezycom.tn',
    children: [
      { label: 'Paramètres',          route: '/(merchant)/site/settings' },
      { label: 'Produits recherchés', route: '/(merchant)/site/searched' },
      { label: 'Produits en promo',   route: '/(merchant)/site/promo' },
      { label: 'Vente Flash',         route: '/(merchant)/site/flash' },
    ],
  },
  { type: 'link', icon: 'car-outline', label: 'Mes Transporteurs', route: '/(merchant)/shippers' },
];

export default function AppHeader({ session, darkMode, onToggleDark, onLogout }) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [expanded,    setExpanded]    = useState({});
  const [isOpen,      setIsOpen]      = useState(false);

  const slideAnim   = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  const T = darkMode ? DARK : LIGHT;

  const { user, shop } = session || {};
  const plan      = (shop?.plan || 'gratuit').toUpperCase();
  const planStyle = PLAN_COLORS[plan] || PLAN_COLORS.GRATUIT;
  const firstName = user?.name?.split(' ')[0] || 'Utilisateur';
  const initials  = user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';

  const toggleSection = (label) =>
    setExpanded(prev => ({ ...prev, [label]: !prev[label] }));

  const openSidebar = () => {
    setIsOpen(true);
    Animated.parallel([
      Animated.timing(slideAnim,   { toValue: 0,              duration: 280, useNativeDriver: true }),
      Animated.timing(overlayAnim, { toValue: 1,              duration: 280, useNativeDriver: true }),
    ]).start();
  };

  const closeSidebar = (callback) => {
    Animated.parallel([
      Animated.timing(slideAnim,   { toValue: -SIDEBAR_WIDTH, duration: 240, useNativeDriver: true }),
      Animated.timing(overlayAnim, { toValue: 0,              duration: 240, useNativeDriver: true }),
    ]).start(() => {
      setIsOpen(false);
      if (callback) callback();
    });
  };

  const navigateTo = (route) => closeSidebar(() => router.push(route));

  const handleLogout = () => {
    setProfileOpen(false);
    onLogout?.();
  };

  return (
    <>
      <StatusBar barStyle={T.barStyle} backgroundColor={T.statusBg} />

      <View style={[s.header, {
        backgroundColor: T.header,
        borderBottomColor: T.headerBorder,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
      }]}>
        <View style={s.headerLeft}>
          <TouchableOpacity onPress={openSidebar} style={s.hamburger}>
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
            <Text style={[s.greetingSub, { color: T.subText }]}>Vous utilisez le pack</Text>
          </View>
        </View>
        <View style={s.headerRight}>
          <TouchableOpacity style={s.iconBtn} onPress={onToggleDark}>
            <Ionicons name={darkMode ? 'moon' : 'sunny-outline'} size={22} color={darkMode ? '#29B6D8' : '#B0BCC8'} />
          </TouchableOpacity>
          <TouchableOpacity style={s.avatar} onPress={() => setProfileOpen(true)}>
            <Text style={s.avatarText}>{initials}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={profileOpen} transparent animationType="fade" onRequestClose={() => setProfileOpen(false)}>
        <Pressable style={s.profileOverlay} onPress={() => setProfileOpen(false)}>
          <Pressable style={[s.profilePanel, darkMode && s.profilePanelDark]} onPress={() => {}}>
            <View style={s.profileHeader}>
              <View style={s.profileAvatar}>
                <Text style={s.profileAvatarText}>{initials}</Text>
              </View>
              <View style={{ marginLeft: 14 }}>
                <Text style={[s.profileName, darkMode && { color: '#E2EEF8' }]}>{user?.name || 'Utilisateur'}</Text>
                <Text style={s.profileRole}>E-commerçant</Text>
              </View>
            </View>
            <View style={[s.profileDivider, darkMode && { backgroundColor: '#1E3A50' }]} />
            <Text style={[s.profileSectionLabel, darkMode && { color: '#5A8A9A' }]}>Mon compte</Text>
            <TouchableOpacity style={s.profileItem}
              onPress={() => { setProfileOpen(false); router.push('/(merchant)/profile'); }}>
              <Ionicons name="person-outline" size={18} color={darkMode ? '#A8C0D0' : '#6A7A8A'} style={{ marginRight: 12 }} />
              <Text style={[s.profileItemText, darkMode && { color: '#C8DCE8' }]}>Profil</Text>
              <Ionicons name="chevron-forward" size={16} color={darkMode ? '#3A6A8A' : '#C8D4E0'} style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>
            <View style={[s.profileDivider, darkMode && { backgroundColor: '#1E3A50' }]} />
            <Text style={[s.profileSectionLabel, darkMode && { color: '#5A8A9A' }]}>Paramètres</Text>
            <TouchableOpacity style={s.profileItem}
              onPress={() => { setProfileOpen(false); router.push('/(merchant)/help'); }}>
              <Ionicons name="help-circle-outline" size={18} color={darkMode ? '#A8C0D0' : '#6A7A8A'} style={{ marginRight: 12 }} />
              <Text style={[s.profileItemText, darkMode && { color: '#C8DCE8' }]}>Aide</Text>
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

      {isOpen && (
        <Animated.View style={[s.overlay, { opacity: overlayAnim }]} pointerEvents="auto">
          <Pressable style={{ flex: 1 }} onPress={() => closeSidebar()} />
        </Animated.View>
      )}

      <Animated.View style={[s.sidebar, { transform: [{ translateX: slideAnim }] }]}>
        <View style={s.sidebarLogo}>
          <Text style={s.logoEzy}>Ezy</Text>
          <Text style={s.logoCom}>com</Text>
          <Text style={s.logoSub}>  Stock & Delivery</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          {MENU.map((item, i) => {
            if (item.type === 'link') {
              return (
                <TouchableOpacity key={i} style={s.menuItem}
                  onPress={() => navigateTo(item.route)}
                  activeOpacity={0.7}>
                  <Ionicons name={item.icon} size={18} color="#A8C0D0" style={s.menuIcon} />
                  <Text style={s.menuLabel}>{item.label}</Text>
                </TouchableOpacity>
              );
            }
            if (item.type === 'section') {
              const isExpanded = expanded[item.label] ?? false;
              return (
                <View key={i}>
                  <TouchableOpacity style={s.sectionHeader}
                    onPress={() => toggleSection(item.label)} activeOpacity={0.8}>
                    <Ionicons name={item.icon} size={18} color="#29B6D8" style={s.menuIcon} />
                    <Text style={s.sectionLabel}>{item.label}</Text>
                    <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color="#29B6D8" />
                  </TouchableOpacity>
                  {isExpanded && item.children.map((child, j) => (
                    <TouchableOpacity key={j} style={s.childItem}
                      onPress={() => navigateTo(child.route)}
                      activeOpacity={0.7}>
                      <View style={s.childDot} />
                      <Text style={s.childLabel}>{child.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              );
            }
            return null;
          })}

          <View style={s.planCard}>
            <Text style={s.planCardEmoji}>🎉</Text>
            <Text style={s.planCardTitle}>
              {shop?.plan ? shop.plan.charAt(0).toUpperCase() + shop.plan.slice(1) : 'Gratuit'}
            </Text>
            <Text style={s.planCardSub}>Boostez encore votre activité</Text>
            <TouchableOpacity style={s.planCardBtn}>
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
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12, paddingTop: 12, borderBottomWidth: 1,
  },
  headerLeft:    { flexDirection: 'row', alignItems: 'center', flex: 1 },
  headerRight:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hamburger:     { justifyContent: 'center', gap: 5, marginRight: 12, padding: 4 },
  bar:           { width: 22, height: 2.5, borderRadius: 2 },
  greetingBlock: { flex: 1 },
  greetingRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  greetingName:  { fontSize: 15, fontWeight: '800' },
  greetingSub:   { fontSize: 11, marginTop: 1 },
  planBadge:     { borderRadius: 50, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1.5 },
  planText:      { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  iconBtn:       { padding: 6 },
  avatar:        { width: 36, height: 36, borderRadius: 18, backgroundColor: '#29B6D8', justifyContent: 'center', alignItems: 'center' },
  avatarText:    { fontSize: 13, fontWeight: '800', color: '#fff' },

  overlay: {
    position: 'absolute', top: 0, left: 0,
    width: SW, height: '100%',
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 10,
  },
  sidebar: {
    position: 'absolute', top: 0, left: 0,
    width: SIDEBAR_WIDTH, height: '100%',
    backgroundColor: '#0F2035', paddingTop: 50,
    zIndex: 11,
    shadowColor: '#000', shadowOffset: { width: 6, height: 0 },
    shadowOpacity: 0.35, shadowRadius: 16, elevation: 20,
  },

  sidebarLogo:  { flexDirection: 'row', alignItems: 'baseline', paddingHorizontal: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#1E3A50' },
  logoEzy:      { fontSize: 26, fontWeight: '800', color: '#fff' },
  logoCom:      { fontSize: 26, fontWeight: '800', color: '#29B6D8' },
  logoSub:      { fontSize: 10, color: '#5A8A9A', marginLeft: 4 },
  menuItem:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#1E3A50' },
  menuIcon:     { marginRight: 12 },
  menuLabel:    { fontSize: 13, color: '#C8DCE8', fontWeight: '500' },
  sectionHeader:{ flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 20, backgroundColor: '#152D42' },
  sectionLabel: { flex: 1, fontSize: 13, color: '#29B6D8', fontWeight: '700' },
  childItem:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 28, borderBottomWidth: 1, borderBottomColor: '#1E3A50' },
  childDot:     { width: 5, height: 5, borderRadius: 3, backgroundColor: '#5A8A9A', marginRight: 12 },
  childLabel:   { fontSize: 12, color: '#A8C0D0' },
  planCard:        { margin: 16, backgroundColor: '#fff', borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 8 },
  planCardEmoji:   { fontSize: 32, marginBottom: 8 },
  planCardTitle:   { fontSize: 18, fontWeight: '800', color: '#1A2940', marginBottom: 4 },
  planCardSub:     { fontSize: 12, color: '#8A9AAA', textAlign: 'center', marginBottom: 16 },
  planCardBtn:     { backgroundColor: '#1A2940', borderRadius: 50, paddingVertical: 12, paddingHorizontal: 24, width: '100%' },
  planCardBtnText: { color: '#fff', fontWeight: '700', textAlign: 'center', fontSize: 13 },
  logoutBtn:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20, marginBottom: 40, borderTopWidth: 1, borderTopColor: '#1E3A50' },
  logoutLabel:  { fontSize: 13, color: '#E53E3E', fontWeight: '600' },

  profileOverlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: 70, paddingRight: 12 },
  profilePanel:       { width: 240, backgroundColor: '#fff', borderRadius: 18, paddingVertical: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 10 },
  profilePanelDark:   { backgroundColor: '#0F2035' },
  profileHeader:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  profileAvatar:      { width: 44, height: 44, borderRadius: 22, backgroundColor: '#29B6D8', justifyContent: 'center', alignItems: 'center' },
  profileAvatarText:  { fontSize: 16, fontWeight: '800', color: '#fff' },
  profileName:        { fontSize: 14, fontWeight: '800', color: '#1A2940' },
  profileRole:        { fontSize: 12, color: '#8A9AAA', marginTop: 2 },
  profileDivider:     { height: 1, backgroundColor: '#E8EEF4' },
  profileSectionLabel:{ fontSize: 11, color: '#B0BCC8', fontWeight: '700', letterSpacing: 0.5, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  profileItem:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13 },
  profileItemText:    { fontSize: 14, color: '#1A2940', fontWeight: '500' },
  profileLogoutText:  { fontSize: 14, color: '#E53E3E', fontWeight: '600' },
});