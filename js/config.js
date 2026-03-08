// Configuración global del sistema
const CONFIG = {
    // URL del Google Apps Script Web App (COMPLETAR DESPUÉS DEL DEPLOY)
    APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycby6veu3jkBcZwOoYtYi9GsFBRxvTZoi_-Je0t7d0Nny6yG5ooEjcp4HmjgVUZL79F8f/exec',
    
    // Nombres exactos de las hojas en Google Sheets
    SHEETS: {
        USUARIOS: 'UsuariosSistema',
        SERVICIOS: 'Servicios',
        CLIENTES: 'Clientes',
        CORREOS: 'Correos',
        CUENTAS: 'Cuentas',
        PERFILES: 'Perfiles',
        SUSCRIPCIONES: 'Suscripciones',
        MOVIMIENTOS: 'Movimientos'
    },
    
    // Configuración de la aplicación
    APP: {
        NAME: 'Streaming Manager',
        VERSION: '1.0.0',
        DIAS_ALERTA: 7 // Alertar con 7 días de anticipación
    }
};