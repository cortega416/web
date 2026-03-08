// Correos - Gestión de correos (solo admin)
let correos = [];
let cuentas = [];
let editingId = null;

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
    // Verificar que sea admin
    if (!Auth.requireAdmin()) return;
    
    const session = Auth.getSession();
    document.getElementById('userDisplay').textContent = `${session.usuario} (${session.rol})`;
    
    await loadCorreos();
    await Utils.updateAlertBadge();
    
    // Event listeners para filtros
    document.getElementById('searchCorreo').addEventListener('input', filterCorreos);
    document.getElementById('filterEstado').addEventListener('change', filterCorreos);
});

// Cargar correos
async function loadCorreos() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    loadingOverlay.classList.add('active');
    
    try {
        const [correosData, cuentasData] = await Promise.all([
            sheetsClient.readSheet(CONFIG.SHEETS.CORREOS),
            sheetsClient.readSheet(CONFIG.SHEETS.CUENTAS)
        ]);
        
        correos = sheetsClient.parseSheetData(correosData);
        cuentas = sheetsClient.parseSheetData(cuentasData);
        
        renderCorreos(correos);
    } catch (error) {
        console.error('Error cargando correos:', error);
        Utils.showNotification('Error cargando correos', 'error');
    } finally {
        loadingOverlay.classList.remove('active');
    }
}

// Renderizar tabla de correos
function renderCorreos(data) {
    const tbody = document.querySelector('#correosTable tbody');
    
    if (data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted">No hay correos registrados</td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = data.map(correo => {
        // Contar cuentas asociadas
        const cuentasAsociadas = cuentas.filter(c => c.correo_id == correo.id).length;
        
        const estadoBadge = correo.estado === 'activo' 
            ? '<span class="badge badge-success">Activo</span>'
            : '<span class="badge badge-secondary">Inactivo</span>';
        
        const tipoBadge = correo.tipo === 'principal' 
            ? '<span class="badge badge-primary">Principal</span>'
            : correo.tipo === 'secundario'
            ? '<span class="badge badge-info">Secundario</span>'
            : '<span class="badge badge-warning">Temporal</span>';
        
        return `
            <tr>
                <td>${correo.id}</td>
                <td><strong>${correo.email}</strong></td>
                <td>
                    <span style="font-family: monospace;">
                        ${correo.password ? '•'.repeat(8) : '-'}
                    </span>
                    ${correo.password ? `<button class="btn btn-sm btn-secondary" onclick="mostrarPassword('${correo.password}')" title="Ver contraseña">👁️</button>` : ''}
                </td>
                <td>${tipoBadge}</td>
                <td>
                    <span class="badge badge-secondary">${cuentasAsociadas}</span>
                </td>
                <td>${estadoBadge}</td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-sm btn-secondary" onclick="editCorreo(${correo.id})" title="Editar">✏️</button>
                        <button class="btn btn-sm btn-danger" onclick="toggleEstadoCorreo(${correo.id})" title="${correo.estado === 'activo' ? 'Desactivar' : 'Activar'}">
                            ${correo.estado === 'activo' ? '🗑️' : '♻️'}
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Mostrar contraseña
function mostrarPassword(password) {
    alert('Contraseña: ' + password);
}

// Filtrar correos
function filterCorreos() {
    const searchTerm = document.getElementById('searchCorreo').value.toLowerCase();
    const estadoFilter = document.getElementById('filterEstado').value;
    
    const filtered = correos.filter(correo => {
        const matchSearch = correo.email.toLowerCase().includes(searchTerm);
        const matchEstado = !estadoFilter || correo.estado === estadoFilter;
        
        return matchSearch && matchEstado;
    });
    
    renderCorreos(filtered);
}

// Abrir modal crear/editar
function openModalCorreo(id = null) {
    editingId = id;
    const modal = document.getElementById('modalCorreo');
    const title = document.getElementById('modalCorreoTitle');
    const form = document.getElementById('formCorreo');
    
    form.reset();
    
    if (id) {
        title.textContent = 'Editar Correo';
        const correo = correos.find(c => c.id == id);
        
        if (correo) {
            document.getElementById('correoId').value = correo.id;
            document.getElementById('correoEmail').value = correo.email;
            document.getElementById('correoPassword').value = correo.password || '';
            document.getElementById('correoTipo').value = correo.tipo || 'principal';
            document.getElementById('correoRecuperacion').value = correo.email_recuperacion || '';
            document.getElementById('correoNotas').value = correo.notas || '';
        }
    } else {
        title.textContent = 'Nuevo Correo';
        document.getElementById('correoId').value = '';
    }
    
    modal.classList.add('active');
}

function closeModalCorreo() {
    document.getElementById('modalCorreo').classList.remove('active');
    editingId = null;
}

// Editar correo
function editCorreo(id) {
    openModalCorreo(id);
}

// Guardar correo
async function guardarCorreo() {
    const form = document.getElementById('formCorreo');
    
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const loadingOverlay = document.getElementById('loadingOverlay');
    loadingOverlay.classList.add('active');
    
    try {
        const id = document.getElementById('correoId').value;
        const correoData = {
            email: document.getElementById('correoEmail').value,
            password: document.getElementById('correoPassword').value,
            tipo: document.getElementById('correoTipo').value,
            email_recuperacion: document.getElementById('correoRecuperacion').value,
            notas: document.getElementById('correoNotas').value
        };
        
        if (id) {
            // Actualizar
            await sheetsClient.updateById(CONFIG.SHEETS.CORREOS, id, correoData);
            Utils.showNotification('Correo actualizado correctamente', 'success');
        } else {
            // Crear nuevo
            const newId = await sheetsClient.getNextId(CONFIG.SHEETS.CORREOS);
            const newRow = [
                newId,
                correoData.email,
                correoData.password,
                correoData.tipo,
                correoData.email_recuperacion,
                'activo',
                correoData.notas
            ];
            
            await sheetsClient.appendRows(CONFIG.SHEETS.CORREOS, [newRow]);
            Utils.showNotification('Correo creado correctamente', 'success');
        }
        
        closeModalCorreo();
        await loadCorreos();
        
    } catch (error) {
        console.error('Error guardando correo:', error);
        Utils.showNotification('Error guardando correo', 'error');
    } finally {
        loadingOverlay.classList.remove('active');
    }
}

// Cambiar estado del correo
async function toggleEstadoCorreo(id) {
    const correo = correos.find(c => c.id == id);
    if (!correo) return;
    
    const nuevoEstado = correo.estado === 'activo' ? 'inactivo' : 'activo';
    const accion = nuevoEstado === 'inactivo' ? 'desactivar' : 'activar';
    
    if (!await Utils.confirm(`¿Estás seguro de ${accion} este correo?`)) {
        return;
    }
    
    const loadingOverlay = document.getElementById('loadingOverlay');
    loadingOverlay.classList.add('active');
    
    try {
        await sheetsClient.updateById(CONFIG.SHEETS.CORREOS, id, {
            estado: nuevoEstado
        });
        
        Utils.showNotification(`Correo ${accion === 'desactivar' ? 'desactivado' : 'activado'} correctamente`, 'success');
        await loadCorreos();
        
    } catch (error) {
        console.error('Error cambiando estado:', error);
        Utils.showNotification('Error cambiando estado del correo', 'error');
    } finally {
        loadingOverlay.classList.remove('active');
    }
}

// Renderizar tabla de correos - OPTIMIZADA PARA MÓVIL
function renderCorreos(data) {
    const tbody = document.querySelector('#correosTable tbody');
    
    if (data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted">No hay correos registrados</td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = data.map(correo => {
        const cuentasAsociadas = cuentas.filter(c => c.correo_id == correo.id).length;
        
        const estadoBadge = correo.estado === 'activo' 
            ? '<span class="badge badge-success">Activo</span>'
            : '<span class="badge badge-secondary">Inactivo</span>';
        
        const tipoBadge = correo.tipo === 'principal' 
            ? '<span class="badge badge-primary">Principal</span>'
            : correo.tipo === 'secundario'
            ? '<span class="badge badge-info">Secundario</span>'
            : '<span class="badge badge-warning">Temporal</span>';
        
        // Truncar email para móvil
        const emailDisplay = correo.email.length > 25 
            ? correo.email.substring(0, 25) + '...' 
            : correo.email;
        
        return `
            <tr>
                <td class="hide-mobile">${correo.id}</td>
                <td style="word-break: break-all; font-size: 12px;">
                    <strong>${emailDisplay}</strong>
                    <div class="show-mobile" style="margin-top: 4px;">
                        ${tipoBadge} ${estadoBadge}
                    </div>
                </td>
                <td style="white-space: nowrap;">
                    <span style="font-family: monospace; font-size: 11px;">
                        ${correo.password ? '••••••' : '-'}
                    </span>
                    ${correo.password ? `<button class="btn btn-sm btn-secondary" onclick="mostrarPassword('${correo.password}')" title="Ver">👁️</button>` : ''}
                </td>
                <td class="hide-mobile">${tipoBadge}</td>
                <td>
                    <span class="badge badge-secondary">${cuentasAsociadas}</span>
                </td>
                <td class="hide-mobile">${estadoBadge}</td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-sm btn-secondary" onclick="editCorreo(${correo.id})">✏️</button>
                        <button class="btn btn-sm btn-danger" onclick="toggleEstadoCorreo(${correo.id})">
                            ${correo.estado === 'activo' ? '🗑️' : '♻️'}
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}