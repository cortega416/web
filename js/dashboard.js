// Dashboard - Lógica principal
let cachedData = {};

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
    // Proteger página
    if (!Auth.requireAuth()) return;
    
    // Mostrar usuario
    const session = Auth.getSession();
    document.getElementById('userDisplay').textContent = `${session.usuario} (${session.rol})`;
    
    // Ocultar correos si no es admin
    if (!Auth.isAdmin()) {
        const navCorreos = document.getElementById('navCorreos');
        if (navCorreos) navCorreos.style.display = 'none';
    }
    
    // Cargar datos
    await loadDashboard();
    
    // Actualizar badge de alertas
    await Utils.updateAlertBadge();
});

// Cargar dashboard
async function loadDashboard() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    loadingOverlay.classList.add('active');
    
    try {
        // Leer todas las hojas necesarias
        const [servicios, clientes, cuentas, perfiles, movimientos, suscripciones] = await Promise.all([
            sheetsClient.readSheet(CONFIG.SHEETS.SERVICIOS),
            sheetsClient.readSheet(CONFIG.SHEETS.CLIENTES),
            sheetsClient.readSheet(CONFIG.SHEETS.CUENTAS),
            sheetsClient.readSheet(CONFIG.SHEETS.PERFILES),
            sheetsClient.readSheet(CONFIG.SHEETS.MOVIMIENTOS),
            sheetsClient.readSheet(CONFIG.SHEETS.SUSCRIPCIONES)
        ]);
        
        // Parsear datos
        cachedData.servicios = sheetsClient.parseSheetData(servicios);
        cachedData.clientes = sheetsClient.parseSheetData(clientes);
        cachedData.cuentas = sheetsClient.parseSheetData(cuentas);
        cachedData.perfiles = sheetsClient.parseSheetData(perfiles);
        cachedData.movimientos = sheetsClient.parseSheetData(movimientos);
        cachedData.suscripciones = sheetsClient.parseSheetData(suscripciones);
        
        // Calcular estadísticas
        renderStats();
        
        // Renderizar actividad reciente
        renderRecentActivity();
        
        // Renderizar alertas
        renderAlertasPreview();
        
    } catch (error) {
        console.error('Error cargando dashboard:', error);
        Utils.showNotification('Error cargando datos del dashboard', 'error');
    } finally {
        loadingOverlay.classList.remove('active');
    }
}

// Renderizar estadísticas
function renderStats() {
    const session = Auth.getSession();
    const isAdmin = Auth.isAdmin();
    
    // Calcular totales
    const totalServicios = cachedData.servicios.filter(s => s.estado === 'activo').length;
    const totalClientes = cachedData.clientes.filter(c => c.estado === 'activo').length;
    const totalCuentas = cachedData.cuentas.filter(c => c.estado === 'activa').length;
    const suscripcionesActivas = cachedData.suscripciones.filter(s => s.estado === 'activa').length;
    
    // Calcular ingresos del mes
    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
    const ingresosMes = cachedData.movimientos
        .filter(m => m.tipo === 'entrada' && m.fecha >= inicioMes)
        .reduce((sum, m) => sum + parseFloat(m.monto || 0), 0);
    
    // Calcular perfiles ocupados
    const perfilesOcupados = cachedData.perfiles.filter(p => p.estado === 'ocupado').length;
    const perfilesDisponibles = cachedData.perfiles.filter(p => p.estado === 'disponible').length;
    const perfilesTotal = perfilesOcupados + perfilesDisponibles;
    const porcentajeOcupacion = perfilesTotal > 0 ? Math.round((perfilesOcupados / perfilesTotal) * 100) : 0;
    
    // Renderizar stats
    const statsGrid = document.getElementById('statsGrid');
    let statsHTML = `
        <div class="stat-card">
            <div class="stat-icon primary">🎯</div>
            <div class="stat-content">
                <div class="stat-label">Servicios Activos</div>
                <div class="stat-value">${totalServicios}</div>
            </div>
        </div>
        
        <div class="stat-card">
            <div class="stat-icon success">👥</div>
            <div class="stat-content">
                <div class="stat-label">Clientes Activos</div>
                <div class="stat-value">${totalClientes}</div>
            </div>
        </div>
        
        <div class="stat-card">
            <div class="stat-icon warning">🔐</div>
            <div class="stat-content">
                <div class="stat-label">Suscripciones Activas</div>
                <div class="stat-value">${suscripcionesActivas}</div>
            </div>
        </div>
    `;
    
    if (isAdmin) {
        statsHTML += `
            <div class="stat-card">
                <div class="stat-icon success">💰</div>
                <div class="stat-content">
                    <div class="stat-label">Ingresos del Mes</div>
                    <div class="stat-value">${Utils.formatCurrency(ingresosMes)}</div>
                </div>
            </div>
        `;
    }
    
    statsHTML += `
        <div class="stat-card">
            <div class="stat-icon ${porcentajeOcupacion > 80 ? 'danger' : 'primary'}">📊</div>
            <div class="stat-content">
                <div class="stat-label">Ocupación</div>
                <div class="stat-value">${porcentajeOcupacion}%</div>
                <small class="text-muted">${perfilesOcupados}/${perfilesTotal} perfiles</small>
            </div>
        </div>
    `;
    
    statsGrid.innerHTML = statsHTML;
}

// Renderizar actividad reciente
function renderRecentActivity() {
    const tbody = document.querySelector('#recentActivityTable tbody');
    
    // Tomar los últimos 10 movimientos
    const movimientosRecientes = cachedData.movimientos
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
        .slice(0, 10);
    
    if (movimientosRecientes.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted">No hay movimientos registrados</td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = movimientosRecientes.map(mov => {
        const cliente = cachedData.clientes.find(c => c.id == mov.cliente_id);
        const servicio = cachedData.servicios.find(s => s.id == mov.servicio_id);
        
        const tipoBadge = mov.tipo === 'entrada' 
            ? '<span class="badge badge-success">Entrada</span>'
            : '<span class="badge badge-danger">Salida</span>';
        
        return `
            <tr>
                <td>${Utils.formatDate(mov.fecha)}</td>
                <td>${tipoBadge}</td>
                <td>${cliente ? cliente.nombre : '-'}</td>
                <td>${servicio ? servicio.nombre : '-'}</td>
                <td class="${mov.tipo === 'entrada' ? 'text-success' : 'text-danger'}">
                    ${mov.tipo === 'entrada' ? '+' : '-'}${Utils.formatCurrency(mov.monto)}
                </td>
            </tr>
        `;
    }).join('');
}

// Renderizar preview de alertas
function renderAlertasPreview() {
    const container = document.getElementById('alertasPreview');
    
    // Calcular alertas
    const today = new Date();
    const alertDays = CONFIG.APP.DIAS_ALERTA;
    
    const alertas = cachedData.perfiles
        .filter(perfil => {
            if (perfil.estado !== 'ocupado' || !perfil.fecha_fin) return false;
            
            const daysRemaining = Utils.getDaysRemaining(perfil.fecha_fin);
            return daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= alertDays;
        })
        .sort((a, b) => {
            const daysA = Utils.getDaysRemaining(a.fecha_fin);
            const daysB = Utils.getDaysRemaining(b.fecha_fin);
            return daysA - daysB;
        })
        .slice(0, 5); // Solo las primeras 5
    
    if (alertas.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted">
                <p>✅ No hay alertas pendientes</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = alertas.map(perfil => {
        const cliente = cachedData.clientes.find(c => c.id == perfil.cliente_id);
        const cuenta = cachedData.cuentas.find(c => c.id == perfil.cuenta_id);
        const servicio = cuenta ? cachedData.servicios.find(s => s.id == cuenta.servicio_id) : null;
        
        const daysRemaining = Utils.getDaysRemaining(perfil.fecha_fin);
        const urgenciaClass = daysRemaining <= 3 ? 'danger' : 'warning';
        
        return `
            <div class="card mb-2" style="border-left: 3px solid var(--${urgenciaClass}-color);">
                <div class="card-body" style="padding: 12px;">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <strong>${cliente ? cliente.nombre : 'N/A'}</strong> - ${servicio ? servicio.nombre : 'N/A'}
                            <br>
                            <small class="text-muted">Vence en ${daysRemaining} día${daysRemaining !== 1 ? 's' : ''}</small>
                        </div>
                        <span class="badge badge-${urgenciaClass}">
                            ${Utils.formatDate(perfil.fecha_fin)}
                        </span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Renderizar actividad reciente - OPTIMIZADA PARA MÓVIL
function renderRecentActivity() {
    const tbody = document.querySelector('#recentActivityTable tbody');
    
    // Tomar los últimos 10 movimientos
    const movimientosRecientes = cachedData.movimientos
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
        .slice(0, 10);
    
    if (movimientosRecientes.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted">No hay movimientos registrados</td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = movimientosRecientes.map(mov => {
        const cliente = cachedData.clientes.find(c => c.id == mov.cliente_id);
        const servicio = cachedData.servicios.find(s => s.id == mov.servicio_id);
        
        const tipoBadge = mov.tipo === 'entrada' 
            ? '<span class="badge badge-success">Entrada</span>'
            : '<span class="badge badge-danger">Salida</span>';
        
        // Nombre de cliente truncado para móvil
        const clienteNombre = cliente ? 
            (cliente.nombre.length > 20 ? cliente.nombre.substring(0, 20) + '...' : cliente.nombre) 
            : '-';
        
        return `
            <tr>
                <td style="white-space: nowrap;">
                    ${Utils.formatDate(mov.fecha)}
                </td>
                <td>${tipoBadge}</td>
                <td>
                    <div style="max-width: 150px; overflow: hidden; text-overflow: ellipsis;">
                        ${clienteNombre}
                    </div>
                </td>
                <td class="hide-mobile">
                    <div style="max-width: 120px; overflow: hidden; text-overflow: ellipsis;">
                        ${servicio ? servicio.nombre : '-'}
                    </div>
                </td>
                <td class="${mov.tipo === 'entrada' ? 'text-success' : 'text-danger'}" style="white-space: nowrap;">
                    <strong>${mov.tipo === 'entrada' ? '+' : '-'}${Utils.formatCurrency(mov.monto)}</strong>
                </td>
            </tr>
        `;
    }).join('');
}