// Alertas - Gestión de alertas de vencimiento
let alertas = [];
let perfiles = [];
let clientes = [];
let cuentas = [];
let servicios = [];
let suscripciones = [];

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
    if (!Auth.requireAuth()) return;
    
    const session = Auth.getSession();
    document.getElementById('userDisplay').textContent = `${session.usuario} (${session.rol})`;
    
    if (!Auth.isAdmin()) {
        document.getElementById('navCorreos').style.display = 'none';
    }
    
    // Mostrar días de alerta configurados
    document.getElementById('diasAlerta').textContent = CONFIG.APP.DIAS_ALERTA;
    
    await loadAlertas();
    await Utils.updateAlertBadge();
    
    // Event listeners para filtros
    document.getElementById('searchAlerta').addEventListener('input', filterAlertas);
    document.getElementById('filterServicio').addEventListener('change', filterAlertas);
    document.getElementById('filterUrgencia').addEventListener('change', filterAlertas);
});

// Cargar alertas
async function loadAlertas() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    loadingOverlay.classList.add('active');
    
    try {
        const [perfilesData, clientesData, cuentasData, serviciosData, suscripcionesData] = await Promise.all([
            sheetsClient.readSheet(CONFIG.SHEETS.PERFILES),
            sheetsClient.readSheet(CONFIG.SHEETS.CLIENTES),
            sheetsClient.readSheet(CONFIG.SHEETS.CUENTAS),
            sheetsClient.readSheet(CONFIG.SHEETS.SERVICIOS),
            sheetsClient.readSheet(CONFIG.SHEETS.SUSCRIPCIONES)
        ]);
        
        perfiles = sheetsClient.parseSheetData(perfilesData);
        clientes = sheetsClient.parseSheetData(clientesData);
        cuentas = sheetsClient.parseSheetData(cuentasData);
        servicios = sheetsClient.parseSheetData(serviciosData);
        suscripciones = sheetsClient.parseSheetData(suscripcionesData);
        
        // Calcular alertas
        calcularAlertas();
        
        // Poblar filtro de servicios
        populateServiciosFilter();
        
        renderAlertas(alertas);
        
    } catch (error) {
        console.error('Error cargando alertas:', error);
        Utils.showNotification('Error cargando alertas', 'error');
    } finally {
        loadingOverlay.classList.remove('active');
    }
}

// Calcular alertas desde perfiles
function calcularAlertas() {
    const alertDays = CONFIG.APP.DIAS_ALERTA;
    
    alertas = perfiles
        .filter(perfil => {
            if (perfil.estado !== 'ocupado' || !perfil.fecha_fin) return false;
            
            const daysRemaining = Utils.getDaysRemaining(perfil.fecha_fin);
            return daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= alertDays;
        })
        .map(perfil => {
            const cuenta = cuentas.find(c => c.id == perfil.cuenta_id);
            const servicio = cuenta ? servicios.find(s => s.id == cuenta.servicio_id) : null;
            const cliente = clientes.find(c => c.id == perfil.cliente_id);
            const suscripcion = suscripciones.find(s => s.perfil_id == perfil.id && s.estado === 'activa');
            
            const daysRemaining = Utils.getDaysRemaining(perfil.fecha_fin);
            
            return {
                perfil,
                cuenta,
                servicio,
                cliente,
                suscripcion,
                daysRemaining,
                urgencia: daysRemaining <= 3 ? 'critico' : 'urgente'
            };
        })
        .sort((a, b) => a.daysRemaining - b.daysRemaining);
}

// Poblar filtro de servicios
function populateServiciosFilter() {
    const select = document.getElementById('filterServicio');
    const serviciosUnicos = [...new Set(alertas.map(a => a.servicio?.id))].filter(Boolean);
    
    select.innerHTML = '<option value="">Todos los servicios</option>';
    serviciosUnicos.forEach(servicioId => {
        const servicio = servicios.find(s => s.id == servicioId);
        if (servicio) {
            const option = document.createElement('option');
            option.value = servicio.id;
            option.textContent = servicio.nombre;
            select.appendChild(option);
        }
    });
}

// Renderizar tabla de alertas - ACTUALIZADO SOLO WHATSAPP
function renderAlertas(data) {
    const tbody = document.querySelector('#alertasTable tbody');
    const emptyState = document.getElementById('emptyState');
    
    if (data.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    
    tbody.innerHTML = data.map(alerta => {
        const urgenciaBadge = alerta.urgencia === 'critico'
            ? '<span class="badge badge-danger">⚠️ CRÍTICO</span>'
            : '<span class="badge badge-warning">⏰ Urgente</span>';
        
        const clienteNombre = alerta.cliente ? 
            (alerta.cliente.nombre.length > 20 ? alerta.cliente.nombre.substring(0, 20) + '...' : alerta.cliente.nombre) 
            : 'N/A';
        
        // Verificar si el cliente tiene teléfono para WhatsApp
        const tieneWhatsApp = alerta.cliente && alerta.cliente.telefono;
        
        return `
            <tr>
                <td>${urgenciaBadge}</td>
                <td>
                    <strong style="font-size: 12px;">${clienteNombre}</strong>
                    <div class="show-mobile text-muted" style="font-size: 10px; margin-top: 4px;">
                        ${alerta.servicio ? alerta.servicio.nombre : 'N/A'}
                    </div>
                </td>
                <td class="hide-mobile" style="font-size: 11px;">${alerta.servicio ? alerta.servicio.nombre : 'N/A'}</td>
                <td class="hide-mobile" style="font-size: 11px;">Perfil #${alerta.perfil.numero}</td>
                <td style="white-space: nowrap; font-size: 11px;">
                    ${Utils.formatDate(alerta.perfil.fecha_fin)}
                    <div class="show-mobile">
                        <span class="badge badge-${alerta.urgencia === 'critico' ? 'danger' : 'warning'}" style="font-size: 9px; margin-top: 4px;">
                            ${alerta.daysRemaining} día${alerta.daysRemaining !== 1 ? 's' : ''}
                        </span>
                    </div>
                </td>
                <td class="hide-mobile">
                    <span class="badge badge-${alerta.urgencia === 'critico' ? 'danger' : 'warning'}">
                        ${alerta.daysRemaining} día${alerta.daysRemaining !== 1 ? 's' : ''}
                    </span>
                </td>
                <td class="hide-mobile" style="white-space: nowrap;">${alerta.suscripcion ? Utils.formatCurrency(alerta.suscripcion.precio) : '-'}</td>
                <td>
                    <div class="table-actions">
                        ${tieneWhatsApp ? `
                            <button class="btn btn-sm btn-info" onclick="notificarVencimientoWhatsApp(${alerta.cliente.id}, ${alerta.perfil.id}, ${alerta.daysRemaining}, '${Utils.formatDate(alerta.perfil.fecha_fin)}')" title="Notificar">
                                📱
                            </button>
                        ` : ''}
                        <button class="btn btn-sm btn-success" onclick="openRenovarModal(${alerta.perfil.id})" title="Renovar">
                            ✅
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="liberarPerfilAlerta(${alerta.perfil.id})" title="Liberar">
                            🗑️
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Función para notificar vencimiento por WhatsApp desde alertas
function notificarVencimientoWhatsApp(clienteId, perfilId, dias, fechaVenc) {
    const cliente = clientes.find(c => c.id == clienteId);
    const perfil = perfiles.find(p => p.id == perfilId);
    const cuenta = cuentas.find(c => c.id == perfil.cuenta_id);
    const servicio = servicios.find(s => s.id == cuenta.servicio_id);
    
    if (!cliente) {
        Utils.showNotification('Cliente no encontrado', 'error');
        return;
    }
    
    if (!cliente.telefono) {
        Utils.showNotification('El cliente no tiene teléfono registrado', 'warning');
        return;
    }
    
    const mensaje = notificationSystem.generarMensajeVencimiento(cliente, servicio, dias, fechaVenc);
    notificationSystem.mostrarModalWhatsApp(cliente, mensaje, '📱 Notificar Vencimiento por WhatsApp');
}

// Filtrar alertas
function filterAlertas() {
    const searchTerm = document.getElementById('searchAlerta').value.toLowerCase();
    const servicioFilter = document.getElementById('filterServicio').value;
    const urgenciaFilter = document.getElementById('filterUrgencia').value;
    
    const filtered = alertas.filter(alerta => {
        const matchSearch = (alerta.cliente && alerta.cliente.nombre.toLowerCase().includes(searchTerm)) ||
                           (alerta.servicio && alerta.servicio.nombre.toLowerCase().includes(searchTerm));
        const matchServicio = !servicioFilter || (alerta.servicio && alerta.servicio.id == servicioFilter);
        const matchUrgencia = !urgenciaFilter || alerta.urgencia === urgenciaFilter;
        
        return matchSearch && matchServicio && matchUrgencia;
    });
    
    renderAlertas(filtered);
}

// Abrir modal renovar
function openRenovarModal(perfilId) {
    const alerta = alertas.find(a => a.perfil.id == perfilId);
    if (!alerta) return;
    
    const modal = document.getElementById('modalRenovar');
    const info = document.getElementById('renovarInfo');
    
    info.innerHTML = `
        <div class="card" style="background: var(--bg-secondary);">
            <div class="card-body">
                <p><strong>Cliente:</strong> ${alerta.cliente ? alerta.cliente.nombre : 'N/A'}</p>
                <p><strong>Servicio:</strong> ${alerta.servicio ? alerta.servicio.nombre : 'N/A'}</p>
                <p><strong>Perfil:</strong> #${alerta.perfil.numero}</p>
                <p><strong>Vence:</strong> ${Utils.formatDate(alerta.perfil.fecha_fin)} 
                   <span class="badge badge-${alerta.urgencia === 'critico' ? 'danger' : 'warning'}">
                       ${alerta.daysRemaining} días
                   </span>
                </p>
            </div>
        </div>
    `;
    
    document.getElementById('renovarPerfilId').value = perfilId;
    document.getElementById('renovarClienteId').value = alerta.cliente ? alerta.cliente.id : '';
    document.getElementById('renovarServicioId').value = alerta.servicio ? alerta.servicio.id : '';
    
    // Prellenar precio y duración
    if (alerta.servicio) {
        document.getElementById('renovarPrecio').value = alerta.servicio.precio_venta;
        document.getElementById('renovarDias').value = alerta.servicio.duracion_dias;
    }
    
    modal.classList.add('active');
}

function closeModalRenovar() {
    document.getElementById('modalRenovar').classList.remove('active');
}

// Ejecutar renovación - ALERTAS CON WHATSAPP
async function ejecutarRenovacion() {
    const form = document.getElementById('formRenovar');
    
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const perfilId = document.getElementById('renovarPerfilId').value;
    const clienteId = document.getElementById('renovarClienteId').value;
    const servicioId = document.getElementById('renovarServicioId').value;
    const precio = document.getElementById('renovarPrecio').value;
    const diasAdicionales = document.getElementById('renovarDias').value;
    
    const loadingOverlay = document.getElementById('loadingOverlay');
    loadingOverlay.classList.add('active');
    
    try {
        const perfil = perfiles.find(p => p.id == perfilId);
        const cliente = clientes.find(c => c.id == clienteId);
        const servicio = servicios.find(s => s.id == servicioId);
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
        
        // 3. Crear movimiento
        const movimientoId = await sheetsClient.getNextId(CONFIG.SHEETS.MOVIMIENTOS);
        const movimientoRow = [
            movimientoId,
            'entrada',
            'renovacion',
            precio,
            clienteId,
            servicioId,
            'efectivo',
            Utils.getCurrentDate(),
            session.id,
            `Renovación ${servicio.nombre} - Perfil #${perfil.numero}`
        ];
        await sheetsClient.appendRows(CONFIG.SHEETS.MOVIMIENTOS, [movimientoRow]);
        
        Utils.showNotification('✅ Suscripción renovada correctamente', 'success');
        
        loadingOverlay.classList.remove('active');
        closeModalRenovar();
        
        // Notificar al cliente sobre renovación
        if (cliente && cliente.telefono) {
            setTimeout(() => {
                const mensaje = notificationSystem.generarMensajeRenovacion(
                    cliente,
                    servicio,
                    Utils.formatDate(nuevaFechaFin)
                );
                notificationSystem.mostrarModalWhatsApp(cliente, mensaje, '📱 Notificar Renovación por WhatsApp');
            }, 500);
        }
        
        await loadAlertas();
        await Utils.updateAlertBadge();
        
    } catch (error) {
        console.error('Error renovando:', error);
        Utils.showNotification('❌ Error renovando suscripción: ' + error.message, 'error');
        loadingOverlay.classList.remove('active');
    }
}

// Liberar perfil desde alertas - CON NOTIFICACIÓN
async function liberarPerfilAlerta(perfilId) {
    if (!await Utils.confirm('¿Estás seguro de liberar este perfil? Se cancelará la suscripción.')) {
        return;
    }
    
    const loadingOverlay = document.getElementById('loadingOverlay');
    loadingOverlay.classList.add('active');
    
    try {
        const perfil = perfiles.find(p => p.id == perfilId);
        const cliente = clientes.find(c => c.id == perfil.cliente_id);
        
        // Actualizar perfil
        await sheetsClient.updateById(CONFIG.SHEETS.PERFILES, perfilId, {
            estado: 'disponible',
            cliente_id: '',
            fecha_inicio: '',
            fecha_fin: '',
            nombre: '',
            pin: ''
        });
        
        // Cancelar suscripción
        const suscripcion = suscripciones.find(s => 
            s.perfil_id == perfilId && s.estado === 'activa'
        );
        
        if (suscripcion) {
            await sheetsClient.updateById(CONFIG.SHEETS.SUSCRIPCIONES, suscripcion.id, {
                estado: 'cancelada',
                fecha_fin: Utils.getCurrentDate()
            });
        }
        
        Utils.showNotification('✅ Perfil liberado correctamente', 'success');
        
        loadingOverlay.classList.remove('active');
        
        // Notificar al cliente que se ha liberado
        if (cliente && cliente.telefono) {
            setTimeout(() => {
                const mensaje = `ℹ️ *INFORMACIÓN IMPORTANTE*

Hola ${cliente.nombre} 👋

Tu suscripción ha sido cancelada y el perfil liberado.

Si deseas reactivar tu servicio, por favor contáctanos.

¡Gracias! 🎬
_Streaming Manager_`;
                notificationSystem.mostrarModalWhatsApp(cliente, mensaje, '📱 Notificar Cancelación por WhatsApp');
            }, 500);
        }
        
        await loadAlertas();
        await Utils.updateAlertBadge();
        
    } catch (error) {
        console.error('Error liberando perfil:', error);
        Utils.showNotification('❌ Error liberando perfil: ' + error.message, 'error');
        loadingOverlay.classList.remove('active');
    }
}

// Liberar perfil desde alertas
async function liberarPerfilAlerta(perfilId) {
    if (!await Utils.confirm('¿Estás seguro de liberar este perfil? Se cancelará la suscripción.')) {
        return;
    }
    
    const loadingOverlay = document.getElementById('loadingOverlay');
    loadingOverlay.classList.add('active');
    
    try {
        // Actualizar perfil
        await sheetsClient.updateById(CONFIG.SHEETS.PERFILES, perfilId, {
            estado: 'disponible',
            cliente_id: '',
            fecha_inicio: '',
            fecha_fin: '',
            nombre: '',
            pin: ''
        });
        
        // Cancelar suscripción
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
        
        await loadAlertas();
        await Utils.updateAlertBadge();
        
    } catch (error) {
        console.error('Error liberando perfil:', error);
        Utils.showNotification('Error liberando perfil', 'error');
    } finally {
        loadingOverlay.classList.remove('active');
    }
}

// Renderizar tabla de alertas - OPTIMIZADA PARA MÓVIL
function renderAlertas(data) {
    const tbody = document.querySelector('#alertasTable tbody');
    const emptyState = document.getElementById('emptyState');
    
    if (data.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    
    tbody.innerHTML = data.map(alerta => {
        const urgenciaBadge = alerta.urgencia === 'critico'
            ? '<span class="badge badge-danger">⚠️ CRÍTICO</span>'
            : '<span class="badge badge-warning">⏰ Urgente</span>';
        
        const clienteNombre = alerta.cliente ? 
            (alerta.cliente.nombre.length > 20 ? alerta.cliente.nombre.substring(0, 20) + '...' : alerta.cliente.nombre) 
            : 'N/A';
        
        const tieneWhatsApp = alerta.cliente && alerta.cliente.telefono;
        
        return `
            <tr>
                <td data-label="Urgencia">${urgenciaBadge}</td>
                <td data-label="Cliente">
                    <strong style="font-size: 12px;">${clienteNombre}</strong>
                    <div class="show-mobile text-muted" style="font-size: 10px; margin-top: 4px;">
                        ${alerta.servicio ? alerta.servicio.nombre : 'N/A'}
                    </div>
                </td>
                <td data-label="Servicio" class="hide-mobile" style="font-size: 11px;">${alerta.servicio ? alerta.servicio.nombre : 'N/A'}</td>
                <td data-label="Perfil" class="hide-mobile" style="font-size: 11px;">Perfil #${alerta.perfil.numero}</td>
                <td data-label="Vencimiento" style="white-space: nowrap; font-size: 11px;">
                    ${Utils.formatDate(alerta.perfil.fecha_fin)}
                    <div class="show-mobile">
                        <span class="badge badge-${alerta.urgencia === 'critico' ? 'danger' : 'warning'}" style="font-size: 9px; margin-top: 4px;">
                            ${alerta.daysRemaining} día${alerta.daysRemaining !== 1 ? 's' : ''}
                        </span>
                    </div>
                </td>
                <td data-label="Días" class="hide-mobile">
                    <span class="badge badge-${alerta.urgencia === 'critico' ? 'danger' : 'warning'}">
                        ${alerta.daysRemaining} día${alerta.daysRemaining !== 1 ? 's' : ''}
                    </span>
                </td>
                <td data-label="Precio" class="hide-mobile" style="white-space: nowrap;">${alerta.suscripcion ? Utils.formatCurrency(alerta.suscripcion.precio) : '-'}</td>
                <td data-label="Acciones" class="actions-cell">
                    <div class="table-actions" style="justify-content: center; gap: 6px;">
                        ${tieneWhatsApp ? `
                            <button class="btn btn-sm btn-info" onclick="notificarVencimientoWhatsApp(${alerta.cliente.id}, ${alerta.perfil.id}, ${alerta.daysRemaining}, '${Utils.formatDate(alerta.perfil.fecha_fin)}')" title="Notificar">
                                📱
                            </button>
                        ` : ''}
                        <button class="btn btn-sm btn-success" onclick="openRenovarModal(${alerta.perfil.id})" title="Renovar">
                            ✅
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="liberarPerfilAlerta(${alerta.perfil.id})" title="Liberar">
                            🗑️
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}