// Correos - Gestión de correos (solo admin)
let correos = [];
let cuentas = [];
let editingId = null;

function getCorreoField(correo, field) {
    return String((correo && correo[field]) || '');
}

function getPasswordParam(password) {
    return JSON.stringify(String(password || ''));
}

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
        
        filterCorreos();
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
                        <button class="btn btn-sm btn-secondary" onclick="editCorreo(${correo.id})" title="Editar"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-sm btn-danger" onclick="toggleEstadoCorreo(${correo.id})" title="${correo.estado === 'activo' ? 'Desactivar' : 'Activar'}">
                            <i class="fas fa-${correo.estado === 'activo' ? 'trash' : 'undo'}"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Render seguro final: evita que filas incompletas rompan la vista Correos.
function renderCorreos(data) {
    const tbody = document.querySelector('#correosTable tbody');
    
    if (!tbody) return;
    
    if (!Array.isArray(data) || data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted">No hay correos registrados</td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = data.map(correo => {
        const id = getCorreoField(correo, 'id');
        const email = getCorreoField(correo, 'email');
        const password = getCorreoField(correo, 'password');
        const estado = getCorreoField(correo, 'estado') || 'activo';
        const tipo = getCorreoField(correo, 'tipo') || 'principal';
        const cuentasAsociadas = cuentas.filter(cuenta => Utils.sameId(cuenta.correo_id, id)).length;
        
        const estadoBadge = estado === 'activo'
            ? '<span class="badge badge-success">Activo</span>'
            : '<span class="badge badge-secondary">Inactivo</span>';
        
        const tipoBadge = tipo === 'principal'
            ? '<span class="badge badge-primary">Principal</span>'
            : tipo === 'secundario'
            ? '<span class="badge badge-info">Secundario</span>'
            : '<span class="badge badge-warning">Temporal</span>';
        
        const emailDisplay = email.length > 25 ? `${email.substring(0, 25)}...` : email;
        const editAction = id ? `editCorreo(${id})` : '';
        const toggleAction = id ? `toggleEstadoCorreo(${id})` : '';
        
        return `
            <tr>
                <td class="hide-mobile">${id || '-'}</td>
                <td style="word-break: break-all; font-size: 12px;">
                    <strong>${emailDisplay || '-'}</strong>
                    <div class="show-mobile" style="margin-top: 4px;">
                        ${tipoBadge} ${estadoBadge}
                    </div>
                </td>
                <td style="white-space: nowrap;">
                    <span style="font-family: monospace; font-size: 11px;">${password ? '******' : '-'}</span>
                    ${password ? `<button class="btn btn-sm btn-secondary" onclick='mostrarPassword(${getPasswordParam(password)})' title="Ver">Ver</button>` : ''}
                </td>
                <td class="hide-mobile">${tipoBadge}</td>
                <td><span class="badge badge-secondary">${cuentasAsociadas}</span></td>
                <td class="hide-mobile">${estadoBadge}</td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-sm btn-secondary" onclick="${editAction}" title="Editar"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-sm btn-danger" onclick="${toggleAction}" title="${estado === 'activo' ? 'Desactivar' : 'Activar'}">
                            <i class="fas fa-${estado === 'activo' ? 'trash' : 'undo'}"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Render seguro final: evita que filas incompletas rompan la vista Correos.
function renderCorreos(data) {
    const tbody = document.querySelector('#correosTable tbody');
    
    if (!tbody) return;
    
    if (!Array.isArray(data) || data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted">No hay correos registrados</td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = data.map(correo => {
        const id = getCorreoField(correo, 'id');
        const email = getCorreoField(correo, 'email');
        const password = getCorreoField(correo, 'password');
        const estado = getCorreoField(correo, 'estado') || 'activo';
        const tipo = getCorreoField(correo, 'tipo') || 'principal';
        const cuentasAsociadas = cuentas.filter(cuenta => Utils.sameId(cuenta.correo_id, id)).length;
        
        const estadoBadge = estado === 'activo'
            ? '<span class="badge badge-success">Activo</span>'
            : '<span class="badge badge-secondary">Inactivo</span>';
        
        const tipoBadge = tipo === 'principal'
            ? '<span class="badge badge-primary">Principal</span>'
            : tipo === 'secundario'
            ? '<span class="badge badge-info">Secundario</span>'
            : '<span class="badge badge-warning">Temporal</span>';
        
        const emailDisplay = email.length > 25 ? `${email.substring(0, 25)}...` : email;
        const editAction = id ? `editCorreo(${id})` : '';
        const toggleAction = id ? `toggleEstadoCorreo(${id})` : '';
        
        return `
            <tr>
                <td class="hide-mobile">${id || '-'}</td>
                <td style="word-break: break-all; font-size: 12px;">
                    <strong>${emailDisplay || '-'}</strong>
                    <div class="show-mobile" style="margin-top: 4px;">
                        ${tipoBadge} ${estadoBadge}
                    </div>
                </td>
                <td style="white-space: nowrap;">
                    <span style="font-family: monospace; font-size: 11px;">${password ? '******' : '-'}</span>
                    ${password ? `<button class="btn btn-sm btn-secondary" onclick='mostrarPassword(${getPasswordParam(password)})' title="Ver">Ver</button>` : ''}
                </td>
                <td class="hide-mobile">${tipoBadge}</td>
                <td><span class="badge badge-secondary">${cuentasAsociadas}</span></td>
                <td class="hide-mobile">${estadoBadge}</td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-sm btn-secondary" onclick="${editAction}" title="Editar"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-sm btn-danger" onclick="${toggleAction}" title="${estado === 'activo' ? 'Desactivar' : 'Activar'}">
                            <i class="fas fa-${estado === 'activo' ? 'trash' : 'undo'}"></i>
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
        const email = getCorreoField(correo, 'email');
        const estado = getCorreoField(correo, 'estado');
        const matchSearch = email.toLowerCase().includes(searchTerm);
        const matchEstado = !estadoFilter || estado === estadoFilter;
        
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
            const correoExistente = correos.find(correo =>
                Utils.normalizeKey(correo.email) === Utils.normalizeKey(correoData.email)
            );
            
            if (correoExistente) {
                await sheetsClient.updateById(CONFIG.SHEETS.CORREOS, correoExistente.id, {
                    ...correoData,
                    estado: correoExistente.estado || 'activo'
                });
                
                Utils.showNotification(`Correo existente actualizado con ID ${correoExistente.id}`, 'success');
                closeModalCorreo();
                await loadCorreos();
                return;
            }
            
            // Crear nuevo
            const newId = await sheetsClient.getNextId(CONFIG.SHEETS.CORREOS);
            
            await sheetsClient.appendObjects(CONFIG.SHEETS.CORREOS, [{
                id: newId,
                email: correoData.email,
                password: correoData.password,
                tipo: correoData.tipo,
                email_recuperacion: correoData.email_recuperacion,
                estado: 'activo',
                notas: correoData.notas
            }]);
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
        const email = getCorreoField(correo, 'email');
        const password = getCorreoField(correo, 'password');
        const emailDisplay = email.length > 25 
            ? email.substring(0, 25) + '...' 
            : email;
        
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
                        <button class="btn btn-sm btn-secondary" onclick="editCorreo(${correo.id})" title="Editar"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-sm btn-danger" onclick="toggleEstadoCorreo(${correo.id})" title="${correo.estado === 'activo' ? 'Desactivar' : 'Activar'}">
                            <i class="fas fa-${correo.estado === 'activo' ? 'trash' : 'undo'}"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}
