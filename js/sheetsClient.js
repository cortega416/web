// Cliente para interactuar con Google Sheets vía Google Apps Script
class SheetsClient {
    constructor() {
        // URL del Web App de Google Apps Script (configurar después del deploy)
        this.apiUrl = CONFIG.APPS_SCRIPT_URL;
    }

    // Hacer petición al Apps Script
    async makeRequest(action, params) {
        const requestData = {
            action: action,
            ...params
        };
        
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                mode: 'cors',
                headers: {
                    'Content-Type': 'text/plain' // Apps Script requiere text/plain
                },
                body: JSON.stringify(requestData)
            });
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.data || 'Error en la operación');
            }
            
            return result.data;
        } catch (error) {
            console.error('Error en petición:', error);
            throw error;
        }
    }

    // Leer datos de una hoja
    async readSheet(sheetName, range = null) {
        try {
            const values = await this.makeRequest('readSheet', { 
                sheetName, 
                range 
            });
            return values || [];
        } catch (error) {
            console.error(`Error leyendo ${sheetName}:`, error);
            throw error;
        }
    }

    // Convertir array de valores a objetos
    parseSheetData(values) {
        if (!values || values.length === 0) return [];
        
        const headers = values[0];
        const rows = values.slice(1);
        
        return rows.map(row => {
            const obj = {};
            headers.forEach((header, index) => {
                obj[header] = row[index] !== undefined ? row[index] : '';
            });
            return obj;
        });
    }

    // Agregar filas a una hoja
    async appendRows(sheetName, rows) {
        try {
            const result = await this.makeRequest('appendRows', { 
                sheetName, 
                rows 
            });
            return result;
        } catch (error) {
            console.error(`Error agregando filas a ${sheetName}:`, error);
            throw error;
        }
    }

    // Actualizar rango específico
    async updateRange(sheetName, range, values) {
        try {
            const result = await this.makeRequest('updateRange', { 
                sheetName, 
                range, 
                values 
            });
            return result;
        } catch (error) {
            console.error(`Error actualizando ${sheetName}:`, error);
            throw error;
        }
    }

    // Encontrar fila por ID y actualizar
    async updateById(sheetName, id, updates) {
        try {
            const result = await this.makeRequest('updateById', { 
                sheetName, 
                id, 
                updates 
            });
            return result;
        } catch (error) {
            console.error(`Error actualizando por ID en ${sheetName}:`, error);
            throw error;
        }
    }

    // Generar nuevo ID
    async getNextId(sheetName) {
        try {
            const nextId = await this.makeRequest('getNextId', { 
                sheetName 
            });
            return nextId;
        } catch (error) {
            console.error(`Error obteniendo siguiente ID de ${sheetName}:`, error);
            throw error;
        }
    }

    // Obtener letra de columna (A, B, C... Z, AA, AB...)
    getColumnLetter(columnNumber) {
        let letter = '';
        while (columnNumber > 0) {
            const remainder = (columnNumber - 1) % 26;
            letter = String.fromCharCode(65 + remainder) + letter;
            columnNumber = Math.floor((columnNumber - 1) / 26);
        }
        return letter;
    }
}

// Instancia global
const sheetsClient = new SheetsClient();