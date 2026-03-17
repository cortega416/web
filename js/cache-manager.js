// Gestor de caché para optimizar carga
class CacheManager {
    constructor() {
        this.cache = {};
        this.timestamps = {};
        this.TTL = {
            servicios: 10 * 60 * 1000,
            clientes: 10 * 60 * 1000,
            cuentas: 10 * 60 * 1000,
            perfiles: 5 * 60 * 1000,
            movimientos: 5 * 60 * 1000,
            suscripciones: 5 * 60 * 1000,
            correos: 30 * 60 * 1000,
            usuarios: 30 * 60 * 1000
        };
    }

    get(key) {
        const now = Date.now();
        const timestamp = this.timestamps[key];
        const ttl = this.TTL[key] || 5 * 60 * 1000;

        if (timestamp && now - timestamp < ttl) {
            return this.cache[key];
        }

        delete this.cache[key];
        delete this.timestamps[key];
        return null;
    }

    set(key, value) {
        this.cache[key] = value;
        this.timestamps[key] = Date.now();
    }

    clear(key) {
        delete this.cache[key];
        delete this.timestamps[key];
    }

    clearAll() {
        this.cache = {};
        this.timestamps = {};
    }

    has(key) {
        return this.get(key) !== null;
    }
}

const cacheManager = new CacheManager();