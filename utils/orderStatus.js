/**
 * Configuration centralisée des statuts de commande.
 * Utilisée par commandes/detail.jsx, commandes/commande-detail.jsx, dashboard.jsx
 */

export const ORDER_STATUS = {
    0: { label: 'En attente', color: '#D97706', bg: '#FEF3C7', icon: 'time-outline' },
    1: { label: 'Confirmée', color: '#2563EB', bg: '#DBEAFE', icon: 'checkmark-circle-outline' },
    2: { label: 'Dispatchée', color: '#7C3AED', bg: '#EDE9FE', icon: 'car-outline' },
    5: { label: 'Livrée', color: '#059669', bg: '#D1FAE5', icon: 'bag-check-outline' },
    7: { label: 'Annulée', color: '#DC2626', bg: '#FEE2E2', icon: 'close-circle-outline' },
};

export function getStatusLabel(etat) {
    return ORDER_STATUS[etat]?.label ?? 'Inconnu';
}

export function getStatusColor(etat) {
    return ORDER_STATUS[etat]?.color ?? '#94A3B8';
}
