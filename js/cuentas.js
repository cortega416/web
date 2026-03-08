// Cuentas - Gestión de cuentas y perfiles
let cuentas = [];
let servicios = [];
let correos = [];
let perfiles = [];
let clientes = [];
let suscripciones = [];
let editingId = null;
let currentCuentaId = null;
let currentPerfilId = null;

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
    if (!Auth.requireAuth()) return;
    
    const session = Auth.getSession();
    document.getElementById('userDisplay').textContent = `${session.usuario} (${session.rol})`;
    
    if (!Auth.isAdmin()) {
        document.getElementById('navCorreos').style.display = 'none';
        document.getElementById('btnNuevaCuenta').style.display = 'none';
    }
    
    await loadCuentas();
    await Utils.updateAlertBadge();
    
    // Event listeners para filtros
    document.getElementById('searchCuenta').addEventListener('input', filterCuentas);
    document.getElementById('filterServicio').addEventListener('change', filterCuentas);
    document.getElementById('filterEstado').addEventListener('change', filterCuentas);
});

// Cargar cuentas
async function loadCuentas() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    loadingOverlay.classList.add('active');
    
    try {
        const [cuentasData, serviciosData, correosData, perfilesData, clientesData, suscripcionesData] = await Promise.all([
            sheetsClient.readSheet(CONFIG.SHEETS.CUENTAS),
            sheetsClient.readSheet(CONFIG.SHEETS.SERVICIOS),
            sheetsClient.readSheet(CONFIG.SHEETS.CORREOS),
            sheetsClient.readSheet(CONFIG.SHEETS.PERFILES),
            sheetsClient.readSheet(CONFIG.SHEETS.CLIENTES),
            sheetsClient.readSheet(CONFIG.SHEETS.SUSCRIPCIONES)
        ]);
        
        cuentas = sheetsClient.parseSheetData(cuentasData);
        servicios = sheetsClient.parseSheetData(serviciosData);
        correos = sheetsClient.parseSheetData(correosData);
        perfiles = sheetsClient.parseSheetData(perfilesData);
        clientes = sheetsClient.parseSheetData(clientesData);
        suscripciones = sheetsClient.parseSheetData(suscripcionesData);
        
        // Poblar select de filtro de servicios
        populateServiciosFilter();
        
        renderCuentas(cuentas);
    } catch (error) {
        console.error('Error cargando cuentas:', error);
        Utils.showNotification('Error cargando cuentas', 'error');
    } finally {
        loadingOverlay.classList.remove('active');
    }
}

// Poblar select de servicios en filtro
function populateServiciosFilter() {
    const select = document.getElementById('filterServicio');
    const serviciosActivos = servicios.filter(s => s.estado === 'activo');
    
    select.innerHTML = '<option value="">Todos los servicios</option>';
    serviciosActivos.forEach(servicio => {
        const option = document.createElement('option');
        option.value = servicio.id;
        option.textContent = servicio.nombre;
        select.appendChild(option);
    });
}

// Renderizar tabla de cuentas
function renderCuentas(data) {
    const tbody = document.querySelector('#cuentasTable tbody');
    
    if (data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-muted">No hay cuentas registradas</td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = data.map(cuenta => {
        const servicio = servicios.find(s => s.id == cuenta.servicio_id);
        const correo = correos.find(c => c.id == cuenta.correo_id);
        
        // Contar perfiles
        const perfilesCuenta = perfiles.filter(p => p.cuenta_id == cuenta.id);
        const perfilesOcupados = perfilesCuenta.filter(p => p.estado === 'ocupado').length;
        const perfilesTotal = perfilesCuenta.length;
        
        const estadoBadge = cuenta.estado === 'activa' 
            ? '<span class="badge badge-success">Activa</span>'
            : '<span class="badge badge-secondary">Inactiva</span>';
        
        return `
            <tr>
                <td>${cuenta.id}</td>
                <td><strong>${servicio ? servicio.nombre : 'N/A'}</strong></td>
                <td>${cuenta.usuario}</td>
                <td>${correo ? correo.email : '-'}</td>
                <td>
                    <span class="badge ${perfilesOcupados === perfilesTotal ? 'badge-danger' : 'badge-success'}">
                        ${perfilesOcupados}/${perfilesTotal}
                    </span>
                </td>
                <td>${Utils.formatDate(cuenta.fecha_creacion)}</td>
                <td>${estadoBadge}</td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-sm btn-primary" onclick="verPerfiles(${cuenta.id})" title="Ver Perfiles">👁️</button>
                        ${Auth.isAdmin() ? `
                            <button class="btn btn-sm btn-secondary" onclick="editCuenta(${cuenta.id})" title="Editar">✏️</button>
                            <button class="btn btn-sm btn-danger" onclick="toggleEstadoCuenta(${cuenta.id})" title="${cuenta.estado === 'activa' ? 'Desactivar' : 'Activar'}">
                                ${cuenta.estado === 'activa' ? '🗑️' : '♻️'}
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Filtrar cuentas
function filterCuentas() {
    const searchTerm = document.getElementById('searchCuenta').value.toLowerCase();
    const servicioFilter = document.getElementById('filterServicio').value;
    const estadoFilter = document.getElementById('filterEstado').value;
    
    const filtered = cuentas.filter(cuenta => {
        const servicio = servicios.find(s => s.id == cuenta.servicio_id);
        
        const matchSearch = cuenta.usuario.toLowerCase().includes(searchTerm) ||
                           (servicio && servicio.nombre.toLowerCase().includes(searchTerm));
        const matchServicio = !servicioFilter || cuenta.servicio_id == servicioFilter;
        const matchEstado = !estadoFilter || cuenta.estado === estadoFilter;
        
        return matchSearch && matchServicio && matchEstado;
    });
    
    renderCuentas(filtered);
}

// Abrir modal crear/editar cuenta
async function openModalCuenta(id = null) {
    editingId = id;
    const modal = document.getElementById('modalCuenta');
    const title = document.getElementById('modalCuentaTitle');
    const form = document.getElementById('formCuenta');
    
    form.reset();
    
    // Poblar selects
    await populateServiciosSelect();
    await populateCorreosSelect();
    
    if (id) {
        title.textContent = 'Editar Cuenta';
        const cuenta = cuentas.find(c => c.id == id);
        
        if (cuenta) {
            document.getElementById('cuentaId').value = cuenta.id;
            document.getElementById('cuentaServicio').value = cuenta.servicio_id;
            document.getElementById('cuentaUsuario').value = cuenta.usuario;
            document.getElementById('cuentaPassword').value = cuenta.password;
            document.getElementById('cuentaCorreo').value = cuenta.correo_id || '';
            document.getElementById('cuentaNotas').value = cuenta.notas || '';
        }
    } else {
        title.textContent = 'Nueva Cuenta';
        document.getElementById('cuentaId').value = '';
    }
    
    modal.classList.add('active');
}

function closeModalCuenta() {
    document.getElementById('modalCuenta').classList.remove('active');
    editingId = null;
}

// Poblar select de servicios
async function populateServiciosSelect() {
    const select = document.getElementById('cuentaServicio');
    const serviciosActivos = servicios.filter(s => s.estado === 'activo');
    
    select.innerHTML = '<option value="">Seleccionar...</option>';
    serviciosActivos.forEach(servicio => {
        // Verificar visibilidad según rol
        if (servicio.visible_para === 'admin' && !Auth.isAdmin()) {
            return;
        }
        
        const option = document.createElement('option');
        option.value = servicio.id;
        option.textContent = servicio.nombre;
        select.appendChild(option);
    });
}

// Poblar select de correos
async function populateCorreosSelect() {
    const select = document.getElementById('cuentaCorreo');
    const correosActivos = correos.filter(c => c.estado === 'activo');
    
    select.innerHTML = '<option value="">Ninguno</option>';
    correosActivos.forEach(correo => {
        const option = document.createElement('option');
        option.value = correo.id;
        option.textContent = correo.email;
        select.appendChild(option);
    });
}

// Editar cuenta
function editCuenta(id) {
    openModalCuenta(id);
}

// Guardar cuenta
async function guardarCuenta() {
    const form = document.getElementById('formCuenta');
    
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const loadingOverlay = document.getElementById('loadingOverlay');
    loadingOverlay.classList.add('active');
    
    try {
        const id = document.getElementById('cuentaId').value;
        const cuentaData = {
            servicio_id: document.getElementById('cuentaServicio').value,
            usuario: document.getElementById('cuentaUsuario').value,
            password: document.getElementById('cuentaPassword').value,
            correo_id: document.getElementById('cuentaCorreo').value || '',
            notas: document.getElementById('cuentaNotas').value
        };
        
        if (id) {
            // Actualizar
            await sheetsClient.updateById(CONFIG.SHEETS.CUENTAS, id, cuentaData);
            Utils.showNotification('Cuenta actualizada correctamente', 'success');
        } else {
            // Crear nueva cuenta
            const newId = await sheetsClient.getNextId(CONFIG.SHEETS.CUENTAS);
            const servicio = servicios.find(s => s.id == cuentaData.servicio_id);
            
            const newRow = [
                newId,
                cuentaData.servicio_id,
                cuentaData.usuario,
                cuentaData.password,
                cuentaData.correo_id,
                Utils.getCurrentDate(),
                'activa',
                cuentaData.notas
            ];
            
            await sheetsClient.appendRows(CONFIG.SHEETS.CUENTAS, [newRow]);
            
            // Crear perfiles automáticamente
            if (servicio) {
                const perfilesMax = parseInt(servicio.perfiles_max) || 1;
                const perfilesRows = [];
                
                for (let i = 1; i <= perfilesMax; i++) {
                    const perfilId = await sheetsClient.getNextId(CONFIG.SHEETS.PERFILES);
                    perfilesRows.push([
                        perfilId + (i - 1),
                        newId,
                        i,
                        '',  // nombre
                        '',  // pin
                        'disponible',
                        '',  // cliente_id
                        '',  // fecha_inicio
                        '',  // fecha_fin
                        ''   // notas
                    ]);
                }
                
                await sheetsClient.appendRows(CONFIG.SHEETS.PERFILES, perfilesRows);
            }
            
            Utils.showNotification('Cuenta y perfiles creados correctamente', 'success');
        }
        
        closeModalCuenta();
        await loadCuentas();
        
    } catch (error) {
        console.error('Error guardando cuenta:', error);
        Utils.showNotification('Error guardando cuenta', 'error');
    } finally {
        loadingOverlay.classList.remove('active');
    }
}

// Cambiar estado de la cuenta
async function toggleEstadoCuenta(id) {
    const cuenta = cuentas.find(c => c.id == id);
    if (!cuenta) return;
    
    const nuevoEstado = cuenta.estado === 'activa' ? 'inactiva' : 'activa';
    const accion = nuevoEstado === 'inactiva' ? 'desactivar' : 'activar';
    
    if (!await Utils.confirm(`¿Estás seguro de ${accion} esta cuenta?`)) {
        return;
    }
    
    const loadingOverlay = document.getElementById('loadingOverlay');
    loadingOverlay.classList.add('active');
    
    try {
        await sheetsClient.updateById(CONFIG.SHEETS.CUENTAS, id, {
            estado: nuevoEstado
        });
        
        Utils.showNotification(`Cuenta ${accion === 'desactivar' ? 'desactivada' : 'activada'} correctamente`, 'success');
        await loadCuentas();
        
    } catch (error) {
        console.error('Error cambiando estado:', error);
        Utils.showNotification('Error cambiando estado de la cuenta', 'error');
    } finally {
        loadingOverlay.classList.remove('active');
    }
}

// Ver perfiles de una cuenta
async function verPerfiles(cuentaId) {
    currentCuentaId = cuentaId;
    const cuenta = cuentas.find(c => c.id == cuentaId);
    if (!cuenta) return;
    
    const servicio = servicios.find(s => s.id == cuenta.servicio_id);
    const perfilesCuenta = perfiles.filter(p => p.cuenta_id == cuentaId);
    
    const modal = document.getElementById('modalPerfiles');
    const title = document.getElementById('modalPerfilesTitle');
    const content = document.getElementById('perfilesContent');
    
    title.textContent = `Perfiles - ${servicio ? servicio.nombre : 'N/A'}`;
    
    let html = `
        <div class="mb-3">
            <p><strong>Cuenta:</strong> ${cuenta.usuario}</p>
            <p><strong>Total Perfiles:</strong> ${perfilesCuenta.length}</p>
        </div>
        
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Nombre/PIN</th>
                        <th>Estado</th>
                        <th>Cliente</th>
                        <th>Vencimiento</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    perfilesCuenta.forEach(perfil => {
        const cliente = clientes.find(c => c.id == perfil.cliente_id);
        const estadoBadge = perfil.estado === 'disponible'
            ? '<span class="badge badge-success">Disponible</span>'
            : '<span class="badge badge-warning">Ocupado</span>';
        
        const diasRestantes = perfil.fecha_fin ? Utils.getDaysRemaining(perfil.fecha_fin) : null;
        const urgenciaClass = diasRestantes !== null && diasRestantes <= 7 ? 'text-warning' : '';
        
        html += `
            <tr>
                <td>${perfil.numero}</td>
                <td>
                    ${perfil.nombre || '-'}
                    ${perfil.pin ? `<br><small>PIN: ${perfil.pin}</small>` : ''}
                </td>
                <td>${estadoBadge}</td>
                <td>${cliente ? cliente.nombre : '-'}</td>
                <td class="${urgenciaClass}">
                    ${perfil.fecha_fin ? Utils.formatDate(perfil.fecha_fin) : '-'}
                    ${diasRestantes !== null ? `<br><small>${diasRestantes} días</small>` : ''}
                </td>
                <td>
                    <div class="table-actions">
        `;
        
        if (perfil.estado === 'disponible') {
            html += `<button class="btn btn-sm btn-success" onclick="asignarPerfil(${perfil.id})">Asignar</button>`;
        } else {
            html += `
                <button class="btn btn-sm btn-warning" onclick="renovarPerfil(${perfil.id})">Renovar</button>
                <button class="btn btn-sm btn-danger" onclick="liberarPerfil(${perfil.id})">Liberar</button>
            `;
        }
        
        html += `
                        <button class="btn btn-sm btn-secondary" onclick="editarPerfil(${perfil.id})">✏️</button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    content.innerHTML = html;
    modal.classList.add('active');
}

function closeModalPerfiles() {
    document.getElementById('modalPerfiles').classList.remove('active');
    currentCuentaId = null;
}

// Continuaré en el siguiente mensaje con las funciones de asignar, renovar, liberar y editar perfil...

// CONTINUACIÓN DE CUENTAS.JS

// Asignar perfil a cliente
async function asignarPerfil(perfilId) {
    currentPerfilId = perfilId;
    const perfil = perfiles.find(p => p.id == perfilId);
    if (!perfil) return;
    
    const cuenta = cuentas.find(c => c.id == perfil.cuenta_id);
    const servicio = cuenta ? servicios.find(s => s.id == cuenta.servicio_id) : null;
    
    // Abrir modal de acción
    const modal = document.getElementById('modalAccionPerfil');
    const title = document.getElementById('modalAccionPerfilTitle');
    
    title.textContent = 'Asignar Perfil a Cliente';
    document.getElementById('accionPerfilId').value = perfilId;
    document.getElementById('accionTipo').value = 'asignar';
    
    // Mostrar solo formulario de asignar
    document.getElementById('formAsignar').style.display = 'block';
    document.getElementById('formRenovar').style.display = 'none';
    document.getElementById('formEditar').style.display = 'none';
    
    // Poblar select de clientes
    const selectCliente = document.getElementById('asignarCliente');
    const clientesActivos = clientes.filter(c => c.estado === 'activo');
    selectCliente.innerHTML = '<option value="">Seleccionar...</option>';
    clientesActivos.forEach(cliente => {
        const option = document.createElement('option');
        option.value = cliente.id;
        option.textContent = cliente.nombre;
        selectCliente.appendChild(option);
    });
    
    // Prellenar precio y duración del servicio
    if (servicio) {
        document.getElementById('asignarPrecio').value = servicio.precio_venta;
        document.getElementById('asignarDuracion').value = servicio.duracion_dias;
    }
    
    modal.classList.add('active');
}

// Renovar perfil
async function renovarPerfil(perfilId) {
    currentPerfilId = perfilId;
    const perfil = perfiles.find(p => p.id == perfilId);
    if (!perfil) return;
    
    const cuenta = cuentas.find(c => c.id == perfil.cuenta_id);
    const servicio = cuenta ? servicios.find(s => s.id == cuenta.servicio_id) : null;
    
    const modal = document.getElementById('modalAccionPerfil');
    const title = document.getElementById('modalAccionPerfilTitle');
    
    title.textContent = 'Renovar Suscripción';
    document.getElementById('accionPerfilId').value = perfilId;
    document.getElementById('accionTipo').value = 'renovar';
    
    // Mostrar solo formulario de renovar
    document.getElementById('formAsignar').style.display = 'none';
    document.getElementById('formRenovar').style.display = 'block';
    document.getElementById('formEditar').style.display = 'none';
    
    // Prellenar precio y duración del servicio
    if (servicio) {
        document.getElementById('renovarPrecio').value = servicio.precio_venta;
        document.getElementById('renovarDias').value = servicio.duracion_dias;
    }
    
    modal.classList.add('active');
}

// Liberar perfil
async function liberarPerfil(perfilId) {
    if (!await Utils.confirm('¿Estás seguro de liberar este perfil? Se cancelará la suscripción actual.')) {
        return;
    }
    
    const loadingOverlay = document.getElementById('loadingOverlay');
    loadingOverlay.classList.add('active');
    
    try {
        const perfil = perfiles.find(p => p.id == perfilId);
        
        // Actualizar perfil a disponible
        await sheetsClient.updateById(CONFIG.SHEETS.PERFILES, perfilId, {
            estado: 'disponible',
            cliente_id: '',
            fecha_inicio: '',
            fecha_fin: '',
            nombre: '',
            pin: ''
        });
        
        // Buscar suscripción activa y cancelarla
        const suscripcion = suscripciones.find(s => 
            s.perfil_id == perfilId && s.estado === 'activa'
        );
        
        if (suscripcion) {
            await sheetsClient.updateById(CONFIG.SHEETS.SUSCRIPCIONES, suscripcion.id, {
                estado: 'cancelada',
                fecha_fin: Utils.getCurrentDate()
            });
        }
        
        Utils.showNotification('Perfil liberado correctamente', 'success');
        
        // Recargar datos
        await loadCuentas();
        
        // Reabrir modal de perfiles
        if (currentCuentaId) {
            await verPerfiles(currentCuentaId);
        }
        
    } catch (error) {
        console.error('Error liberando perfil:', error);
        Utils.showNotification('Error liberando perfil', 'error');
    } finally {
        loadingOverlay.classList.remove('active');
    }
}

// Editar información del perfil
async function editarPerfil(perfilId) {
    currentPerfilId = perfilId;
    const perfil = perfiles.find(p => p.id == perfilId);
    if (!perfil) return;
    
    const modal = document.getElementById('modalAccionPerfil');
    const title = document.getElementById('modalAccionPerfilTitle');
    
    title.textContent = 'Editar Perfil';
    document.getElementById('accionPerfilId').value = perfilId;
    document.getElementById('accionTipo').value = 'editar';
    
    // Mostrar solo formulario de editar
    document.getElementById('formAsignar').style.display = 'none';
    document.getElementById('formRenovar').style.display = 'none';
    document.getElementById('formEditar').style.display = 'block';
    
    // Prellenar datos
    document.getElementById('editarNombre').value = perfil.nombre || '';
    document.getElementById('editarPin').value = perfil.pin || '';
    document.getElementById('editarFechaInicio').value = perfil.fecha_inicio || '';
    document.getElementById('editarFechaFin').value = perfil.fecha_fin || '';
    
    modal.classList.add('active');
}

function closeModalAccionPerfil() {
    document.getElementById('modalAccionPerfil').classList.remove('active');
    currentPerfilId = null;
}

// Ejecutar acción de perfil (asignar, renovar, editar)
async function ejecutarAccionPerfil() {
    const accionTipo = document.getElementById('accionTipo').value;
    const perfilId = document.getElementById('accionPerfilId').value;
    
    if (accionTipo === 'asignar') {
        await ejecutarAsignacion(perfilId);
    } else if (accionTipo === 'renovar') {
        await ejecutarRenovacion(perfilId);
    } else if (accionTipo === 'editar') {
        await ejecutarEdicion(perfilId);
    }
}

// Ejecutar asignación
async function ejecutarAsignacion(perfilId) {
    const form = document.getElementById('formAccionPerfil');
    
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const clienteId = document.getElementById('asignarCliente').value;
    const precio = document.getElementById('asignarPrecio').value;
    const duracion = document.getElementById('asignarDuracion').value;
    
    if (!clienteId) {
        alert('Debe seleccionar un cliente');
        return;
    }
    
    const loadingOverlay = document.getElementById('loadingOverlay');
    loadingOverlay.classList.add('active');
    
    try {
        const perfil = perfiles.find(p => p.id == perfilId);
        const cuenta = cuentas.find(c => c.id == perfil.cuenta_id);
        const servicio = servicios.find(s => s.id == cuenta.servicio_id);
        const session = Auth.getSession();
        
        const fechaInicio = Utils.getCurrentDate();
        const fechaFin = Utils.addDays(fechaInicio, parseInt(duracion));
        
        // 1. Actualizar perfil
        await sheetsClient.updateById(CONFIG.SHEETS.PERFILES, perfilId, {
            estado: 'ocupado',
            cliente_id: clienteId,
            fecha_inicio: fechaInicio,
            fecha_fin: fechaFin
        });
        
        // 2. Crear suscripción
        const suscripcionId = await sheetsClient.getNextId(CONFIG.SHEETS.SUSCRIPCIONES);
        const suscripcionRow = [
            suscripcionId,
            clienteId,
            servicio.id,
            cuenta.id,
            perfilId,
            fechaInicio,
            fechaFin,
            precio,
            'activa'
        ];
        await sheetsClient.appendRows(CONFIG.SHEETS.SUSCRIPCIONES, [suscripcionRow]);
        
        // 3. Crear movimiento (entrada)
        const movimientoId = await sheetsClient.getNextId(CONFIG.SHEETS.MOVIMIENTOS);
        const movimientoRow = [
            movimientoId,
            'entrada',
            'venta',
            precio,
            clienteId,
            servicio.id,
            'efectivo',
            fechaInicio,
            session.id,
            `Venta de ${servicio.nombre} - Perfil #${perfil.numero}`
        ];
        await sheetsClient.appendRows(CONFIG.SHEETS.MOVIMIENTOS, [movimientoRow]);
        
        Utils.showNotification('Perfil asignado correctamente', 'success');
        
        closeModalAccionPerfil();
        await loadCuentas();
        
        if (currentCuentaId) {
            await verPerfiles(currentCuentaId);
        }
        
    } catch (error) {
        console.error('Error asignando perfil:', error);
        Utils.showNotification('Error asignando perfil', 'error');
    } finally {
        loadingOverlay.classList.remove('active');
    }
}

// Ejecutar renovación
async function ejecutarRenovacion(perfilId) {
    const form = document.getElementById('formAccionPerfil');
    
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const precio = document.getElementById('renovarPrecio').value;
    const diasAdicionales = document.getElementById('renovarDias').value;
    
    const loadingOverlay = document.getElementById('loadingOverlay');
    loadingOverlay.classList.add('active');
    
    try {
        const perfil = perfiles.find(p => p.id == perfilId);
        const cuenta = cuentas.find(c => c.id == perfil.cuenta_id);
        const servicio = servicios.find(s => s.id == cuenta.servicio_id);
        const session = Auth.getSession();
        
        // Calcular nueva fecha de fin
        const fechaFinActual = perfil.fecha_fin || Utils.getCurrentDate();
        const nuevaFechaFin = Utils.addDays(fechaFinActual, parseInt(diasAdicionales));
        
        // 1. Actualizar perfil
        await sheetsClient.updateById(CONFIG.SHEETS.PERFILES, perfilId, {
            fecha_fin: nuevaFechaFin
        });
        
        // 2. Actualizar suscripción activa
        const suscripcion = suscripciones.find(s => 
            s.perfil_id == perfilId && s.estado === 'activa'
        );
        
        if (suscripcion) {
            await sheetsClient.updateById(CONFIG.SHEETS.SUSCRIPCIONES, suscripcion.id, {
                fecha_fin: nuevaFechaFin
            });
        }
        
        // 3. Crear movimiento (entrada por renovación)
        const movimientoId = await sheetsClient.getNextId(CONFIG.SHEETS.MOVIMIENTOS);
        const movimientoRow = [
            movimientoId,
            'entrada',
            'renovacion',
            precio,
            perfil.cliente_id,
            servicio.id,
            'efectivo',
            Utils.getCurrentDate(),
            session.id,
            `Renovación ${servicio.nombre} - Perfil #${perfil.numero}`
        ];
        await sheetsClient.appendRows(CONFIG.SHEETS.MOVIMIENTOS, [movimientoRow]);
        
        Utils.showNotification('Perfil renovado correctamente', 'success');
        
        closeModalAccionPerfil();
        await loadCuentas();
        
        if (currentCuentaId) {
            await verPerfiles(currentCuentaId);
        }
        
    } catch (error) {
        console.error('Error renovando perfil:', error);
        Utils.showNotification('Error renovando perfil', 'error');
    } finally {
        loadingOverlay.classList.remove('active');
    }
}

// Ejecutar edición
async function ejecutarEdicion(perfilId) {
    const loadingOverlay = document.getElementById('loadingOverlay');
    loadingOverlay.classList.add('active');
    
    try {
        const perfilData = {
            nombre: document.getElementById('editarNombre').value,
            pin: document.getElementById('editarPin').value,
            fecha_inicio: document.getElementById('editarFechaInicio').value,
            fecha_fin: document.getElementById('editarFechaFin').value
        };
        
        await sheetsClient.updateById(CONFIG.SHEETS.PERFILES, perfilId, perfilData);
        
        Utils.showNotification('Perfil actualizado correctamente', 'success');
        
        closeModalAccionPerfil();
        await loadCuentas();
        
        if (currentCuentaId) {
            await verPerfiles(currentCuentaId);
        }
        
    } catch (error) {
        console.error('Error editando perfil:', error);
        Utils.showNotification('Error editando perfil', 'error');
    } finally {
        loadingOverlay.classList.remove('active');
    }
}