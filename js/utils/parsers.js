export function parseExcelData(rawData) {
    if (!Array.isArray(rawData) || rawData.length === 0) {
        throw new Error('Données invalides');
    }

    return rawData
        .map((row, index) => {
            try {
                // Vérification des colonnes requises
                if (!row.Article || !row.Série || !row.Granit || 
                    !row.Fournisseur || !row.Prix || !row['Date demande']) {
                    console.warn(`Ligne ${index + 2}: Données manquantes`);
                    return null;
                }

                // Conversion du prix
                const price = typeof row.Prix === 'number' ? 
                    row.Prix : 
                    parseFloat(String(row.Prix).replace(',', '.'));

                if (isNaN(price)) {
                    console.warn(`Ligne ${index + 2}: Prix invalide: ${row.Prix}`);
                    return null;
                }

                // Conversion de la date
                const date = parseDate(row['Date demande']);
                if (!date) {
                    console.warn(`Ligne ${index + 2}: Date invalide: ${row['Date demande']}`);
                    return null;
                }

                return {
                    article: String(row.Article).trim(),
                    serie: String(row.Série).trim(),
                    granit: String(row.Granit).trim(),
                    fournisseur: String(row.Fournisseur).trim(),
                    prix: price,
                    date: date
                };
            } catch (error) {
                console.warn(`Erreur ligne ${index + 2}:`, error);
                return null;
            }
        })
        .filter(row => row !== null);
}

function parseDate(dateStr) {
    if (!dateStr) return null;

    // Si la date est un nombre (format Excel)
    if (typeof dateStr === 'number') {
        const date = new Date((dateStr - 25569) * 86400 * 1000);
        return isNaN(date.getTime()) ? null : date;
    }

    // Nettoyage de la chaîne de date
    const cleanDateStr = String(dateStr).replace(/\s+/g, ' ').trim();
    
    // Format DD/MM/YYYY HH:mm:ss
    const [datePart, timePart] = cleanDateStr.split(' ');
    if (datePart) {
        const [day, month, year] = datePart.split('/').map(Number);
        const [hours = 0, minutes = 0, seconds = 0] = timePart ? 
            timePart.split(':').map(Number) : 
            [0, 0, 0];
        
        const date = new Date(year, month - 1, day, hours, minutes, seconds);
        if (!isNaN(date.getTime())) {
            return date;
        }
    }

    // Tentative de parse ISO
    const isoDate = new Date(cleanDateStr);
    return !isNaN(isoDate.getTime()) ? isoDate : null;
}