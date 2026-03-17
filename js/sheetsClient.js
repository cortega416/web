// Cliente para Google Sheets vía Google Apps Script
class SheetsClient {
    constructor() {
        this.apiUrl = CONFIG.APPS_SCRIPT_URL;
    }

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
                    'Content-Type': 'text/plain'
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

    async readSheet(sheetName, range = null) {
        try {
            const cacheKey = `sheet_${sheetName}`;
            const cached = cacheManager.get(cacheKey);
            
            if (cached) {
                console.log(`📦 Datos de ${sheetName} desde caché`);
                return cached;
            }

            console.log(`📥 Cargando ${sheetName} desde Google Sheets...`);
            const values = await this.makeRequest('readSheet', { 
                sheetName, 
                range 
            });
            
            if (values) {
                cacheManager.set(cacheKey, values);
            }
            
            return values || [];
        } catch (error) {
            console.error(`Error leyendo ${sheetName}:`, error);
            throw error;
        }
    }

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

    async appendRows(sheetName, rows) {
        try {
            const result = await this.makeRequest('appendRows', { 
                sheetName, 
                rows 
            });
            
            cacheManager.clear(`sheet_${sheetName}`);
            console.log(`✅ Filas agregadas a ${sheetName}`);
            
            return result;
        } catch (error) {
            console.error(`Error agregando filas a ${sheetName}:`, error);
            throw error;
        }
    }

    async updateRange(sheetName, range, values) {
        try {
            const result = await this.makeRequest('updateRange', { 
                sheetName, 
                range, 
                values 
            });
            
            cacheManager.clear(`sheet_${sheetName}`);
            
            return result;
        } catch (error) {
            console.error(`Error actualizando ${sheetName}:`, error);
            throw error;
        }
    }

    async updateById(sheetName, id, updates) {
        try {
            const result = await this.makeRequest('updateById', { 
                sheetName, 
                id, 
                updates 
            });
            
            cacheManager.clear(`sheet_${sheetName}`);
            console.log(`✅ ${sheetName} actualizado (ID: ${id})`);
            
            return result;
        } catch (error) {
            console.error(`Error actualizando por ID en ${sheetName}:`, error);
            throw error;
        }
    }

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

const sheetsClient = new SheetsClient();