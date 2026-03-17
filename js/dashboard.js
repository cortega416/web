// Dashboard - Gestión del Dashboard
let cachedData = {
    servicios: [],
    clientes: [],
    cuentas: [],
    perfiles: [],
    movimientos: [],
    suscripciones: []
};

document.addEventListener('DOMContentLoaded', async () => {
    if (!Auth.requireAuth()) return;
    
    const session = Auth.getSession();
    document.getElementById('userDisplay').textContent = `${session.usuario} (${session.rol})`;
    
    if (!Auth.isAdmin()) {
        document.getElementById('navCorreos').style.display = 'none';
    }
    
    await loadDashboard();
    await Utils.updateAlertBadge();
});

async function loadDashboard() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    loadingOverlay.classList.add('active');
    
    try {
        console.log('📥 Iniciando carga de datos...');
        
        const [servicios, clientes, cuentas, perfiles, movimientos, suscripciones] = await Promise.all([
            sheetsClient.readSheet(CONFIG.SHEETS.SERVICIOS),
            sheetsClient.readSheet(CONFIG.SHEETS.CLIENTES),
            sheetsClient.readSheet(CONFIG.SHEETS.CUENTAS),
            sheetsClient.readSheet(CONFIG.SHEETS.PERFILES),
            sheetsClient.readSheet(CONFIG.SHEETS.MOVIMIENTOS),
            sheetsClient.readSheet(CONFIG.SHEETS.SUSCRIPCIONES)
        ]);
        
        cachedData.servicios = sheetsClient.parseSheetData(servicios);
        cachedData.clientes = sheetsClient.parseSheetData(clientes);
        cachedData.cuentas = sheetsClient.parseSheetData(cuentas);
        cachedData.perfiles = sheetsClient.parseSheetData(perfiles);
        cachedData.movimientos = sheetsClient.parseSheetData(movimientos);
        cachedData.suscripciones = sheetsClient.parseSheetData(suscripciones);
        
        console.log('✅ Datos cargados correctamente');
        
        renderStats();
        renderRecentActivity();
        renderAlertasPreview();
        
        setTimeout(() => {
            updateCharts();
        }, 100);
        
    } catch (error) {
        console.error('Error cargando dashboard:', error);
        Utils.showNotification('❌ Error cargando datos: ' + error.message, 'error');
    } finally {
        loadingOverlay.classList.remove('active');
    }
}

function renderStats() {
    const statsGrid = document.getElementById('statsGrid');
    const isAdmin = Auth.isAdmin();
    
    const totalServicios = cachedData.servicios.filter(s => s.estado === 'activo').length;
    const totalClientes = cachedData.clientes.filter(c => c.estado === 'activo').length;
    const suscripcionesActivas = cachedData.suscripciones.filter(s => s.estado === 'activa').length;
    
    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
    const ingresosMes = cachedData.movimientos
        .filter(m => m.tipo === 'entrada' && m.fecha >= inicioMes)
        .reduce((sum, m) => sum + parseFloat(m.monto || 0), 0);
    
    const perfilesOcupados = cachedData.perfiles.filter(p => p.estado === 'ocupado').length;
    const perfilesTotal = cachedData.perfiles.length;
    const porcentajeOcupacion = perfilesTotal > 0 ? Math.round((perfilesOcupados / perfilesTotal) * 100) : 0;
    
    let html = `
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
            <div class="stat-icon info">📺</div>
            <div class="stat-content">
                <div class="stat-label">Suscripciones Activas</div>
                <div class="stat-value">${suscripcionesActivas}</div>
            </div>
        </div>
    `;
    
    if (isAdmin) {
        html += `
            <div class="stat-card">
                <div class="stat-icon success">💰</div>
                <div class="stat-content">
                    <div class="stat-label">Ingresos del Mes</div>
                    <div class="stat-value">${Utils.formatCurrency(ingresosMes)}</div>
                </div>
            </div>
        `;
    }
    
    html += `
        <div class="stat-card">
            <div class="stat-icon warning">📊</div>
            <div class="stat-content">
                <div class="stat-label">Ocupación</div>
                <div class="stat-value">${porcentajeOcupacion}%</div>
            </div>
        </div>
    `;
    
    statsGrid.innerHTML = html;
}

function renderRecentActivity() {
    const tbody = document.querySelector('#recentActivityTable tbody');
    
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
                <td style="white-space: nowrap;">${Utils.formatDate(mov.fecha)}</td>
                <td>${tipoBadge}</td>
                <td><div style="max-width: 150px; overflow: hidden; text-overflow: ellipsis;">${cliente ? cliente.nombre : '-'}</div></td>
                <td class="hide-mobile"><div style="max-width: 120px; overflow: hidden; text-overflow: ellipsis;">${servicio ? servicio.nombre : '-'}</div></td>
                <td class="${mov.tipo === 'entrada' ? 'text-success' : 'text-danger'}" style="white-space: nowrap;">
                    <strong>${mov.tipo === 'entrada' ? '+' : '-'}${Utils.formatCurrency(mov.monto)}</strong>
                </td>
            </tr>
        `;
    }).join('');
}

function renderAlertasPreview() {
    const alertDays = CONFIG.APP.DIAS_ALERTA;
    const alertasContainer = document.getElementById('alertasPreview');
    
    const alertas = cachedData.perfiles
        .filter(perfil => {
            if (perfil.estado !== 'ocupado' || !perfil.fecha_fin) return false;
            const daysRemaining = Utils.getDaysRemaining(perfil.fecha_fin);
            return daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= alertDays;
        })
        .sort((a, b) => Utils.getDaysRemaining(a.fecha_fin) - Utils.getDaysRemaining(b.fecha_fin))
        .slice(0, 5);
    
    if (alertas.length === 0) {
        alertasContainer.innerHTML = `
            <div class="empty-state" style="padding: 40px 20px;">
                <div class="icon">✅</div>
                <h3>¡Todo al día!</h3>
                <p>No hay suscripciones próximas a vencer</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    alertas.forEach(perfil => {
        const cliente = cachedData.clientes.find(c => c.id == perfil.cliente_id);
        const cuenta = cachedData.cuentas.find(c => c.id == perfil.cuenta_id);
        const servicio = cuenta ? cachedData.servicios.find(s => s.id == cuenta.servicio_id) : null;
        const dias = Utils.getDaysRemaining(perfil.fecha_fin);
        const urgenciaClass = dias <= 3 ? 'danger' : 'warning';
        
        html += `
            <div style="padding: 12px; border-left: 4px solid var(--${urgenciaClass}-color); background: var(--bg-secondary); border-radius: 8px; margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>${cliente ? cliente.nombre : 'N/A'}</strong>
                        <div style="font-size: 12px; color: var(--text-secondary);">
                            ${servicio ? servicio.nombre : 'N/A'} - Vence en ${dias} días
                        </div>
                    </div>
                    <span class="badge badge-${urgenciaClass}">${dias}d</span>
                </div>
            </div>
        `;
    });
    
    alertasContainer.innerHTML = html;
}

// Función para hacer tabla responsiva en móvil
function makeTableResponsive(tableId) {
    const table = document.getElementById(tableId);
    if (!table) return;
    
    const rows = table.querySelectorAll('tbody tr');
    const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.trim());
    
    rows.forEach((row, rowIndex) => {
        const cells = row.querySelectorAll('td');
        cells.forEach((cell, cellIndex) => {
            if (headers[cellIndex]) {
                cell.setAttribute('data-label', headers[cellIndex]);
            }
        });
    });
}

// Llamar después de renderizar cada tabla
document.addEventListener('DOMContentLoaded', () => {
    makeTableResponsive('alertasTable');
    makeTableResponsive('cuentasTable');
    makeTableResponsive('clientesTable');
    // etc...
});