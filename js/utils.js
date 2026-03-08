// Utilidades generales
class Utils {
    // Formatear fecha
    static formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES');
    }

    // Formatear fecha y hora
    static formatDateTime(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleString('es-ES');
    }

    // Obtener fecha actual en formato ISO
    static getCurrentDate() {
        return new Date().toISOString().split('T')[0];
    }

    // Agregar días a una fecha
    static addDays(dateString, days) {
        const date = new Date(dateString);
        date.setDate(date.getDate() + days);
        return date.toISOString().split('T')[0];
    }

    // Calcular días restantes
    static getDaysRemaining(dateString) {
        if (!dateString) return null;
        const date = new Date(dateString);
        const now = new Date();
        const diff = date - now;
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    }

    // Formatear moneda
    static formatCurrency(amount) {
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'USD'
        }).format(amount || 0);
    }

    // Mostrar notificación
    static showNotification(message, type = 'success') {
        // Crear elemento de notificación
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Animar entrada
        setTimeout(() => notification.classList.add('show'), 10);
        
        // Remover después de 3 segundos
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Confirmar acción
    static async confirm(message) {
        return window.confirm(message);
    }

    // Escapar HTML
    static escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Generar ID único temporal
    static generateTempId() {
        return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Validar email
    static isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    // Obtener badge de alertas
    static async getAlertCount() {
        try {
            const values = await sheetsClient.readSheet(CONFIG.SHEETS.PERFILES);
            const perfiles = sheetsClient.parseSheetData(values);
            
            const today = new Date();
            const alertDays = CONFIG.APP.DIAS_ALERTA;
            
            const alertas = perfiles.filter(perfil => {
                if (perfil.estado !== 'ocupado' || !perfil.fecha_fin) return false;
                
                const daysRemaining = this.getDaysRemaining(perfil.fecha_fin);
                return daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= alertDays;
            });
            
            return alertas.length;
        } catch (error) {
            console.error('Error obteniendo alertas:', error);
            return 0;
        }
    }

    // Actualizar badge de alertas en el sidebar
    static async updateAlertBadge() {
        const badge = document.getElementById('alertBadge');
        if (!badge) return;
        
        const count = await this.getAlertCount();
        
        if (count > 0) {
            badge.textContent = count;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }
}