export const CONFIG = {
  VALID_MIME_TYPES: [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ],
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  REQUIRED_COLUMNS: ['Article', 'Série', 'Granit', 'Fournisseur', 'Prix', 'Date demande']
};