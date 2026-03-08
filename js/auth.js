// Gestión de autenticación y sesión
class Auth {
    static SESSION_KEY = 'streaming_manager_session';

    // Login de usuario
    static async login(usuario, password) {
        try {
            // Leer usuarios del sistema
            const values = await sheetsClient.readSheet(CONFIG.SHEETS.USUARIOS);
            const usuarios = sheetsClient.parseSheetData(values);
            
            // Buscar usuario
            const user = usuarios.find(u => 
                u.usuario === usuario && 
                u.password === password && 
                u.estado === 'activo'
            );
            
            if (!user) {
                throw new Error('Usuario o contraseña incorrectos, o usuario inactivo');
            }
            
            // Crear sesión
            const session = {
                id: user.id,
                usuario: user.usuario,
                rol: user.rol,
                loginTime: new Date().toISOString()
            };
            
            // Guardar en localStorage
            localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
            
            return session;
        } catch (error) {
            console.error('Error en login:', error);
            throw error;
        }
    }

    // Obtener sesión actual
    static getSession() {
        const sessionData = localStorage.getItem(this.SESSION_KEY);
        if (!sessionData) return null;
        
        try {
            return JSON.parse(sessionData);
        } catch {
            return null;
        }
    }

    // Verificar si hay sesión válida
    static isAuthenticated() {
        return this.getSession() !== null;
    }

    // Verificar rol
    static hasRole(role) {
        const session = this.getSession();
        return session && session.rol === role;
    }

    // Es admin
    static isAdmin() {
        return this.hasRole('admin');
    }

    // Es ayudante
    static isAyudante() {
        return this.hasRole('ayudante');
    }

    // Cerrar sesión
    static logout() {
        localStorage.removeItem(this.SESSION_KEY);
        window.location.href = 'index.html';
    }

    // Proteger página (llamar al inicio de cada página)
    static requireAuth() {
        if (!this.isAuthenticated()) {
            window.location.href = 'index.html';
            return false;
        }
        return true;
    }

    // Proteger página solo para admin
    static requireAdmin() {
        if (!this.requireAuth()) return false;
        
        if (!this.isAdmin()) {
            alert('No tienes permisos para acceder a esta página');
            window.location.href = 'dashboard.html';
            return false;
        }
        return true;
    }
}