export class DataService {
    constructor() {
        this.data = [];
        this.filterByReference = false;
        this.isAnonymized = false;
        this.referenceSupplier = null;
        this.anonymousMap = new Map();
        this.dateRange = { min: null, max: null };
    }

    setData(data) {
        this.data = data;
        this.updateDateRange();
    }

    getSuppliers() {
        return [...new Set(this.data.map(row => row.fournisseur))].sort();
    }

    getDateRange() {
        return this.dateRange;
    }

    updateDateRange() {
        const dates = this.data.map(row => row.date);
        this.dateRange.min = new Date(Math.min(...dates));
        this.dateRange.max = new Date(Math.max(...dates));
    }

    getData(filters = {}) {
        let filteredData = [...this.data];

        // Filtre par date
        if (filters.dateRange) {
            filteredData = filteredData.filter(row => 
                row.date >= filters.dateRange.min && 
                row.date <= filters.dateRange.max
            );
        }

        // Filtre par fournisseurs sélectionnés
        if (filters.suppliers?.length) {
            filteredData = filteredData.filter(row => 
                filters.suppliers.includes(row.fournisseur)
            );
        }

        // Filtre par recherche
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            filteredData = filteredData.filter(row =>
                row.article.toLowerCase().includes(searchLower) ||
                row.serie.toLowerCase().includes(searchLower) ||
                row.granit.toLowerCase().includes(searchLower)
            );
        }

        // Filtre par référence
        if (this.filterByReference && this.referenceSupplier) {
            const referenceProducts = new Set(
                filteredData
                    .filter(row => row.fournisseur === this.referenceSupplier)
                    .map(row => `${row.article}-${row.serie}-${row.granit}`)
            );

            filteredData = filteredData.filter(row =>
                referenceProducts.has(`${row.article}-${row.serie}-${row.granit}`)
            );
        }

        // Anonymisation des fournisseurs
        if (this.isAnonymized) {
            const suppliers = [...new Set(filteredData.map(row => row.fournisseur))];
            this.anonymousMap.clear();
            suppliers.forEach((supplier, index) => {
                if (supplier !== this.referenceSupplier) {
                    this.anonymousMap.set(supplier, `Fournisseur ${index + 1}`);
                }
            });
        }

        return filteredData.map(row => ({
            ...row,
            displayFournisseur: this.isAnonymized && row.fournisseur !== this.referenceSupplier ? 
                this.anonymousMap.get(row.fournisseur) : 
                row.fournisseur
        }));
    }

    toggleReferenceFilter(supplier) {
        this.referenceSupplier = supplier;
        this.filterByReference = !this.filterByReference;
    }

    toggleAnonymization(supplier) {
        this.referenceSupplier = supplier;
        this.isAnonymized = !this.isAnonymized;
    }

    getExportData(filters) {
        const data = this.getData(filters);
        const groupedData = this._groupDataForExport(data);
        return this._formatDataForExport(groupedData);
    }

    _groupDataForExport(data) {
        const groups = new Map();
        
        data.forEach(row => {
            const key = `${row.article}-${row.serie}-${row.granit}`;
            if (!groups.has(key)) {
                groups.set(key, {
                    Article: row.article,
                    Série: row.serie,
                    Granit: row.granit,
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

    _formatDataForExport(groupedData) {
        const suppliers = [...new Set(
            this.data.map(row => 
                this.isAnonymized && row.fournisseur !== this.referenceSupplier ? 
                    this.anonymousMap.get(row.fournisseur) : 
                    row.fournisseur
            )
        )].sort();

        return groupedData.map(group => {
            const row = {
                Article: group.Article,
                Série: group.Série,
                Granit: group.Granit
            };

            suppliers.forEach(supplier => {
                if (group.prices[supplier]) {
                    row[`${supplier} - Prix`] = group.prices[supplier].price;
                    row[`${supplier} - Écart (%)`] = this._calculateVariation(
                        group.prices[supplier].price,
                        Object.values(group.prices).map(p => p.price)
                    );
                } else {
                    row[`${supplier} - Prix`] = '';
                    row[`${supplier} - Écart (%)`] = '';
                }
            });

            return row;
        });
    }

    _calculateVariation(price, allPrices) {
        const validPrices = allPrices.filter(p => p > 0);
        if (validPrices.length < 2) return 0;
        
        const minPrice = Math.min(...validPrices);
        return ((price - minPrice) / minPrice * 100).toFixed(2);
    }
}