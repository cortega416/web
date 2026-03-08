// Cliente para interactuar con Google Sheets API
class SheetsClient {
    constructor() {
        this.accessToken = null;
        this.tokenExpiry = null;
    }

    // Obtener token de acceso usando Service Account
    async getAccessToken() {
        // Verificar si el token actual es válido
        if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
            return this.accessToken;
        }

        const { client_email, private_key } = CONFIG.SERVICE_ACCOUNT;
        
        // Crear JWT
        const header = {
            alg: 'RS256',
            typ: 'JWT'
        };
        
        const now = Math.floor(Date.now() / 1000);
        const claim = {
            iss: client_email,
            scope: CONFIG.SCOPES.join(' '),
            aud: 'https://oauth2.googleapis.com/token',
            exp: now + 3600,
            iat: now
        };

        // En un entorno real, necesitarías una biblioteca para firmar el JWT
        // Por simplicidad, usaremos gapi.client que maneja esto automáticamente
        await this.initGoogleAPI();
        
        return this.accessToken;
    }

    // Inicializar Google API Client
    async initGoogleAPI() {
        return new Promise((resolve, reject) => {
            if (window.gapi && gapi.client) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://apis.google.com/js/api.js';
            script.onload = async () => {
                await gapi.load('client', async () => {
                    try {
                        await gapi.client.init({
                            apiKey: '', // No necesario con Service Account
                            discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4']
                        });
                        
                        // Establecer el token de acceso
                        gapi.client.setToken({ access_token: await this.getServiceAccountToken() });
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                });
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // Obtener token de Service Account (usando un servidor proxy o método alternativo)
    async getServiceAccountToken() {
        // NOTA IMPORTANTE: En producción, deberías usar un endpoint backend seguro
        // que genere el token sin exponer las credenciales.
        // 
        // Alternativa práctica: Usar Google Apps Script como proxy
        // o implementar Cloud Function para generar tokens.
        
        // Por ahora, implementaremos lectura/escritura directa con fetch API
        throw new Error('Implementar método de autenticación con Service Account');
    }

    // MÉTODO ALTERNATIVO: Usar Google Sheets API directamente con fetch
    async makeRequest(method, endpoint, body = null) {
        const token = await this.getAccessToken();
        
        const options = {
            method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        };
        
        if (body) {
            options.body = JSON.stringify(body);
        }
        
        const response = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SPREADSHEET_ID}${endpoint}`,
            options
        );
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Error en la petición');
        }
        
        return response.json();
    }

    // Leer datos de una hoja
    async readSheet(sheetName, range = null) {
        const fullRange = range ? `${sheetName}!${range}` : sheetName;
        
        try {
            const data = await this.makeRequest('GET', `/values/${encodeURIComponent(fullRange)}`);
            return data.values || [];
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
                obj[header] = row[index] || '';
            });
            return obj;
        });
    }

    // Agregar filas a una hoja
    async appendRows(sheetName, rows) {
        try {
            const result = await this.makeRequest(
                'POST',
                `/values/${encodeURIComponent(sheetName)}:append?valueInputOption=RAW`,
                {
                    values: rows
                }
            );
            return result;
        } catch (error) {
            console.error(`Error agregando filas a ${sheetName}:`, error);
            throw error;
        }
    }

    // Actualizar rango específico
    async updateRange(sheetName, range, values) {
        const fullRange = `${sheetName}!${range}`;
        
        try {
            const result = await this.makeRequest(
                'PUT',
                `/values/${encodeURIComponent(fullRange)}?valueInputOption=RAW`,
                {
                    values: values
                }
            );
            return result;
        } catch (error) {
            console.error(`Error actualizando ${fullRange}:`, error);
            throw error;
        }
    }

    // Encontrar fila por ID y actualizar
    async updateById(sheetName, id, updates) {
        try {
            // Leer toda la hoja
            const values = await this.readSheet(sheetName);
            const data = this.parseSheetData(values);
            
            // Encontrar el índice (fila 2 es índice 0 en data)
            const index = data.findIndex(row => row.id == id);
            
            if (index === -1) {
                throw new Error(`No se encontró registro con id ${id} en ${sheetName}`);
            }
            
            // Calcular la fila real (headers + 1 + índice)
            const rowNumber = index + 2;
            
            // Obtener headers
            const headers = values[0];
            
            // Crear array de valores actualizados
            const currentRow = data[index];
            const updatedRow = { ...currentRow, ...updates };
            const rowValues = headers.map(header => updatedRow[header] || '');
            
            // Actualizar la fila completa
            await this.updateRange(sheetName, `A${rowNumber}:${this.getColumnLetter(headers.length)}${rowNumber}`, [rowValues]);
            
            return updatedRow;
        } catch (error) {
            console.error(`Error actualizando por ID en ${sheetName}:`, error);
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

    // Generar nuevo ID
    async getNextId(sheetName) {
        const values = await this.readSheet(sheetName);
        const data = this.parseSheetData(values);
        
        if (data.length === 0) return 1;
        
        const ids = data.map(row => parseInt(row.id) || 0);
        return Math.max(...ids) + 1;
    }
}

// Instancia global
const sheetsClient = new SheetsClient();