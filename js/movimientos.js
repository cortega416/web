// Movimientos - Gestión de entradas y salidas
let movimientos = [];
let clientes = [];
let servicios = [];
let usuarios = [];

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
    if (!Auth.requireAuth()) return;
    
    const session = Auth.getSession();
    document.getElementById('userDisplay').textContent = `${session.usuario} (${session.rol})`;
    
    if (!Auth.isAdmin()) {
        document.getElementById('navCorreos').style.display = 'none';
        document.getElementById('thAccionesMovimientos').style.display = 'none';
    }
    
    await loadMovimientos();
    await Utils.updateAlertBadge();
    
    // Event listeners para filtros
    document.getElementById('searchMovimiento').addEventListener('input', filterMovimientos);
    document.getElementById('filterTipo').addEventListener('change', filterMovimientos);
    document.getElementById('filterCategoria').addEventListener('change', filterMovimientos);
    document.getElementById('filterFechaDesde').addEventListener('change', filterMovimientos);
    document.getElementById('filterFechaHasta').addEventListener('change', filterMovimientos);
});

// Cargar movimientos
async function loadMovimientos() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    loadingOverlay.classList.add('active');
    
    try {
        const [movimientosData, clientesData, serviciosData, usuariosData] = await Promise.all([
            sheetsClient.readSheet(CONFIG.SHEETS.MOVIMIENTOS),
            sheetsClient.readSheet(CONFIG.SHEETS.CLIENTES),
            sheetsClient.readSheet(CONFIG.SHEETS.SERVICIOS),
            sheetsClient.readSheet(CONFIG.SHEETS.USUARIOS)
        ]);
        
        movimientos = sheetsClient.parseSheetData(movimientosData);
        clientes = sheetsClient.parseSheetData(clientesData);
        servicios = sheetsClient.parseSheetData(serviciosData);
        usuarios = sheetsClient.parseSheetData(usuariosData);
        
        renderStats();
        renderMovimientos(movimientos);
    } catch (error) {
        console.error('Error cargando movimientos:', error);
        Utils.showNotification('Error cargando movimientos', 'error');
    } finally {
        loadingOverlay.classList.remove('active');
    }
}

// Renderizar estadísticas
function renderStats() {
    const isAdmin = Auth.isAdmin();
    if (!isAdmin) {
        document.getElementById('statsMovimientos').style.display = 'none';
        return;
    }
    
    // Calcular totales
    const totalEntradas = movimientos
        .filter(m => m.tipo === 'entrada')
        .reduce((sum, m) => sum + parseFloat(m.monto || 0), 0);
    
    const totalSalidas = movimientos
        .filter(m => m.tipo === 'salida')
        .reduce((sum, m) => sum + parseFloat(m.monto || 0), 0);
    
    const balance = totalEntradas - totalSalidas;
    
    // Calcular del mes actual
    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
    
    const entradasMes = movimientos
        .filter(m => m.tipo === 'entrada' && m.fecha >= inicioMes)
        .reduce((sum, m) => sum + parseFloat(m.monto || 0), 0);
    
    const salidasMes = movimientos
        .filter(m => m.tipo === 'salida' && m.fecha >= inicioMes)
        .reduce((sum, m) => sum + parseFloat(m.monto || 0), 0);
    
    const statsHTML = `
        <div class="stat-card">
            <div class="stat-icon success"><i class="fas fa-arrow-down"></i></div>
            <div class="stat-content">
                <div class="stat-label">Total Entradas</div>
                <div class="stat-value text-success">${Utils.formatCurrency(totalEntradas)}</div>
            </div>
        </div>
        
        <div class="stat-card">
            <div class="stat-icon danger"><i class="fas fa-arrow-up"></i></div>
            <div class="stat-content">
                <div class="stat-label">Total Salidas</div>
                <div class="stat-value text-danger">${Utils.formatCurrency(totalSalidas)}</div>
            </div>
        </div>
        
        <div class="stat-card">
            <div class="stat-icon ${balance >= 0 ? 'success' : 'danger'}"><i class="fas fa-chart-bar"></i></div>
            <div class="stat-content">
                <div class="stat-label">Balance Total</div>
                <div class="stat-value ${balance >= 0 ? 'text-success' : 'text-danger'}">
                    ${Utils.formatCurrency(balance)}
                </div>
            </div>
        </div>
        
        <div class="stat-card">
            <div class="stat-icon primary"><i class="fas fa-calendar-alt"></i></div>
            <div class="stat-content">
                <div class="stat-label">Balance del Mes</div>
                <div class="stat-value">
                    ${Utils.formatCurrency(entradasMes - salidasMes)}
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('statsMovimientos').innerHTML = statsHTML;
}

// Renderizar tabla de movimientos
function renderMovimientos(data) {
    const tbody = document.querySelector('#movimientosTable tbody');
    const isAdmin = Auth.isAdmin();
    
    if (data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="text-center text-muted">No hay movimientos registrados</td>
            </tr>
        `;
        return;
    }
    
    // Ordenar por fecha descendente
    const sorted = [...data].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    
    tbody.innerHTML = sorted.map(mov => {
        // Verificar si fue eliminado
        const esEliminado = mov.monto == 0 && mov.notas && mov.notas.includes('[ELIMINADO]');
        
        const cliente = clientes.find(c => c.id == mov.cliente_id);
        const servicio = servicios.find(s => s.id == mov.servicio_id);
        const usuario = usuarios.find(u => u.id == mov.usuario_id);
        
        const tipoBadge = mov.tipo === 'entrada' 
            ? '<span class="badge badge-success">Entrada</span>'
            : '<span class="badge badge-danger">Salida</span>';
        
        const categoriaBadge = `<span class="badge badge-secondary">${mov.categoria}</span>`;
        
        return `
            <tr ${esEliminado ? 'style="opacity: 0.5; text-decoration: line-through;"' : ''}>
                <td>${mov.id}</td>
                <td>${Utils.formatDate(mov.fecha)}</td>
                <td>${tipoBadge}</td>
                <td>${categoriaBadge}</td>
                <td>${cliente ? cliente.nombre : '-'}</td>
                <td>${servicio ? servicio.nombre : '-'}</td>
                <td class="${mov.tipo === 'entrada' ? 'text-success' : 'text-danger'}">
                    <strong>
                        ${mov.tipo === 'entrada' ? '+' : '-'}${Utils.formatCurrency(mov.monto)}
                    </strong>
                </td>
                <td>${usuario ? usuario.usuario : '-'}</td>
                <td>${mov.notas || '-'}</td>
                ${isAdmin ? `
                    <td>
                        <div class="table-actions">
                            ${!esEliminado ? `
                                <button class="btn btn-sm btn-danger" onclick="eliminarMovimiento(${mov.id})" title="Eliminar"><i class="fas fa-trash"></i></button>
                            ` : ''}
                        </div>
                    </td>
                ` : ''}
            </tr>
        `;
    }).join('');
}

// Filtrar movimientos
function filterMovimientos() {
    const searchTerm = document.getElementById('searchMovimiento').value.toLowerCase();
    const tipoFilter = document.getElementById('filterTipo').value;
    const categoriaFilter = document.getElementById('filterCategoria').value;
    const fechaDesde = document.getElementById('filterFechaDesde').value;
    const fechaHasta = document.getElementById('filterFechaHasta').value;
    
    const filtered = movimientos.filter(mov => {
        const cliente = clientes.find(c => c.id == mov.cliente_id);
        const servicio = servicios.find(s => s.id == mov.servicio_id);
        
        const matchSearch = (mov.notas && mov.notas.toLowerCase().includes(searchTerm)) ||
                           (cliente && cliente.nombre.toLowerCase().includes(searchTerm)) ||
                           (servicio && servicio.nombre.toLowerCase().includes(searchTerm));
        const matchTipo = !tipoFilter || mov.tipo === tipoFilter;
        const matchCategoria = !categoriaFilter || mov.categoria === categoriaFilter;
        const matchFechaDesde = !fechaDesde || mov.fecha >= fechaDesde;
        const matchFechaHasta = !fechaHasta || mov.fecha <= fechaHasta;
        
        return matchSearch && matchTipo && matchCategoria && matchFechaDesde && matchFechaHasta;
    });
    
    renderMovimientos(filtered);
}

// Abrir modal crear movimiento
function openModalMovimiento(tipo) {
    const modal = document.getElementById('modalMovimiento');
    const title = document.getElementById('modalMovimientoTitle');
    const form = document.getElementById('formMovimiento');
    
    form.reset();
    
    document.getElementById('movimientoTipo').value = tipo;
    document.getElementById('movimientoFecha').value = Utils.getCurrentDate();
    
    title.textContent = tipo === 'entrada' ? 'Nueva Entrada' : 'Nueva Salida';
    
    // Poblar select de categorías según el tipo
    const selectCategoria = document.getElementById('movimientoCategoria');
    selectCategoria.innerHTML = '<option value="">Seleccionar...</option>';
    
    if (tipo === 'entrada') {
        selectCategoria.innerHTML += `
            <option value="venta">Venta</option>
            <option value="renovacion">Renovación</option>
            <option value="otro">Otro</option>
        `;
    } else {
        selectCategoria.innerHTML += `
            <option value="compra_cuenta">Compra de Cuenta</option>
            <option value="gasto_operativo">Gasto Operativo</option>
            <option value="otro">Otro</option>
        `;
    }
    
    // Poblar select de clientes
    populateClientesSelect();
    
    // Poblar select de servicios
    populateServiciosSelectMovimiento();
    
    modal.classList.add('active');
}

function closeModalMovimiento() {
    document.getElementById('modalMovimiento').classList.remove('active');
}

// Poblar select de clientes
function populateClientesSelect() {
    const select = document.getElementById('movimientoCliente');
    const clientesActivos = clientes.filter(c => c.estado === 'activo');
    
    select.innerHTML = '<option value="">Ninguno</option>';
    clientesActivos.forEach(cliente => {
        const option = document.createElement('option');
        option.value = cliente.id;
        option.textContent = cliente.nombre;
        select.appendChild(option);
    });
}

// Poblar select de servicios
function populateServiciosSelectMovimiento() {
    const select = document.getElementById('movimientoServicio');
    const serviciosActivos = servicios.filter(s => s.estado === 'activo');
    
    select.innerHTML = '<option value="">Ninguno</option>';
    serviciosActivos.forEach(servicio => {
        const option = document.createElement('option');
        option.value = servicio.id;
        option.textContent = servicio.nombre;
        select.appendChild(option);
    });
}

// Guardar movimiento
async function guardarMovimiento() {
    const form = document.getElementById('formMovimiento');
    
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const loadingOverlay = document.getElementById('loadingOverlay');
    loadingOverlay.classList.add('active');
    
    try {
        const session = Auth.getSession();
        
        const movimientoData = {
            tipo: document.getElementById('movimientoTipo').value,
            categoria: document.getElementById('movimientoCategoria').value,
            monto: document.getElementById('movimientoMonto').value,
            cliente_id: document.getElementById('movimientoCliente').value || '',
            servicio_id: document.getElementById('movimientoServicio').value || '',
            metodo_pago: document.getElementById('movimientoMetodoPago').value,
            fecha: document.getElementById('movimientoFecha').value,
            usuario_id: session.id,
            notas: document.getElementById('movimientoNotas').value
        };
        
        const newId = await sheetsClient.getNextId(CONFIG.SHEETS.MOVIMIENTOS);
        const newRow = [
            newId,
            movimientoData.tipo,
            movimientoData.categoria,
            movimientoData.monto,
            movimientoData.cliente_id,
            movimientoData.servicio_id,
            movimientoData.metodo_pago,
            movimientoData.fecha,
            movimientoData.usuario_id,
            movimientoData.notas
        ];
        
        await sheetsClient.appendRows(CONFIG.SHEETS.MOVIMIENTOS, [newRow]);
        
        Utils.showNotification('Movimiento registrado correctamente', 'success');
        
        closeModalMovimiento();
        await loadMovimientos();
        
    } catch (error) {
        console.error('Error guardando movimiento:', error);
        Utils.showNotification('Error guardando movimiento', 'error');
    } finally {
        loadingOverlay.classList.remove('active');
    }
}

// Eliminar movimiento (soft delete)
async function eliminarMovimiento(id) {
    if (!await Utils.confirm('¿Estás seguro de eliminar este movimiento?')) {
        return;
    }
    
    const loadingOverlay = document.getElementById('loadingOverlay');
    loadingOverlay.classList.add('active');
    
    try {
        const movimiento = movimientos.find(m => m.id == id);
        
        await sheetsClient.updateById(CONFIG.SHEETS.MOVIMIENTOS, id, {
            monto: 0,
            notas: `[ELIMINADO] ${movimiento.notas || ''}`
        });
        
        Utils.showNotification('Movimiento eliminado correctamente', 'success');
        await loadMovimientos();
        
    } catch (error) {
        console.error('Error eliminando movimiento:', error);
        Utils.showNotification('Error eliminando movimiento', 'error');
    } finally {
        loadingOverlay.classList.remove('active');
    }
}

// Renderizar tabla de movimientos - OPTIMIZADA PARA MÓVIL
function renderMovimientos(data) {
    const tbody = document.querySelector('#movimientosTable tbody');
    const isAdmin = Auth.isAdmin();
    
    if (data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="text-center text-muted">No hay movimientos registrados</td>
            </tr>
        `;
        return;
    }
    
    const sorted = [...data].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    
    tbody.innerHTML = sorted.map(mov => {
        const esEliminado = mov.monto == 0 && mov.notas && mov.notas.includes('[ELIMINADO]');
        
        const cliente = clientes.find(c => c.id == mov.cliente_id);
        const servicio = servicios.find(s => s.id == mov.servicio_id);
        const usuario = usuarios.find(u => u.id == mov.usuario_id);
        
        const tipoBadge = mov.tipo === 'entrada' 
            ? '<span class="badge badge-success">Entrada</span>'
            : '<span class="badge badge-danger">Salida</span>';
        
        const categoriaBadge = `<span class="badge badge-secondary" style="font-size: 9px;">${mov.categoria}</span>`;
        
        const clienteNombre = cliente ? 
            (cliente.nombre.length > 20 ? cliente.nombre.substring(0, 20) + '...' : cliente.nombre) 
            : '-';
        
        return `
            <tr ${esEliminado ? 'style="opacity: 0.5; text-decoration: line-through;"' : ''}>
                <td class="hide-mobile">${mov.id}</td>
                <td style="white-space: nowrap; font-size: 11px;">${Utils.formatDate(mov.fecha)}</td>
                <td>
                    ${tipoBadge}
                    <div class="show-mobile" style="margin-top: 4px;">
                        ${categoriaBadge}
                    </div>
                </td>
                <td class="hide-mobile">${categoriaBadge}</td>
                <td style="font-size: 11px;">
                    <div style="max-width: 120px; overflow: hidden; text-overflow: ellipsis;">
                        ${clienteNombre}
                    </div>
                </td>
                <td class="hide-mobile" style="font-size: 11px;">
                    <div style="max-width: 100px; overflow: hidden; text-overflow: ellipsis;">
                        ${servicio ? servicio.nombre : '-'}
                    </div>
                </td>
                <td class="${mov.tipo === 'entrada' ? 'text-success' : 'text-danger'}" style="white-space: nowrap;">
                    <strong style="font-size: 12px;">
                        ${mov.tipo === 'entrada' ? '+' : '-'}${Utils.formatCurrency(mov.monto)}
                    </strong>
                </td>
                <td class="hide-mobile" style="font-size: 11px;">${usuario ? usuario.usuario : '-'}</td>
                <td class="hide-mobile" style="font-size: 10px; max-width: 150px; overflow: hidden; text-overflow: ellipsis;">${mov.notas || '-'}</td>
                ${isAdmin ? `
                    <td>
                        <div class="table-actions">
                            ${!esEliminado ? `
                                <button class="btn btn-sm btn-danger" onclick="eliminarMovimiento(${mov.id})" title="Eliminar"><i class="fas fa-trash"></i></button>
                            ` : ''}
                        </div>
                    </td>
                ` : ''}
            </tr>
        `;
    }).join('');
}