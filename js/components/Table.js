import { formatPrice, formatPercentage } from '../utils/formatters.js';

export class Table {
    constructor(container) {
        this.container = container;
    }

    render(data, suppliers) {
        if (!data || !suppliers || !this.container) return;

        const groupedData = this._groupData(data);
        const table = document.createElement('table');
        
        table.appendChild(this._createHeader(data));
        table.appendChild(this._createBody(groupedData, data));
        
        this.container.innerHTML = '';
        this.container.appendChild(table);
    }

    _createHeader(data) {
        const thead = document.createElement('thead');
        const headerRow1 = document.createElement('tr');
        const headerRow2 = document.createElement('tr');
        
        ['Article', 'Série', 'Granit'].forEach(text => {
            const th = document.createElement('th');
            th.textContent = text;
            th.className = 'sticky-col';
            th.rowSpan = 2;
            headerRow1.appendChild(th);
        });

        const suppliers = [...new Set(data.map(row => row.displayFournisseur))].sort();
        
        suppliers.forEach(supplier => {
            const th = document.createElement('th');
            th.textContent = supplier;
            th.colSpan = 2;
            th.className = 'supplier-header';
            headerRow1.appendChild(th);

            const thPrix = document.createElement('th');
            thPrix.textContent = 'Prix';
            headerRow2.appendChild(thPrix);

            const thEcart = document.createElement('th');
            thEcart.textContent = 'Écart (%)';
            headerRow2.appendChild(thEcart);
        });

        const thEcart = document.createElement('th');
        thEcart.textContent = 'Écart Max (%)';
        thEcart.rowSpan = 2;
        headerRow1.appendChild(thEcart);

        thead.appendChild(headerRow1);
        thead.appendChild(headerRow2);
        return thead;
    }

    _createBody(groupedData, data) {
        const tbody = document.createElement('tbody');
        const suppliers = [...new Set(data.map(row => row.displayFournisseur))].sort();

        if (groupedData.length === 0) {
            const row = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = 3 + suppliers.length * 2 + 1;
            td.textContent = 'Aucune donnée disponible';
            td.className = 'no-data';
            row.appendChild(td);
            tbody.appendChild(row);
            return tbody;
        }

        groupedData.forEach(group => {
            const row = document.createElement('tr');
            
            ['article', 'serie', 'granit'].forEach(key => {
                const td = document.createElement('td');
                td.textContent = group[key] || '-';
                td.className = 'sticky-col';
                row.appendChild(td);
            });

            const prices = suppliers
                .map(s => group.prices[s]?.price)
                .filter(p => p > 0);
            
            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);

            suppliers.forEach(supplier => {
                const priceData = group.prices[supplier];
                const price = priceData?.price;

                const tdPrice = document.createElement('td');
                const tdEcart = document.createElement('td');

                if (price) {
                    const isMin = price === minPrice;
                    const isMax = price === maxPrice;
                    const className = isMin ? 'best-price' : isMax ? 'worst-price' : '';
                    const variation = ((price - minPrice) / minPrice * 100);

                    tdPrice.textContent = formatPrice(price);
                    tdEcart.textContent = formatPercentage(variation);
                    tdPrice.className = className;
                    tdEcart.className = className;
                } else {
                    tdPrice.textContent = '-';
                    tdEcart.textContent = '-';
                }

                row.appendChild(tdPrice);
                row.appendChild(tdEcart);
            });

            const tdMaxEcart = document.createElement('td');
            if (prices.length > 1) {
                const maxVariation = ((maxPrice - minPrice) / minPrice * 100);
                tdMaxEcart.textContent = formatPercentage(maxVariation);
            } else {
                tdMaxEcart.textContent = '-';
            }
            row.appendChild(tdMaxEcart);

            tbody.appendChild(row);
        });

        return tbody;
    }

    _groupData(data) {
        const groups = new Map();
        
        data.forEach(row => {
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