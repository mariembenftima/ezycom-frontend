import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../../utils/api';
import { loadSession } from '../../../utils/auth';
import { loadDarkMode, saveDarkMode } from '../../../utils/darkMode';
import { DARK, LIGHT, TEAL } from '../../../utils/theme';
import AppFooter from '../../components/AppFooter';
import AppHeader from '../../components/AppHeader';

const BG = LIGHT.bg;

const money = v => (parseFloat(v) || 0).toFixed(3);

const today = () => new Date().toISOString().slice(0, 10);

const TIMBRE_FISCAL = 1;

const STEPS = ['Client', 'Produits', 'Confirmation'];

export default function AjouterFactureScreen() {
    const { fromCommande } = useLocalSearchParams();

    const [session,     setSession]     = useState(null);
    const [darkMode,    setDarkMode]    = useState(false);
    const [step,        setStep]        = useState(0);
    const [saving,      setSaving]      = useState(false);
    const [prefilling,  setPrefilling]  = useState(false);

    const [client, setClient] = useState({
        num_facture: '', date_facture: today(),
        nom: '', prenom: '', tel: '', mf: '', adresse: '',
    });

    const [tauxTaxe, setTauxTaxe] = useState(19);
    const [items, setItems] = useState([
        { key: Date.now(), id_produit: null, nom: '', prix_unitaire: '', quantite: '1' },
    ]);

    const [produits,    setProduits]    = useState([]);
    const [pickerOpen,  setPickerOpen]  = useState(false);
    const [pickerFor,   setPickerFor]   = useState(null);
    const [search,      setSearch]      = useState('');

    const T = darkMode ? DARK : LIGHT;

    useEffect(() => {
        loadDarkMode().then(setDarkMode);
        loadSession().then(s => {
            if (!s) { router.replace('/(auth)/login'); return; }
            setSession(s);
            fetchProduits();
        });
    }, []);

    useEffect(() => {
        if (!fromCommande) return;
        setPrefilling(true);
        (async () => {
            try {
                const data = await api.get(`/api/orders/orders-get.php?id=${fromCommande}`);
                const cmd = data.data?.commande;
                const articles = data.data?.articles || [];

                setClient(c => ({
                    ...c,
                    nom:     cmd?.nom || '',
                    prenom:  cmd?.prenom || '',
                    tel:     cmd?.tel || '',
                    adresse: cmd?.adresse || '',
                    // Matricule fiscale non pré-rempli : le marchand doit le saisir.
                }));

                if (articles.length > 0) {
                    setItems(articles.map(a => ({
                        key:           `cmd-${a.id}`,
                        id_produit:    a.id_prod,
                        nom:           a.produit_nom || '',
                        prix_unitaire: String(a.prix ?? ''),
                        quantite:      String(Math.max(1, parseInt(a.qte, 10) || 1)),
                    })));
                }
            } catch (e) {
                Alert.alert('Erreur', 'Impossible de charger la commande : ' + e.message);
            } finally {
                setPrefilling(false);
            }
        })();
    }, [fromCommande]);

    const fetchProduits = async () => {
        try {
            const data = await api.get('/api/products/produits/products-list.php?limit=100');
            if (data.success) setProduits(data.data?.produits ?? data.data ?? []);
        } catch {}
    };

    const setField = (k, v) => setClient(c => ({ ...c, [k]: v }));

    const changeQty = (key, delta) =>
        setItems(prev => prev.map(it => it.key === key
            ? { ...it, quantite: String(Math.max(1, (parseInt(it.quantite) || 1) + delta)) }
            : it));

    const addItem = () =>
        setItems(prev => [...prev, { key: Date.now(), id_produit: null, nom: '', prix_unitaire: '', quantite: '1' }]);

    const removeItem = (key) =>
        setItems(prev => prev.length === 1 ? prev : prev.filter(it => it.key !== key));

    const openPicker = (key) => { setPickerFor(key); setSearch(''); setPickerOpen(true); };

    const choose = (p) => {
        setItems(prev => prev.map(it => it.key === pickerFor
            ? { ...it, id_produit: p.id, nom: p.nom, prix_unitaire: String(p.prix ?? '') }
            : it));
        setPickerOpen(false);
    };

    const totalHt  = items.reduce((s, it) => s + (parseFloat(it.prix_unitaire) || 0) * (parseInt(it.quantite) || 0), 0);
    const totalTtc = totalHt * (1 + tauxTaxe / 100);

    const validateStep1 = () => {
        if (!client.num_facture.trim()) { Alert.alert('Champ requis', 'Le numéro de facture est obligatoire.'); return false; }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(client.date_facture.trim())) { Alert.alert('Format invalide', 'La date doit être au format AAAA-MM-JJ.'); return false; }
        if (!client.nom.trim()) { Alert.alert('Champ requis', 'Le nom du client est obligatoire.'); return false; }
        if (!client.tel.trim()) { Alert.alert('Champ requis', 'Le téléphone du client est obligatoire.'); return false; }
        if (!client.mf.trim()) { Alert.alert('Champ requis', 'Le matricule fiscale du client est obligatoire.'); return false; }
        return true;
    };

    const validateStep2 = () => {
        const valid = items.filter(it => it.id_produit);
        if (valid.length === 0) { Alert.alert('Produits', 'Ajoutez au moins un produit.'); return false; }
        return true;
    };

    const next = () => {
        if (step === 0 && !validateStep1()) return;
        if (step === 1 && !validateStep2()) return;
        setStep(s => Math.min(s + 1, 2));
    };

    const back = () => {
        if (step === 0) { router.back(); return; }
        setStep(s => s - 1);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = {
                num_facture:  client.num_facture.trim(),
                date_facture: client.date_facture.trim(),
                taux_taxe:    tauxTaxe,
                client: {
                    nom:     client.nom.trim(),
                    prenom:  client.prenom.trim(),
                    tel:     client.tel.trim(),
                    adresse: client.adresse.trim(),
                    mf:      client.mf.trim(),
                },
                items: items
                    .filter(it => it.id_produit)
                    .map(it => ({
                        id_produit:    it.id_produit,
                        quantite:      parseInt(it.quantite) || 0,
                        prix_unitaire: parseFloat(it.prix_unitaire) || 0,
                    })),
                id_commande: fromCommande ? parseInt(fromCommande, 10) : null,
            };

            const data = await api.post('/api/factures/create.php', payload);
            if (data.success) {
                Alert.alert('✓ Créée', 'La facture a été enregistrée.', [
                    { text: 'OK', onPress: () => router.replace('/(merchant)/facture/factures') },
                ]);
            } else {
                Alert.alert('Erreur', data.message || 'Création impossible.');
            }
        } catch (e) {
            Alert.alert('Erreur', e.message || 'Impossible de contacter le serveur.');
        } finally {
            setSaving(false);
        }
    };

    if (!session) return <View style={[st.center, { backgroundColor: T.bg }]}><ActivityIndicator size="large" color={TEAL} /></View>;

    const filtered = produits.filter(p =>
        !search.trim() || String(p.nom ?? '').toLowerCase().includes(search.trim().toLowerCase())
    );

    return (
        <SafeAreaView style={[st.safe, { backgroundColor: T.bg }]}>
            <AppHeader
                session={session} darkMode={darkMode}
                onToggleDark={() => { const n = !darkMode; setDarkMode(n); saveDarkMode(n); }}
                onLogout={() => router.replace('/(auth)/login')}
            />

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 80}
            >
                <ScrollView style={st.scroll} contentContainerStyle={st.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                    <View style={st.breadcrumbRow}>
                        <Text style={[st.breadcrumbBack, { color: T.sub }]} onPress={() => router.push('/(merchant)/facture/factures')}>Factures</Text>
                        <Ionicons name="chevron-forward" size={13} color={T.sub} />
                        <Text style={st.breadcrumbCurrent}>Nouvelle facture</Text>
                    </View>

                    <Text style={[st.pageTitle, { color: T.text }]}>Nouvelle facture</Text>

                    {fromCommande ? (
                        <View style={st.commandeNotice}>
                            {prefilling ? (
                                <ActivityIndicator size="small" color={TEAL} />
                            ) : (
                                <Ionicons name="information-circle" size={16} color={TEAL} />
                            )}
                            <Text style={st.commandeNoticeTxt}>
                                {prefilling
                                    ? `Chargement des données de la commande #${fromCommande}...`
                                    : `Pré-rempli depuis la commande #${fromCommande}. Vérifiez les infos et complétez le matricule fiscale.`}
                            </Text>
                        </View>
                    ) : null}

                    <View style={st.stepper}>
                        {STEPS.map((label, i) => (
                            <View key={label} style={st.stepWrap}>
                                <View style={[st.stepDot, { backgroundColor: T.border }, i <= step && st.stepDotOn]}>
                                    <Text style={[st.stepNum, { color: T.sub }, i <= step && st.stepNumOn]}>{i + 1}</Text>
                                </View>
                                <Text style={[st.stepLabel, { color: T.sub }, i === step && st.stepLabelOn]}>{label}</Text>
                                {i < STEPS.length - 1 && <View style={[st.stepBar, { backgroundColor: T.border }, i < step && st.stepBarOn]} />}
                            </View>
                        ))}
                    </View>

                    {step === 0 && (
                        <View style={[st.card, { backgroundColor: T.card }]}>
                            <Text style={[st.cardTitle, { color: T.text }]}>Informations client</Text>
                            <View style={[st.divider, { backgroundColor: T.border }]} />

                            <Text style={[st.label, { color: T.sub }]}>N° de facture <Text style={st.req}>*</Text></Text>
                            <TextInput style={[st.input, { backgroundColor: T.searchBg, borderColor: T.border, color: T.text }]} placeholder="Ex: FA-2026-001" placeholderTextColor={T.sub}
                                value={client.num_facture} onChangeText={v => setField('num_facture', v)} />

                            <Text style={[st.label, { color: T.sub }]}>Date de facture <Text style={st.req}>*</Text></Text>
                            <TextInput style={[st.input, { backgroundColor: T.searchBg, borderColor: T.border, color: T.text }]} placeholder="AAAA-MM-JJ" placeholderTextColor={T.sub}
                                value={client.date_facture} onChangeText={v => setField('date_facture', v)} />

                            <Text style={[st.label, { color: T.sub }]}>Nom <Text style={st.req}>*</Text></Text>
                            <TextInput style={[st.input, { backgroundColor: T.searchBg, borderColor: T.border, color: T.text }]} placeholder="Nom du client" placeholderTextColor={T.sub}
                                value={client.nom} onChangeText={v => setField('nom', v)} />

                            <Text style={[st.label, { color: T.sub }]}>Prénom</Text>
                            <TextInput style={[st.input, { backgroundColor: T.searchBg, borderColor: T.border, color: T.text }]} placeholder="Prénom du client" placeholderTextColor={T.sub}
                                value={client.prenom} onChangeText={v => setField('prenom', v)} />

                            <Text style={[st.label, { color: T.sub }]}>Téléphone <Text style={st.req}>*</Text></Text>
                            <TextInput style={[st.input, { backgroundColor: T.searchBg, borderColor: T.border, color: T.text }]} placeholder="Ex: 20123456" placeholderTextColor={T.sub}
                                keyboardType="phone-pad" value={client.tel} onChangeText={v => setField('tel', v)} />

                            <Text style={[st.label, { color: T.sub }]}>Matricule fiscale <Text style={st.req}>*</Text></Text>
                            <TextInput style={[st.input, { backgroundColor: T.searchBg, borderColor: T.border, color: T.text }]} placeholder="Ex: 1234567/A/M/000" placeholderTextColor={T.sub}
                                value={client.mf} onChangeText={v => setField('mf', v)} />

                            <Text style={[st.label, { color: T.sub }]}>Adresse</Text>
                            <TextInput style={[st.input, st.textarea, { backgroundColor: T.searchBg, borderColor: T.border, color: T.text }]} placeholder="Adresse du client" placeholderTextColor={T.sub}
                                multiline textAlignVertical="top" value={client.adresse} onChangeText={v => setField('adresse', v)} />
                        </View>
                    )}

                    {step === 1 && (
                        <View style={[st.card, { backgroundColor: T.card }]}>
                            <Text style={[st.cardTitle, { color: T.text }]}>Produits</Text>
                            <View style={[st.divider, { backgroundColor: T.border }]} />

                            <Text style={[st.label, { color: T.sub }]}>Taux de taxe</Text>
                            <View style={st.taxRow}>
                                {[0, 19].map(t => (
                                    <TouchableOpacity
                                        key={t}
                                        style={[st.taxChip, { backgroundColor: T.searchBg, borderColor: T.border }, tauxTaxe === t && st.taxChipOn]}
                                        onPress={() => setTauxTaxe(t)}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={[st.taxChipTxt, { color: T.sub }, tauxTaxe === t && st.taxChipTxtOn]}>{t} %</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <View style={[st.divider, { backgroundColor: T.border }]} />

                            {items.map((it, idx) => (
                                <View key={it.key} style={[st.itemCard, { backgroundColor: T.searchBg, borderColor: T.border }]}>
                                    <View style={st.itemHeader}>
                                        <Text style={[st.itemIndex, { color: T.sub }]}>Ligne {idx + 1}</Text>
                                        {items.length > 1 && (
                                            <TouchableOpacity onPress={() => removeItem(it.key)} activeOpacity={0.7}>
                                                <Ionicons name="trash-outline" size={18} color="#DC2626" />
                                            </TouchableOpacity>
                                        )}
                                    </View>

                                    <TouchableOpacity style={[st.select, { backgroundColor: T.card, borderColor: T.border }]} onPress={() => openPicker(it.key)} activeOpacity={0.8}>
                                        <Text style={[st.selectTxt, { color: T.text }, !it.nom && st.selectPlaceholder]} numberOfLines={1}>
                                            {it.nom || 'Choisir un produit'}
                                        </Text>
                                        <Ionicons name="chevron-down" size={16} color={T.sub} />
                                    </TouchableOpacity>

                                    <View style={st.inlineRow}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[st.smallLabel, { color: T.sub }]}>Prix unitaire</Text>
                                            <View style={[st.priceDisplay, { backgroundColor: T.card, borderColor: T.border }]}>
                                                <Text style={[st.priceValue, { color: T.text }]}>
                                                    {it.prix_unitaire ? parseFloat(it.prix_unitaire).toFixed(3) : '0.000'} DT
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[st.smallLabel, { color: T.sub }]}>Quantité</Text>
                                            <View style={[st.qtyWrap, { backgroundColor: T.card, borderColor: T.border }]}>
                                                <TouchableOpacity
                                                    style={st.qtyBtn}
                                                    onPress={() => changeQty(it.key, -1)}
                                                    activeOpacity={0.8}
                                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                                >
                                                    <Text style={st.qtyBtnText}>−</Text>
                                                </TouchableOpacity>
                                                <Text style={[st.qtyValue, { color: T.text }]}>{it.quantite}</Text>
                                                <TouchableOpacity
                                                    style={st.qtyBtn}
                                                    onPress={() => changeQty(it.key, 1)}
                                                    activeOpacity={0.8}
                                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                                >
                                                    <Text style={st.qtyBtnText}>+</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    </View>

                                    <Text style={st.lineTotal}>
                                        Sous-total : {money((parseFloat(it.prix_unitaire) || 0) * (parseInt(it.quantite) || 0))} TND
                                    </Text>
                                </View>
                            ))}

                            <TouchableOpacity style={[st.addLineBtn, { backgroundColor: T.card }]} onPress={addItem} activeOpacity={0.8}>
                                <Ionicons name="add" size={18} color={TEAL} />
                                <Text style={st.addLineTxt}>Ajouter une ligne</Text>
                            </TouchableOpacity>

                            <View style={[st.divider, { backgroundColor: T.border }]} />
                            <View style={st.totalRow}>
                                <Text style={[st.totalLabel, { color: T.sub }]}>Total HT</Text>
                                <Text style={[st.totalValue, { color: T.text }]}>{money(totalHt)} TND</Text>
                            </View>
                            <View style={[st.totalRow, st.totalRowMain, { borderTopColor: T.border }]}>
                                <Text style={[st.totalLabelMain, { color: T.text }]}>Total TTC</Text>
                                <Text style={st.totalValueMain}>{money(totalTtc)} TND</Text>
                            </View>
                            <View style={st.totalRow}>
                                <Text style={[st.totalLabel, { color: T.sub }]}>Timbre fiscal</Text>
                                <Text style={[st.totalValue, { color: T.text }]}>{money(TIMBRE_FISCAL)} TND</Text>
                            </View>
                            <View style={[st.totalRow, st.totalRowMain, { borderTopColor: T.border }]}>
                                <Text style={[st.totalLabelMain, { color: T.text }]}>Total à payer</Text>
                                <Text style={st.totalValueMain}>{money(totalTtc + TIMBRE_FISCAL)} TND</Text>
                            </View>
                        </View>
                    )}

                    {step === 2 && (
                        <View style={[st.card, { backgroundColor: T.card }]}>
                            <Text style={[st.cardTitle, { color: T.text }]}>Confirmation</Text>
                            <View style={[st.divider, { backgroundColor: T.border }]} />

                            <Text style={[st.sectionLabel, { color: T.sub }]}>Facture</Text>
                            <View style={[st.infoBlock, { backgroundColor: T.searchBg }]}>
                                <Text style={[st.infoName, { color: T.text }]}>{client.num_facture}</Text>
                                <Text style={[st.infoLine, { color: T.sub }]}>Date : {client.date_facture}</Text>
                                <Text style={[st.infoLine, { color: T.sub }]}>Taux de taxe : {tauxTaxe} %</Text>
                            </View>

                            <View style={[st.divider, { backgroundColor: T.border }]} />
                            <Text style={[st.sectionLabel, { color: T.sub }]}>Client</Text>
                            <View style={[st.infoBlock, { backgroundColor: T.searchBg }]}>
                                <Text style={[st.infoName, { color: T.text }]}>{`${client.nom} ${client.prenom}`.trim()}</Text>
                                <Text style={[st.infoLine, { color: T.sub }]}>Tél : {client.tel}</Text>
                                {client.adresse ? <Text style={[st.infoLine, { color: T.sub }]}>{client.adresse}</Text> : null}
                                {client.mf ? <Text style={[st.infoLine, { color: T.sub }]}>Matricule fiscale : {client.mf}</Text> : null}
                            </View>

                            <View style={[st.divider, { backgroundColor: T.border }]} />
                            <Text style={[st.sectionLabel, { color: T.sub }]}>Produits</Text>
                            {items.filter(it => it.id_produit).map(it => (
                                <View key={it.key} style={[st.recapRow, { borderBottomColor: T.border }]}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[st.recapName, { color: T.text }]} numberOfLines={2}>{it.nom}</Text>
                                        <Text style={[st.recapSub, { color: T.sub }]}>{it.quantite} × {money(it.prix_unitaire)} TND</Text>
                                    </View>
                                    <Text style={[st.recapTotal, { color: T.text }]}>
                                        {money((parseFloat(it.prix_unitaire) || 0) * (parseInt(it.quantite) || 0))} TND
                                    </Text>
                                </View>
                            ))}

                            <View style={[st.divider, { backgroundColor: T.border }]} />
                            <View style={st.totalRow}>
                                <Text style={[st.totalLabel, { color: T.sub }]}>Total HT</Text>
                                <Text style={[st.totalValue, { color: T.text }]}>{money(totalHt)} TND</Text>
                            </View>
                            <View style={st.totalRow}>
                                <Text style={[st.totalLabel, { color: T.sub }]}>TVA ({tauxTaxe} %)</Text>
                                <Text style={[st.totalValue, { color: T.text }]}>{money(totalTtc - totalHt)} TND</Text>
                            </View>
                            <View style={[st.totalRow, st.totalRowMain, { borderTopColor: T.border }]}>
                                <Text style={[st.totalLabelMain, { color: T.text }]}>Total TTC</Text>
                                <Text style={st.totalValueMain}>{money(totalTtc)} TND</Text>
                            </View>
                            <View style={st.totalRow}>
                                <Text style={[st.totalLabel, { color: T.sub }]}>Timbre fiscal</Text>
                                <Text style={[st.totalValue, { color: T.text }]}>{money(TIMBRE_FISCAL)} TND</Text>
                            </View>
                            <View style={[st.totalRow, st.totalRowMain, { borderTopColor: T.border }]}>
                                <Text style={[st.totalLabelMain, { color: T.text }]}>Total à payer</Text>
                                <Text style={st.totalValueMain}>{money(totalTtc + TIMBRE_FISCAL)} TND</Text>
                            </View>
                        </View>
                    )}

                    <View style={st.btnRow}>
                        <TouchableOpacity style={[st.cancelBtn, { backgroundColor: T.searchBg }]} onPress={back} activeOpacity={0.85}>
                            <Text style={[st.cancelTxt, { color: T.sub }]}>{step === 0 ? 'Annuler' : 'Retour'}</Text>
                        </TouchableOpacity>
                        {step < 2 ? (
                            <TouchableOpacity style={st.saveBtn} onPress={next} activeOpacity={0.85}>
                                <Text style={st.saveTxt}>Suivant</Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity style={st.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
                                {saving ? <ActivityIndicator color="#fff" /> : <Text style={st.saveTxt}>Enregistrer</Text>}
                            </TouchableOpacity>
                        )}
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            <AppFooter darkMode={darkMode} />

            {pickerOpen && (
                <>
                    <Pressable style={st.overlay} onPress={() => setPickerOpen(false)} />
                    <View style={[st.sheet, { backgroundColor: T.card }]}>
                        <View style={[st.handle, { backgroundColor: T.border }]} />
                        <Text style={[st.sheetTitle, { color: T.text }]}>Choisir un produit</Text>
                        <TextInput
                            style={[st.input, { backgroundColor: T.searchBg, borderColor: T.border, color: T.text }]}
                            placeholder="Rechercher..."
                            placeholderTextColor={T.sub}
                            value={search}
                            onChangeText={setSearch}
                        />
                        <ScrollView style={{ maxHeight: 340 }} keyboardShouldPersistTaps="handled">
                            {filtered.length === 0 ? (
                                <View style={st.emptyWrap}>
                                    <Text style={[st.emptyText, { color: T.sub }]}>Aucun produit</Text>
                                </View>
                            ) : filtered.map(p => (
                                <TouchableOpacity key={p.id} style={[st.pickRow, { borderBottomColor: T.border }]} onPress={() => choose(p)} activeOpacity={0.7}>
                                    <Text style={[st.pickName, { color: T.text }]} numberOfLines={1}>{p.nom}</Text>
                                    {p.prix ? <Text style={st.pickPrice}>{money(p.prix)} TND</Text> : null}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        <TouchableOpacity style={[st.cancelBtn, { backgroundColor: T.searchBg, marginVertical: 16 }]} onPress={() => setPickerOpen(false)} activeOpacity={0.85}>
                            <Text style={[st.cancelTxt, { color: T.sub }]}>Fermer</Text>
                        </TouchableOpacity>
                    </View>
                </>
            )}
        </SafeAreaView>
    );
}

const st = StyleSheet.create({
    safe:              { flex: 1, backgroundColor: BG },
    center:            { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG },
    scroll:            { flex: 1 },
    scrollContent:     { padding: 16, paddingBottom: 40 },
    breadcrumbRow:     { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
    breadcrumbBack:    { fontSize: 12, color: '#94a3b8' },
    breadcrumbCurrent: { fontSize: 12, color: TEAL, fontWeight: '600' },
    pageTitle:         { fontSize: 22, fontWeight: '800', color: '#1a2940', marginBottom: 16 },
    commandeNotice:    { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#E0F2FE', borderRadius: 10, padding: 10, marginBottom: 16 },
    commandeNoticeTxt: { flex: 1, fontSize: 12, fontWeight: '600', color: '#0369A1' },

    stepper:           { flexDirection: 'row', marginBottom: 16, paddingHorizontal: 4 },
    stepWrap:          { flex: 1, alignItems: 'center' },
    stepDot:           { width: 30, height: 30, borderRadius: 15, backgroundColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center' },
    stepDotOn:         { backgroundColor: TEAL },
    stepNum:           { fontSize: 13, fontWeight: '800', color: '#94a3b8' },
    stepNumOn:         { color: '#fff' },
    stepLabel:         { fontSize: 11, color: '#94a3b8', marginTop: 5, fontWeight: '600' },
    stepLabelOn:       { color: TEAL, fontWeight: '800' },
    stepBar:           { position: 'absolute', top: 15, left: '60%', right: '-40%', height: 2, backgroundColor: '#e2e8f0' },
    stepBarOn:         { backgroundColor: TEAL },

    card:              { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
    cardTitle:         { fontSize: 15, fontWeight: '800', color: '#1a2940' },
    divider:           { height: 1, backgroundColor: '#f1f5f9', marginVertical: 14 },
    label:             { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 },
    smallLabel:        { fontSize: 11, fontWeight: '600', color: '#64748b', marginBottom: 6 },
    req:               { color: '#e53e3e' },
    input:             { backgroundColor: '#f8fafc', borderRadius: 12, height: 48, paddingHorizontal: 14, fontSize: 14, color: '#1a2940', borderWidth: 1.5, borderColor: '#e2e8f0', marginBottom: 14 },
    inputSmall:        { backgroundColor: '#f8fafc', borderRadius: 10, height: 44, paddingHorizontal: 12, fontSize: 13, color: '#1a2940', borderWidth: 1.5, borderColor: '#e2e8f0' },
    textarea:          { height: 90, paddingTop: 14 },

    priceDisplay:      { height: 44, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
    priceValue:        { fontSize: 13, fontWeight: '700' },

    qtyWrap:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 44, paddingHorizontal: 8, borderRadius: 10, borderWidth: 1.5 },
    qtyBtn:            { width: 28, height: 28, borderRadius: 14, backgroundColor: TEAL, justifyContent: 'center', alignItems: 'center' },
    qtyBtnText:        { color: '#fff', fontSize: 18, fontWeight: '700', lineHeight: 22 },
    qtyValue:          { fontSize: 15, fontWeight: '800', minWidth: 24, textAlign: 'center' },

    taxRow:            { flexDirection: 'row', gap: 10 },
    taxChip:           { flex: 1, height: 46, borderRadius: 12, borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' },
    taxChipOn:         { backgroundColor: TEAL, borderColor: TEAL },
    taxChipTxt:        { fontSize: 14, fontWeight: '700', color: '#64748b' },
    taxChipTxtOn:      { color: '#fff' },

    itemCard:          { backgroundColor: '#f8fafc', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#e8eef4' },
    itemHeader:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    itemIndex:         { fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.4 },
    select:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 10, height: 46, paddingHorizontal: 12, borderWidth: 1.5, borderColor: '#e2e8f0', marginBottom: 12 },
    selectTxt:         { fontSize: 13, color: '#1a2940', fontWeight: '600', flex: 1 },
    selectPlaceholder: { color: '#b0bcc8', fontWeight: '400' },
    inlineRow:         { flexDirection: 'row', gap: 10 },
    lineTotal:         { fontSize: 12, color: TEAL, fontWeight: '700', marginTop: 10, textAlign: 'right' },

    addLineBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 46, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: TEAL, backgroundColor: '#fff' },
    addLineTxt:        { fontSize: 13, fontWeight: '700', color: TEAL },

    sectionLabel:      { fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 },
    infoBlock:         { backgroundColor: '#f8fafc', borderRadius: 12, padding: 14, gap: 3 },
    infoName:          { fontSize: 14, fontWeight: '700', color: '#1a2940' },
    infoLine:          { fontSize: 12, color: '#64748b' },
    recapRow:          { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 10 },
    recapName:         { fontSize: 13, color: '#1a2940', fontWeight: '600' },
    recapSub:          { fontSize: 11, color: '#94a3b8', marginTop: 2 },
    recapTotal:        { fontSize: 13, color: '#1a2940', fontWeight: '700' },

    totalRow:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 },
    totalLabel:        { fontSize: 13, color: '#64748b' },
    totalValue:        { fontSize: 13, color: '#1a2940', fontWeight: '600' },
    totalRowMain:      { marginTop: 6, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#e8eef4' },
    totalLabelMain:    { fontSize: 15, color: '#1a2940', fontWeight: '800' },
    totalValueMain:    { fontSize: 16, color: TEAL, fontWeight: '800' },

    btnRow:            { flexDirection: 'row', gap: 12, marginTop: 16 },
    saveBtn:           { flex: 1, backgroundColor: TEAL, borderRadius: 30, height: 50, justifyContent: 'center', alignItems: 'center' },
    saveTxt:           { color: '#fff', fontWeight: '700', fontSize: 15 },
    cancelBtn:         { flex: 1, backgroundColor: '#f1f5f9', borderRadius: 30, height: 50, justifyContent: 'center', alignItems: 'center' },
    cancelTxt:         { color: '#475569', fontWeight: '600', fontSize: 15 },

    overlay:           { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 20 },
    sheet:             { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%', zIndex: 21, paddingHorizontal: 20 },
    handle:            { width: 40, height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 16 },
    sheetTitle:        { fontSize: 20, fontWeight: '800', color: '#1a2940', marginBottom: 16 },
    pickRow:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 10 },
    pickName:          { fontSize: 14, color: '#1a2940', fontWeight: '600', flex: 1 },
    pickPrice:         { fontSize: 12, color: TEAL, fontWeight: '700' },
    emptyWrap:         { padding: 30, alignItems: 'center' },
    emptyText:         { fontSize: 14, color: '#94a3b8' },
});
