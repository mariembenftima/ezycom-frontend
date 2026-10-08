import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Dimensions,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

const { width } = Dimensions.get('window');

const TEAL = '#29B6D8';
const NAVY = '#0d1b2a';
const NAVY2 = '#112233';
const CARD_DARK = '#0f1e30';
const CARD_MID = '#162840';

const PLANS = [
  {
    id: 'gratuit',
    name: 'Gratuit',
    subtitle: 'Commence en douceur',
    price: 0,
    priceLabel: 'DT',
    unit: 'Essai HT',
    diigo: null,
    diigoPrice: null,
    cta: "S'inscrire",
    ctaArrow: true,
    trialLabel: '0 DT pendant 15 jours',
    features: [
      'Produits illimités',
      'Commandes illimitées',
      '1 utilisateur',
      'Support basique (email)',
    ],
    highlight: false,
    badge: null,
  },
  {
    id: 'essor',
    name: 'Essor',
    subtitle: 'Accélérez la boutique',
    price: 149,
    priceLabel: 'DT',
    unit: 'mois HT',
    diigo: '99 DT si livraison avec Diigo',
    cta: 'Commander',
    ctaArrow: true,
    trialLabel: null,
    features: [
      '50 produits · 400 commandes/mois',
      '2 utilisateurs · Support Email + chat',
      'Non transporteurs · Boutique perso.',
    ],
    highlight: true,
    badge: 'Meilleure Vente',
  },
  {
    id: 'prosperite',
    name: 'Prosperite',
    subtitle: 'Vice la scalabilité',
    price: 249,
    priceLabel: 'DT',
    unit: 'mois HT',
    diigo: '199 DT si livraison avec Diigo',
    cta: 'Commander',
    ctaArrow: true,
    trialLabel: null,
    features: [
      '200 produits · 1500 commandes/mois',
      '5 utilisateurs · Statistiques & rapports',
      'SEO · Accès API Ezycom',
    ],
    highlight: false,
    badge: null,
  },
  {
    id: 'empire',
    name: 'Empire',
    subtitle: 'Dominez sans limites',
    price: 349,
    priceLabel: 'DT',
    unit: 'mois HT',
    diigo: '299 DT si livraison avec Diigo',
    cta: 'Commander',
    ctaArrow: true,
    trialLabel: null,
    features: [
      'Produits illimités · Commandes illimitées',
      '10 utilisateurs',
      'Paiement en ligne · Application mobile',
    ],
    highlight: false,
    badge: null,
  },
];

const TABLE_ROWS = [
  { label: "Nombre de produits",        values: ['5', '50', '200', 'Illimité'], section: null },
  { label: "Nombre de commandes",       values: ['40', '400', '1500', 'Illimité'], section: null },
  { label: "Images / produit",          values: ['1', '4', '4', '4'], section: null },
  { label: "Nombre d'utilisateurs",     values: ['1', '2', '5', '10'], section: null },
  { label: "Nombre de catégories",      values: ['1', '5', '10', 'Illimité'], section: null },
  { label: "Support technique",         values: ['Basique', 'Email+chat', 'Standard', 'VIP dédié'], section: null },
  { label: null, values: null, section: 'FONCTIONNALITÉS' },
  { label: "Intégration transporteurs", values: [false, false, true, true], section: null },
  { label: "Connexion réseaux sociaux", values: [false, false, true, true], section: null },
  { label: "Sauvegarde automatique",    values: [false, true, true, true], section: null },
  { label: "Boutique personnalisée",    values: [false, true, true, true], section: null },
  { label: "Pages personnalisées (CQV)", values: [false, false, true, true], section: null },
  { label: "Statistiques & rapports",   values: [false, false, true, true], section: null },
  { label: "SEO & Référencement",       values: [false, false, true, true], section: null },
  { label: "Accès API Ezycom",          values: [false, false, false, true], section: null },
  { label: "Nom de domaine personnalisé", values: [false, false, false, true], section: null },
  { label: "Paiement en ligne",         values: [false, false, false, true], section: null },
  { label: "Module de facturation",     values: [false, false, true, true], section: null },
  { label: "Application mobile",        values: [false, false, false, true], section: null },
];

const FAQ_TABS = ["Packs & fonctionnalités", "Espace commerçant"];
const FAQ_ITEMS = [
  {
    q: "Qu'est-ce que Ezycom ?",
    a: "Ezycom est une plateforme SaaS 100% tunisienne qui permet aux commerçants de créer facilement leur boutique en ligne.",
  },
  {
    q: "Quels types de services Ezycom propose ?",
    a: "Ezycom propose la création de boutique en ligne, la gestion des commandes, l'intégration de transporteurs, et bien plus encore.",
  },
  {
    q: "Quels sont les différents packs disponibles ?",
    a: "Ezycom propose 4 packs : Gratuit (essai 15 jours), Essor (149 DT/mois), Prosperite (249 DT/mois) et Empire (349 DT/mois).",
  },
  {
    q: "Puis-je changer de pack plus tard ?",
    a: "Oui ! Vous pouvez upgrader ou downgrader votre pack à tout moment depuis votre espace commerçant.",
  },
];

function FAQItem({ item }) {
  const [open, setOpen] = useState(false);
  return (
    <TouchableOpacity
      style={faqStyles.item}
      onPress={() => setOpen(!open)}
      activeOpacity={0.8}
    >
      <View style={faqStyles.row}>
        <Text style={faqStyles.question}>{item.q}</Text>
        <Ionicons
          name={open ? 'remove' : 'add'}
          size={18}
          color={open ? TEAL : '#fff'}
        />
      </View>
      {open && <Text style={faqStyles.answer}>{item.a}</Text>}
    </TouchableOpacity>
  );
}

const faqStyles = StyleSheet.create({
  item: {
    borderBottomWidth: 1,
    borderBottomColor: '#1e3048',
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  question: {
    fontSize: 13,
    color: '#e2e8f0',
    fontWeight: '500',
    flex: 1,
    lineHeight: 19,
  },
  answer: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 10,
    lineHeight: 18,
  },
});

function Cell({ val, highlight }) {
  if (typeof val === 'boolean') {
    return (
      <View style={[tableStyles.cell, highlight && tableStyles.cellHighlight]}>
        <Ionicons
          name={val ? 'checkmark' : 'close'}
          size={14}
          color={val ? TEAL : '#394a5e'}
        />
      </View>
    );
  }
  return (
    <View style={[tableStyles.cell, highlight && tableStyles.cellHighlight]}>
      <Text style={[tableStyles.cellText, highlight && tableStyles.cellTextHighlight]}>
        {val}
      </Text>
    </View>
  );
}

const tableStyles = StyleSheet.create({
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
  },
  cellHighlight: {
    backgroundColor: 'rgba(41,182,216,0.07)',
  },
  cellText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
    textAlign: 'center',
  },
  cellTextHighlight: {
    color: TEAL,
    fontWeight: '700',
  },
});

export default function RegisterScreen() {
  const [faqTab, setFaqTab] = useState(0);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />

      <View style={styles.header}>
        <Text style={styles.logo}>Ezycom</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.monCompteBtn}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.monCompteTxt}>Mon Compte</Text>
          </TouchableOpacity>
          <Ionicons name="menu" size={22} color="#fff" style={{ marginLeft: 14 }} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.hero}>Des packs flexibles,{'\n'}pensés pour chaque ambition</Text>

        {PLANS.map((plan, i) => (
          <View
            key={plan.id}
            style={[
              styles.planCard,
              plan.highlight && styles.planCardHighlight,
            ]}
          >
            {plan.badge && (
              <View style={styles.planBadge}>
                <Ionicons name="star" size={10} color="#fff" style={{ marginRight: 4 }} />
                <Text style={styles.planBadgeText}>{plan.badge}</Text>
              </View>
            )}

            <Text style={styles.planSubtitle}>{plan.subtitle}</Text>
            <Text style={[styles.planName, plan.highlight && styles.planNameHighlight]}>
              {plan.name}
            </Text>

            <View style={styles.planPriceRow}>
              <Text style={[styles.planPrice, plan.highlight && styles.planPriceHighlight]}>
                {plan.price}
              </Text>
              <View style={styles.planPriceMeta}>
                <Text style={styles.planPriceDT}>{plan.priceLabel}</Text>
                <Text style={styles.planPriceUnit}>{plan.unit}</Text>
              </View>
            </View>

            {plan.features.map((f, fi) => (
              <Text key={fi} style={styles.planFeature}>{f}</Text>
            ))}

            <View style={styles.planCtaRow}>
              {plan.diigo && (
                <TouchableOpacity style={styles.diigoBtn}>
                  <Text style={styles.diigoBtnText}>{plan.diigo}</Text>
                </TouchableOpacity>
              )}
              {plan.trialLabel && (
                <TouchableOpacity style={styles.trialBtn}>
                  <Text style={styles.trialBtnText}>{plan.trialLabel}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.ctaBtn, plan.highlight && styles.ctaBtnHighlight]}
              >
                <Text style={[styles.ctaBtnText, plan.highlight && styles.ctaBtnTextHighlight]}>
                  {plan.cta} →
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Comparez nos packs</Text>
        <Text style={styles.sectionSub}>
          Nos packs sont conçus pour vous accompagner à chaque étape.
        </Text>

        <View style={styles.table}>
          <View style={styles.tableRow}>
            <View style={styles.tableHeaderLabel} />
            {['Gratuit', 'Essor', 'Prosperite', 'Empire'].map((h, i) => (
              <View
                key={h}
                style={[styles.tableHeaderCell, i === 1 && styles.tableHeaderCellHighlight]}
              >
                <Text style={[styles.tableHeaderText, i === 1 && styles.tableHeaderTextHighlight]}>
                  {h}
                </Text>
              </View>
            ))}
          </View>

          {TABLE_ROWS.map((row, ri) => {
            if (row.section) {
              return (
                <View key={ri} style={styles.tableSectionRow}>
                  <Text style={styles.tableSectionText}>{row.section}</Text>
                </View>
              );
            }
            return (
              <View key={ri} style={[styles.tableRow, ri % 2 === 0 && styles.tableRowAlt]}>
                <View style={styles.tableLabel}>
                  <Text style={styles.tableLabelText}>{row.label}</Text>
                </View>
                {row.values.map((val, vi) => (
                  <Cell key={vi} val={val} highlight={vi === 1} />
                ))}
              </View>
            );
          })}
        </View>

        {}
        <Text style={[styles.sectionTitle, { marginTop: 32 }]}>Foire aux Questions</Text>
        <Text style={styles.sectionSub}>
          Tout ce que vous devez savoir sur Ezycom.
        </Text>

        {}
        <View style={styles.faqTabs}>
          {FAQ_TABS.map((tab, ti) => (
            <TouchableOpacity
              key={tab}
              style={[styles.faqTab, faqTab === ti && styles.faqTabActive]}
              onPress={() => setFaqTab(ti)}
            >
              <Text style={[styles.faqTabText, faqTab === ti && styles.faqTabTextActive]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {}
        <View style={styles.faqLinks}>
          {['axx.ezycom.tn', 'Inscription & Upgrade'].map((l, li) => (
            <TouchableOpacity key={l} style={styles.faqLink}>
              <Ionicons name={li === 0 ? 'globe-outline' : 'person-add-outline'} size={13} color={TEAL} style={{ marginRight: 5 }} />
              <Text style={styles.faqLinkText}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {}
        <View style={styles.faqList}>
          {FAQ_ITEMS.map((item, i) => (
            <FAQItem key={i} item={item} />
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NAVY,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 44 : 54,
    paddingBottom: 14,
    backgroundColor: NAVY,
  },
  logo: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  monCompteBtn: {
    borderWidth: 1,
    borderColor: TEAL,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  monCompteTxt: {
    color: TEAL,
    fontSize: 12,
    fontWeight: '600',
  },

  scroll: {
    paddingHorizontal: 18,
    paddingTop: 10,
  },

  hero: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 30,
    marginBottom: 22,
    letterSpacing: -0.3,
  },

  planCard: {
    backgroundColor: CARD_DARK,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1a3050',
  },
  planCardHighlight: {
    backgroundColor: '#0a2a45',
    borderColor: TEAL,
    borderWidth: 1.5,
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    backgroundColor: TEAL,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 6,
  },
  planBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  planSubtitle: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  planName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#cbd5e1',
    marginBottom: 8,
  },
  planNameHighlight: {
    color: '#fff',
  },
  planPriceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
    gap: 6,
  },
  planPrice: {
    fontSize: 48,
    fontWeight: '900',
    color: '#94a3b8',
    lineHeight: 52,
  },
  planPriceHighlight: {
    color: TEAL,
  },
  planPriceMeta: {
    marginBottom: 6,
  },
  planPriceDT: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748b',
  },
  planPriceUnit: {
    fontSize: 11,
    color: '#475569',
  },
  planFeature: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 19,
  },
  planCtaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 14,
    flexWrap: 'wrap',
  },
  diigoBtn: {
    backgroundColor: 'rgba(41,182,216,0.12)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flex: 1,
  },
  diigoBtnText: {
    color: TEAL,
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  trialBtn: {
    backgroundColor: 'rgba(41,182,216,0.12)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flex: 1,
  },
  trialBtnText: {
    color: TEAL,
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  ctaBtn: {
    backgroundColor: '#1a3050',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#2a4a6e',
  },
  ctaBtnHighlight: {
    backgroundColor: TEAL,
    borderColor: TEAL,
  },
  ctaBtnText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
  },
  ctaBtnTextHighlight: {
    color: '#fff',
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 6,
    marginTop: 10,
  },
  sectionSub: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 18,
    lineHeight: 18,
  },

  table: {
    backgroundColor: CARD_DARK,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1a3050',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 38,
  },
  tableRowAlt: {
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  tableHeaderLabel: {
    width: 120,
  },
  tableHeaderCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  tableHeaderCellHighlight: {
    backgroundColor: 'rgba(41,182,216,0.1)',
    borderBottomWidth: 2,
    borderBottomColor: TEAL,
  },
  tableHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    textAlign: 'center',
  },
  tableHeaderTextHighlight: {
    color: TEAL,
  },
  tableLabel: {
    width: 120,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  tableLabelText: {
    fontSize: 10.5,
    color: '#64748b',
    lineHeight: 15,
  },
  tableSectionRow: {
    backgroundColor: '#0a1a2a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#1a3050',
  },
  tableSectionText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  faqTabs: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  faqTab: {
    flex: 1,
    borderRadius: 22,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#0f1e30',
    borderWidth: 1,
    borderColor: '#1a3050',
  },
  faqTabActive: {
    backgroundColor: TEAL,
    borderColor: TEAL,
  },
  faqTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    textAlign: 'center',
  },
  faqTabTextActive: {
    color: '#fff',
  },
  faqLinks: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 6,
  },
  faqLink: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f1e30',
    borderRadius: 22,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#1a3050',
    justifyContent: 'center',
  },
  faqLinkText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  faqList: {
    backgroundColor: CARD_DARK,
    borderRadius: 14,
    paddingHorizontal: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#1a3050',
  },
});