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
        
        const headers = Array.isArray(values[0])
            ? values[0].map(header => String(header || '').trim())
            : [];
        if (headers.length === 0) return [];
        
        const rows = values.slice(1);
        
        return rows
            .filter(row => Array.isArray(row) && row.some(cell => cell !== undefined && cell !== null && String(cell).trim() !== ''))
            .map(row => {
                const obj = {};
                const headerCount = {};
                
                headers.forEach((header, index) => {
                    if (!header) return;
                    
                    const value = row[index] !== undefined ? row[index] : '';
                    
                    if (!Object.prototype.hasOwnProperty.call(obj, header)) {
                        obj[header] = value;
                        headerCount[header] = 1;
                        return;
                    }
                    
                    headerCount[header] += 1;
                    obj[`${header}_${headerCount[header]}`] = value;
                    
                    if ((obj[header] === '' || obj[header] === undefined || obj[header] === null) && value !== '') {
                        obj[header] = value;
                    }
                });
                
                return obj;
            });
    }

    buildRowFromHeaders(headers, data) {
        return headers.map(header => {
            const key = String(header || '').trim();
            return data[key] !== undefined && data[key] !== null ? data[key] : '';
        });
    }

    async appendObjects(sheetName, objects) {
        const values = await this.readSheet(sheetName);
        const headers = values && values.length > 0 ? values[0] : [];
        const rows = objects.map(object => this.buildRowFromHeaders(headers, object));
        return this.appendRows(sheetName, rows);
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
