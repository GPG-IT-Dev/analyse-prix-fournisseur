import { CONFIG } from '../config.js';

export function validateExcelFile(file) {
  if (!file) {
    return 'Aucun fichier sélectionné';
  }

  if (!CONFIG.VALID_MIME_TYPES.includes(file.type) && 
      !file.name.match(/\.(xlsx|xls)$/i)) {
    return 'Format de fichier invalide. Veuillez sélectionner un fichier Excel (.xlsx, .xls)';
  }

  if (file.size === 0) {
    return 'Le fichier est vide';
  }

  if (file.size > CONFIG.MAX_FILE_SIZE) {
    return `Le fichier est trop volumineux (limite: ${CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB)`;
  }

  return null;
}

export function validateExcelData(firstRow) {
  const missingColumns = CONFIG.REQUIRED_COLUMNS.filter(col => !(col in firstRow));
  
  if (missingColumns.length) {
    throw new Error(`Colonnes manquantes: ${missingColumns.join(', ')}`);
  }
}