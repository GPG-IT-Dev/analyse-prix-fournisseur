export class DataService {
    constructor() {
        this.rawData = [];
        this.filteredData = [];
        this.filterByReference = false;
        this.isAnonymized = false;
        this.referenceSupplier = null;
        this.anonymousMap = new Map();
    }

    setData(data) {
        this.rawData = data;
        this.filteredData = [...data];
    }

    getSuppliers() {
        return [...new Set(this.rawData.map(row => row.fournisseur))].sort();
    }

    getDateRange() {
        const dates = this.rawData.map(row => row.date);
        return {
            min: new Date(Math.min(...dates)),
            max: new Date(Math.max(...dates))
        };
    }

    getData(filters = {}) {
        let data = [...this.rawData];

        if (filters.dateRange) {
            data = data.filter(row => 
                row.date >= filters.dateRange.min && 
                row.date <= filters.dateRange.max
            );
        }

        if (filters.suppliers?.length) {
            data = data.filter(row => filters.suppliers.includes(row.fournisseur));
        }

        if (filters.search) {
            const search = filters.search.toLowerCase();
            data = data.filter(row =>
                row.article.toLowerCase().includes(search) ||
                row.serie.toLowerCase().includes(search) ||
                row.granit.toLowerCase().includes(search)
            );
        }

        if (this.filterByReference && this.referenceSupplier) {
            const referenceProducts = new Set(
                data
                    .filter(row => row.fournisseur === this.referenceSupplier)
                    .map(row => `${row.article}-${row.serie}-${row.granit}`)
            );
            data = data.filter(row =>
                referenceProducts.has(`${row.article}-${row.serie}-${row.granit}`)
            );
        }

        if (this.isAnonymized && this.referenceSupplier) {
            const suppliers = [...new Set(data.map(row => row.fournisseur))];
            let counter = 1;
            this.anonymousMap.clear();
            
            suppliers.forEach(supplier => {
                if (supplier !== this.referenceSupplier) {
                    this.anonymousMap.set(supplier, `Fournisseur ${counter++}`);
                }
            });
        }

        this.filteredData = data.map(row => ({
            ...row,
            displayFournisseur: this.isAnonymized && row.fournisseur !== this.referenceSupplier ? 
                this.anonymousMap.get(row.fournisseur) : 
                row.fournisseur
        }));

        return this.filteredData;
    }

    toggleReferenceFilter(supplier) {
        if (supplier) {
            this.referenceSupplier = supplier;
            this.filterByReference = !this.filterByReference;
        }
    }

    toggleAnonymization(supplier) {
        if (supplier) {
            this.referenceSupplier = supplier;
            this.isAnonymized = !this.isAnonymized;
        }
    }

    prepareExportData() {
        const groupedData = this._groupDataForExport();
        const suppliers = [...new Set(this.filteredData.map(row => row.displayFournisseur))].sort();
        
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.aoa_to_sheet([
            // En-têtes
            [
                'Article', 'Série', 'Granit',
                ...suppliers.flatMap(s => [`${s} - Prix`, `${s} - Écart (%)`])
            ]
        ]);

        // Données
        const rows = groupedData.map(group => {
            const row = [group.article, group.serie, group.granit];
            const prices = suppliers.map(supplier => group.prices[supplier]?.price || null);
            const validPrices = prices.filter(p => p !== null);
            const minPrice = Math.min(...validPrices);

            suppliers.forEach(supplier => {
                const price = group.prices[supplier]?.price;
                if (price !== null && price !== undefined) {
                    const variation = ((price - minPrice) / minPrice * 100).toFixed(2);
                    row.push(price.toFixed(2), variation);
                } else {
                    row.push('-', '-');
                }
            });

            return row;
        });

        // Ajout des données au worksheet
        XLSX.utils.sheet_add_aoa(worksheet, rows, { origin: 'A2' });

        // Styles
        const range = XLSX.utils.decode_range(worksheet['!ref']);
        worksheet['!cols'] = Array(range.e.c + 1).fill({ wch: 15 });

        // Ajout de la feuille au workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Analyse prix');

        return workbook;
    }

    _groupDataForExport() {
        const groups = new Map();
        
        this.filteredData.forEach(row => {
            const key = `${row.article}-${row.serie}-${row.granit}`;
            if (!groups.has(key)) {
                groups.set(key, {
                    article: row.article,
                    serie: row.serie,
                    granit: row.granit,
                    prices: {}
                });
            }
            
            const group = groups.get(key);
            if (!group.prices[row.displayFournisseur] || 
                row.date > group.prices[row.displayFournisseur].date) {
                group.prices[row.displayFournisseur] = {
                    price: row.prix,
                    date: row.date
                };
            }
        });

        return Array.from(groups.values());
    }
}