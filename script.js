import { DataService } from './services/DataService.js';
import { Table } from './components/Table.js';
import { showError, showLoading, updateLoadingProgress } from './utils/ui.js';
import { validateExcelFile } from './utils/validators.js';
import { parseExcelData } from './utils/parsers.js';

class App {
    constructor() {
        this.dataService = new DataService();
        this.initializeComponents();
        this.setupEventListeners();
    }

    initializeComponents() {
        this.table = new Table(document.getElementById('priceTable'));
    }

    setupEventListeners() {
        const fileInput = document.getElementById('fileInput');
        const uploadSection = document.querySelector('.upload-section');

        if (fileInput && uploadSection) {
            fileInput.addEventListener('change', e => this.handleFileUpload(e));
            
            uploadSection.addEventListener('dragover', e => {
                e.preventDefault();
                uploadSection.classList.add('drag-over');
            });

            uploadSection.addEventListener('dragleave', () => {
                uploadSection.classList.remove('drag-over');
            });

            uploadSection.addEventListener('drop', e => {
                e.preventDefault();
                uploadSection.classList.remove('drag-over');
                if (e.dataTransfer.files[0]) {
                    fileInput.files = e.dataTransfer.files;
                    this.handleFileUpload({ target: fileInput });
                }
            });
        }

        ['filterReferenceBtn', 'anonymizeBtn', 'exportBtn'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.addEventListener('click', () => {
                    switch(id) {
                        case 'filterReferenceBtn': this.toggleReferenceFilter(); break;
                        case 'anonymizeBtn': this.toggleAnonymization(); break;
                        case 'exportBtn': this.exportData(); break;
                    }
                });
            }
        });

        ['searchInput', 'supplierSelect', 'referenceSupplier'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => this.updateDisplay());
                if (element.tagName === 'INPUT') {
                    element.addEventListener('input', () => this.updateDisplay());
                }
            }
        });
    }

    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const error = validateExcelFile(file);
            if (error) throw new Error(error);

            showLoading(true);
            updateLoadingProgress(0, 'Lecture du fichier...');

            const buffer = await file.arrayBuffer();
            updateLoadingProgress(30, 'Analyse des données...');
            
            const workbook = XLSX.read(buffer, { type: 'array' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const rawData = XLSX.utils.sheet_to_json(worksheet);
            
            updateLoadingProgress(60, 'Traitement des données...');
            const data = parseExcelData(rawData);
            
            if (!data.length) {
                throw new Error('Aucune donnée valide trouvée dans le fichier');
            }

            updateLoadingProgress(90, 'Finalisation...');
            this.dataService.setData(data);
            this.updateSupplierLists();
            this.initializeDateSlider();
            
            document.getElementById('filters').style.display = 'block';
            this.updateDisplay();
            
            updateLoadingProgress(100, 'Terminé !');
            setTimeout(() => showLoading(false), 500);

        } catch (error) {
            showError(error.message);
            if (event.target) event.target.value = '';
        }
    }

    updateSupplierLists() {
        const suppliers = this.dataService.getSuppliers();
        
        ['supplierSelect', 'referenceSupplier'].forEach(id => {
            const select = document.getElementById(id);
            if (!select) return;

            select.innerHTML = id === 'referenceSupplier' ? 
                '<option value="">Sélectionnez un fournisseur</option>' : '';

            suppliers.forEach(supplier => {
                const option = new Option(supplier, supplier);
                select.add(option);
                
                if (id === 'supplierSelect') {
                    option.selected = true;
                }
            });
        });
    }

    initializeDateSlider() {
        const dateSliderContainer = document.getElementById('dateSlider');
        if (!dateSliderContainer) return;

        const { min, max } = this.dataService.getDateRange();
        
        if (this.dateSlider) {
            this.dateSlider.destroy();
        }

        this.dateSlider = noUiSlider.create(dateSliderContainer, {
            start: [min, max],
            connect: true,
            range: {
                'min': min.getTime(),
                'max': max.getTime()
            },
            step: 86400000, // 1 jour en millisecondes
            format: {
                to: value => new Date(value),
                from: value => new Date(value).getTime()
            }
        });

        const dateStart = document.getElementById('dateStart');
        const dateEnd = document.getElementById('dateEnd');
        
        if (dateStart && dateEnd) {
            this.dateSlider.on('update', (values) => {
                dateStart.textContent = values[0].toLocaleDateString();
                dateEnd.textContent = values[1].toLocaleDateString();
            });
        }

        this.dateSlider.on('change', () => this.updateDisplay());
    }

    updateDisplay() {
        const filters = {
            suppliers: Array.from(document.getElementById('supplierSelect')?.selectedOptions || [])
                .map(option => option.value),
            search: document.getElementById('searchInput')?.value || '',
            dateRange: this.dateSlider ? {
                min: this.dateSlider.get()[0],
                max: this.dateSlider.get()[1]
            } : null
        };

        const data = this.dataService.getData(filters);
        this.table.render(data, filters.suppliers);
    }

    toggleReferenceFilter() {
        const referenceSelect = document.getElementById('referenceSupplier');
        if (!referenceSelect?.value) {
            showError('Veuillez sélectionner un fournisseur de référence');
            return;
        }

        this.dataService.toggleReferenceFilter(referenceSelect.value);
        document.getElementById('filterReferenceBtn')?.classList.toggle('active');
        this.updateDisplay();
    }

    toggleAnonymization() {
        const referenceSelect = document.getElementById('referenceSupplier');
        if (!referenceSelect?.value) {
            showError('Veuillez sélectionner un fournisseur de référence');
            return;
        }

        this.dataService.toggleAnonymization(referenceSelect.value);
        document.getElementById('anonymizeBtn')?.classList.toggle('active');
        this.updateDisplay();
    }

    async exportData() {
        try {
            showLoading(true);
            
            const filters = {
                suppliers: Array.from(document.getElementById('supplierSelect')?.selectedOptions || [])
                    .map(option => option.value),
                dateRange: this.dateSlider ? {
                    min: this.dateSlider.get()[0],
                    max: this.dateSlider.get()[1]
                } : null,
                search: document.getElementById('searchInput')?.value || ''
            };

            const data = this.dataService.getExportData(filters);
            
            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Analyse prix");
            XLSX.writeFile(wb, "analyse_prix_fournisseurs.xlsx");
        } catch (error) {
            showError("Erreur lors de l'export");
            console.error(error);
        } finally {
            showLoading(false);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => new App());