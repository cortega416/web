// Clientes - Gestión de clientes
let clientes = [];
let suscripciones = [];
let servicios = [];
let perfiles = [];
let editingId = null;

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
    if (!Auth.requireAuth()) return;
    
    const session = Auth.getSession();
    document.getElementById('userDisplay').textContent = `${session.usuario} (${session.rol})`;
    
    if (!Auth.isAdmin()) {
        document.getElementById('navCorreos').style.display = 'none';
    }
    
    await loadClientes();
    await Utils.updateAlertBadge();
    
    // Event listeners para filtros
    document.getElementById('searchCliente').addEventListener('input', filterClientes);
    document.getElementById('filterEstado').addEventListener('change', filterClientes);
});

// Cargar clientes
async function loadClientes() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    loadingOverlay.classList.add('active');
    
    try {
        const [clientesData, suscripcionesData, serviciosData, perfilesData] = await Promise.all([
            sheetsClient.readSheet(CONFIG.SHEETS.CLIENTES),
            sheetsClient.readSheet(CONFIG.SHEETS.SUSCRIPCIONES),
            sheetsClient.readSheet(CONFIG.SHEETS.SERVICIOS),
            sheetsClient.readSheet(CONFIG.SHEETS.PERFILES)
        ]);
        
        clientes = sheetsClient.parseSheetData(clientesData);
        suscripciones = sheetsClient.parseSheetData(suscripcionesData);
        servicios = sheetsClient.parseSheetData(serviciosData);
        perfiles = sheetsClient.parseSheetData(perfilesData);
        
        renderClientes(clientes);
    } catch (error) {
        console.error('Error cargando clientes:', error);
        Utils.showNotification('Error cargando clientes', 'error');
    } finally {
        loadingOverlay.classList.remove('active');
    }
}

// Renderizar tabla de clientes
function renderClientes(data) {
    const tbody = document.querySelector('#clientesTable tbody');
    
    if (data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-muted">No hay clientes registrados</td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = data.map(cliente => {
        // Contar suscripciones activas
        const suscripcionesActivas = suscripciones.filter(s => 
            s.cliente_id == cliente.id && s.estado === 'activa'
        ).length;
        
        const estadoBadge = cliente.estado === 'activo' 
            ? '<span class="badge badge-success">Activo</span>'
            : '<span class="badge badge-secondary">Inactivo</span>';
        
        return `
            <tr>
                <td>${cliente.id}</td>
                <td><strong>${cliente.nombre}</strong></td>
                <td>${cliente.telefono || '-'}</td>
                <td>${cliente.email || '-'}</td>
                <td>${Utils.formatDate(cliente.fecha_registro)}</td>
                <td>
                    <span class="badge badge-primary">${suscripcionesActivas}</span>
                </td>
                <td>${estadoBadge}</td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-sm btn-secondary" onclick="verDetalleCliente(${cliente.id})" title="Ver Detalle">👁️</button>
                        <button class="btn btn-sm btn-secondary" onclick="editCliente(${cliente.id})" title="Editar">✏️</button>
                        <button class="btn btn-sm btn-danger" onclick="toggleEstadoCliente(${cliente.id})" title="${cliente.estado === 'activo' ? 'Desactivar' : 'Activar'}">
                            ${cliente.estado === 'activo' ? '🗑️' : '♻️'}
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Filtrar clientes
function filterClientes() {
    const searchTerm = document.getElementById('searchCliente').value.toLowerCase();
    const estadoFilter = document.getElementById('filterEstado').value;
    
    const filtered = clientes.filter(cliente => {
        const matchSearch = cliente.nombre.toLowerCase().includes(searchTerm) ||
                           (cliente.telefono && cliente.telefono.includes(searchTerm)) ||
                           (cliente.email && cliente.email.toLowerCase().includes(searchTerm));
        const matchEstado = !estadoFilter || cliente.estado === estadoFilter;
        
        return matchSearch && matchEstado;
    });
    
    renderClientes(filtered);
}

// Abrir modal crear/editar
function openModalCliente(id = null) {
    editingId = id;
    const modal = document.getElementById('modalCliente');
    const title = document.getElementById('modalClienteTitle');
    const form = document.getElementById('formCliente');
    
    form.reset();
    
    if (id) {
        title.textContent = 'Editar Cliente';
        const cliente = clientes.find(c => c.id == id);
        
        if (cliente) {
            document.getElementById('clienteId').value = cliente.id;
            document.getElementById('clienteNombre').value = cliente.nombre;
            document.getElementById('clienteTelefono').value = cliente.telefono || '';
            document.getElementById('clienteEmail').value = cliente.email || '';
            document.getElementById('clienteDireccion').value = cliente.direccion || '';
            document.getElementById('clienteNotas').value = cliente.notas || '';
        }
    } else {
        title.textContent = 'Nuevo Cliente';
        document.getElementById('clienteId').value = '';
    }
    
    modal.classList.add('active');
}

function closeModalCliente() {
    document.getElementById('modalCliente').classList.remove('active');
    editingId = null;
}

// Editar cliente
function editCliente(id) {
    openModalCliente(id);
}

// Guardar cliente
async function guardarCliente() {
    const form = document.getElementById('formCliente');
    
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const loadingOverlay = document.getElementById('loadingOverlay');
    loadingOverlay.classList.add('active');
    
    try {
        const id = document.getElementById('clienteId').value;
        const clienteData = {
            nombre: document.getElementById('clienteNombre').value,
            telefono: document.getElementById('clienteTelefono').value,
            email: document.getElementById('clienteEmail').value,
            direccion: document.getElementById('clienteDireccion').value,
            notas: document.getElementById('clienteNotas').value
        };
        
        if (id) {
            // Actualizar
            await sheetsClient.updateById(CONFIG.SHEETS.CLIENTES, id, clienteData);
            Utils.showNotification('Cliente actualizado correctamente', 'success');
        } else {
            // Crear nuevo
            const newId = await sheetsClient.getNextId(CONFIG.SHEETS.CLIENTES);
            const newRow = [
                newId,
                clienteData.nombre,
                clienteData.telefono,
                clienteData.email,
                clienteData.direccion,
                Utils.getCurrentDate(),
                'activo',
                clienteData.notas
            ];
            
            await sheetsClient.appendRows(CONFIG.SHEETS.CLIENTES, [newRow]);
            Utils.showNotification('Cliente creado correctamente', 'success');
        }
        
        closeModalCliente();
        await loadClientes();
        
    } catch (error) {
        console.error('Error guardando cliente:', error);
        Utils.showNotification('Error guardando cliente', 'error');
    } finally {
        loadingOverlay.classList.remove('active');
    }
}

// Cambiar estado del cliente
async function toggleEstadoCliente(id) {
    const cliente = clientes.find(c => c.id == id);
    if (!cliente) return;
    
    const nuevoEstado = cliente.estado === 'activo' ? 'inactivo' : 'activo';
    const accion = nuevoEstado === 'inactivo' ? 'desactivar' : 'activar';
    
    if (!await Utils.confirm(`¿Estás seguro de ${accion} este cliente?`)) {
        return;
    }
    
    const loadingOverlay = document.getElementById('loadingOverlay');
    loadingOverlay.classList.add('active');
    
    try {
        await sheetsClient.updateById(CONFIG.SHEETS.CLIENTES, id, {
            estado: nuevoEstado
        });
        
        Utils.showNotification(`Cliente ${accion === 'desactivar' ? 'desactivado' : 'activado'} correctamente`, 'success');
        await loadClientes();
        
    } catch (error) {
        console.error('Error cambiando estado:', error);
        Utils.showNotification('Error cambiando estado del cliente', 'error');
    } finally {
        loadingOverlay.classList.remove('active');
    }
}

// Ver detalle del cliente
async function verDetalleCliente(id) {
    const cliente = clientes.find(c => c.id == id);
    if (!cliente) return;
    
    const modal = document.getElementById('modalDetalleCliente');
    const title = document.getElementById('detalleClienteNombre');
    const content = document.getElementById('detalleClienteContent');
    
    title.textContent = cliente.nombre;
    
    // Obtener suscripciones activas del cliente
    const suscripcionesCliente = suscripciones.filter(s => 
        s.cliente_id == id && s.estado === 'activa'
    );
    
    let html = `
        <div class="mb-3">
            <h4>Información del Cliente</h4>
            <p><strong>Teléfono:</strong> ${cliente.telefono || '-'}</p>
            <p><strong>Email:</strong> ${cliente.email || '-'}</p>
            <p><strong>Dirección:</strong> ${cliente.direccion || '-'}</p>
            <p><strong>Fecha Registro:</strong> ${Utils.formatDate(cliente.fecha_registro)}</p>
            ${cliente.notas ? `<p><strong>Notas:</strong> ${cliente.notas}</p>` : ''}
        </div>
        
        <div>
            <h4>Suscripciones Activas (${suscripcionesCliente.length})</h4>
    `;
    
    if (suscripcionesCliente.length === 0) {
        html += '<p class="text-muted">No tiene suscripciones activas</p>';
    } else {
        html += '<div class="table-container"><table><thead><tr><th>Servicio</th><th>Perfil</th><th>Fecha Inicio</th><th>Fecha Fin</th><th>Días Restantes</th></tr></thead><tbody>';
        
        suscripcionesCliente.forEach(sus => {
            const servicio = servicios.find(s => s.id == sus.servicio_id);
            const perfil = perfiles.find(p => p.id == sus.perfil_id);
            const diasRestantes = Utils.getDaysRemaining(sus.fecha_fin);
            
            const urgenciaClass = diasRestantes <= 3 ? 'danger' : diasRestantes <= 7 ? 'warning' : 'success';
            
            html += `
                <tr>
                    <td>${servicio ? servicio.nombre : 'N/A'}</td>
                    <td>${perfil ? (perfil.nombre || 'Perfil ' + perfil.numero) : 'N/A'}</td>
                    <td>${Utils.formatDate(sus.fecha_inicio)}</td>
                    <td>${Utils.formatDate(sus.fecha_fin)}</td>
                    <td><span class="badge badge-${urgenciaClass}">${diasRestantes} días</span></td>
                </tr>
            `;
        });
        
        html += '</tbody></table></div>';
    }
    
    html += '</div>';
    
    content.innerHTML = html;
    modal.classList.add('active');
}

function closeModalDetalleCliente() {
    document.getElementById('modalDetalleCliente').classList.remove('active');
}

// Renderizar tabla de clientes - OPTIMIZADA PARA MÓVIL
function renderClientes(data) {
    const tbody = document.querySelector('#clientesTable tbody');
    
    if (data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-muted">No hay clientes registrados</td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = data.map(cliente => {
        const suscripcionesActivas = suscripciones.filter(s => 
            s.cliente_id == cliente.id && s.estado === 'activa'
        ).length;
        
        const estadoBadge = cliente.estado === 'activo' 
            ? '<span class="badge badge-success">Activo</span>'
            : '<span class="badge badge-secondary">Inactivo</span>';
        
        // Truncar nombre para móvil
        const nombreDisplay = cliente.nombre.length > 25 
            ? cliente.nombre.substring(0, 25) + '...' 
            : cliente.nombre;
        
        return `
            <tr>
                <td class="hide-mobile">${cliente.id}</td>
                <td>
                    <strong>${nombreDisplay}</strong>
                    <div class="show-mobile text-muted" style="font-size: 11px; margin-top: 4px;">
                        ${estadoBadge}
                    </div>
                </td>
                <td style="word-break: break-all;">${cliente.telefono || '-'}</td>
                <td class="hide-mobile" style="word-break: break-all; font-size: 11px;">${cliente.email || '-'}</td>
                <td class="hide-mobile">${Utils.formatDate(cliente.fecha_registro)}</td>
                <td>
                    <span class="badge badge-primary">${suscripcionesActivas}</span>
                </td>
                <td class="hide-mobile">${estadoBadge}</td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-sm btn-secondary" onclick="verDetalleCliente(${cliente.id})" title="Ver">👁️</button>
                        <button class="btn btn-sm btn-secondary" onclick="editCliente(${cliente.id})" title="Editar">✏️</button>
                        <button class="btn btn-sm btn-danger" onclick="toggleEstadoCliente(${cliente.id})" title="${cliente.estado === 'activo' ? 'Desactivar' : 'Activar'}">
                            ${cliente.estado === 'activo' ? '🗑️' : '♻️'}
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
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