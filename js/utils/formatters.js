export function formatPrice(price) {
    if (typeof price !== 'number' || isNaN(price)) return '-';
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR'
    }).format(price);
}

export function formatPercentage(value) {
    if (typeof value !== 'number' || isNaN(value)) return '-';
    return `${value.toFixed(2)}%`;
}