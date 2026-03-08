// Servicios - Gestión de servicios
let servicios = [];
let editingId = null;

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
    if (!Auth.requireAuth()) return;
    
    const session = Auth.getSession();
    document.getElementById('userDisplay').textContent = `${session.usuario} (${session.rol})`;
    
    if (!Auth.isAdmin()) {
        document.getElementById('navCorreos').style.display = 'none';
        document.getElementById('btnNuevoServicio').style.display = 'none';
        document.getElementById('thCostoBase').style.display = 'none';
        document.getElementById('thAcciones').style.display = 'none';
    } else {
        document.getElementById('btnNuevoServicio').style.display = 'inline-flex';
        document.getElementById('thCostoBase').style.display = 'table-cell';
        document.getElementById('thAcciones').style.display = 'table-cell';
    }
    
    await loadServicios();
    await Utils.updateAlertBadge();
    
    // Event listeners para filtros
    document.getElementById('searchServicio').addEventListener('input', filterServicios);
    document.getElementById('filterTipo').addEventListener('change', filterServicios);
    document.getElementById('filterEstado').addEventListener('change', filterServicios);
    
    // Event listener para botón nuevo servicio
    document.getElementById('btnNuevoServicio').addEventListener('click', openModalServicio);
});

// Cargar servicios
async function loadServicios() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    loadingOverlay.classList.add('active');
    
    try {
        const values = await sheetsClient.readSheet(CONFIG.SHEETS.SERVICIOS);
        servicios = sheetsClient.parseSheetData(values);
        renderServicios(servicios);
    } catch (error) {
        console.error('Error cargando servicios:', error);
        Utils.showNotification('Error cargando servicios', 'error');
    } finally {
        loadingOverlay.classList.remove('active');
    }
}

// Renderizar tabla de servicios
function renderServicios(data) {
    const tbody = document.querySelector('#serviciosTable tbody');
    const isAdmin = Auth.isAdmin();
    
    if (data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="${isAdmin ? 9 : 7}" class="text-center text-muted">No hay servicios registrados</td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = data.map(servicio => {
        const estadoBadge = servicio.estado === 'activo' 
            ? '<span class="badge badge-success">Activo</span>'
            : '<span class="badge badge-secondary">Inactivo</span>';
        
        let html = `
            <tr>
                <td>${servicio.id}</td>
                <td><strong>${servicio.nombre}</strong></td>
                <td><span class="badge badge-primary">${servicio.tipo}</span></td>
                <td>${Utils.formatCurrency(servicio.precio_venta)}</td>
                <td>${servicio.duracion_dias} días</td>
                <td>${servicio.perfiles_max}</td>
        `;
        
        if (isAdmin) {
            html += `<td>${Utils.formatCurrency(servicio.costo_base)}</td>`;
        }
        
        html += `
                <td>${estadoBadge}</td>
        `;
        
        if (isAdmin) {
            html += `
                <td>
                    <div class="table-actions">
                        <button class="btn btn-sm btn-secondary" onclick="editServicio(${servicio.id})">✏️</button>
                        <button class="btn btn-sm btn-danger" onclick="toggleEstadoServicio(${servicio.id})">
                            ${servicio.estado === 'activo' ? '🗑️' : '♻️'}
                        </button>
                    </div>
                </td>
            `;
        }
        
        html += `</tr>`;
        return html;
    }).join('');
}

// Filtrar servicios
function filterServicios() {
    const searchTerm = document.getElementById('searchServicio').value.toLowerCase();
    const tipoFilter = document.getElementById('filterTipo').value;
    const estadoFilter = document.getElementById('filterEstado').value;
    
    const filtered = servicios.filter(servicio => {
        const matchSearch = servicio.nombre.toLowerCase().includes(searchTerm) ||
                           servicio.tipo.toLowerCase().includes(searchTerm);
        const matchTipo = !tipoFilter || servicio.tipo === tipoFilter;
        const matchEstado = !estadoFilter || servicio.estado === estadoFilter;
        
        return matchSearch && matchTipo && matchEstado;
    });
    
    renderServicios(filtered);
}

// Abrir modal crear/editar
function openModalServicio(id = null) {
    editingId = id;
    const modal = document.getElementById('modalServicio');
    const title = document.getElementById('modalServicioTitle');
    const form = document.getElementById('formServicio');
    
    form.reset();
    
    if (id) {
        title.textContent = 'Editar Servicio';
        const servicio = servicios.find(s => s.id == id);
        
        if (servicio) {
            document.getElementById('servicioId').value = servicio.id;
            document.getElementById('servicioNombre').value = servicio.nombre;
            document.getElementById('servicioTipo').value = servicio.tipo;
            document.getElementById('servicioPrecioVenta').value = servicio.precio_venta;
            document.getElementById('servicioCostoBase').value = servicio.costo_base;
            document.getElementById('servicioDuracion').value = servicio.duracion_dias;
            document.getElementById('servicioPerfilesMax').value = servicio.perfiles_max;
            document.getElementById('servicioVisiblePara').value = servicio.visible_para || 'todos';
            document.getElementById('servicioNotas').value = servicio.notas || '';
        }
    } else {
        title.textContent = 'Nuevo Servicio';
        document.getElementById('servicioId').value = '';
    }
    
    modal.classList.add('active');
}

function closeModalServicio() {
    document.getElementById('modalServicio').classList.remove('active');
    editingId = null;
}

// Editar servicio
function editServicio(id) {
    openModalServicio(id);
}

// Guardar servicio
async function guardarServicio() {
    const form = document.getElementById('formServicio');
    
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const loadingOverlay = document.getElementById('loadingOverlay');
    loadingOverlay.classList.add('active');
    
    try {
        const id = document.getElementById('servicioId').value;
        const servicioData = {
            nombre: document.getElementById('servicioNombre').value,
            tipo: document.getElementById('servicioTipo').value,
            precio_venta: document.getElementById('servicioPrecioVenta').value,
            costo_base: document.getElementById('servicioCostoBase').value,
            duracion_dias: document.getElementById('servicioDuracion').value,
            perfiles_max: document.getElementById('servicioPerfilesMax').value,
            visible_para: document.getElementById('servicioVisiblePara').value,
            notas: document.getElementById('servicioNotas').value
        };
        
        if (id) {
            // Actualizar
            await sheetsClient.updateById(CONFIG.SHEETS.SERVICIOS, id, servicioData);
            Utils.showNotification('Servicio actualizado correctamente', 'success');
        } else {
            // Crear nuevo
            const newId = await sheetsClient.getNextId(CONFIG.SHEETS.SERVICIOS);
            const newRow = [
                newId,
                servicioData.nombre,
                servicioData.tipo,
                servicioData.precio_venta,
                servicioData.costo_base,
                servicioData.duracion_dias,
                servicioData.perfiles_max,
                servicioData.visible_para,
                'activo',
                servicioData.notas
            ];
            
            await sheetsClient.appendRows(CONFIG.SHEETS.SERVICIOS, [newRow]);
            Utils.showNotification('Servicio creado correctamente', 'success');
        }
        
        closeModalServicio();
        await loadServicios();
        
    } catch (error) {
        console.error('Error guardando servicio:', error);
        Utils.showNotification('Error guardando servicio', 'error');
    } finally {
        loadingOverlay.classList.remove('active');
    }
}

// Cambiar estado del servicio
async function toggleEstadoServicio(id) {
    const servicio = servicios.find(s => s.id == id);
    if (!servicio) return;
    
    const nuevoEstado = servicio.estado === 'activo' ? 'inactivo' : 'activo';
    const accion = nuevoEstado === 'inactivo' ? 'desactivar' : 'activar';
    
    if (!await Utils.confirm(`¿Estás seguro de ${accion} este servicio?`)) {
        return;
    }
    
    const loadingOverlay = document.getElementById('loadingOverlay');
    loadingOverlay.classList.add('active');
    
    try {
        await sheetsClient.updateById(CONFIG.SHEETS.SERVICIOS, id, {
            estado: nuevoEstado
        });
        
        Utils.showNotification(`Servicio ${accion === 'desactivar' ? 'desactivado' : 'activado'} correctamente`, 'success');
        await loadServicios();
        
    } catch (error) {
        console.error('Error cambiando estado:', error);
        Utils.showNotification('Error cambiando estado del servicio', 'error');
    } finally {
        loadingOverlay.classList.remove('active');
    }
}

// Renderizar tabla de servicios - OPTIMIZADA PARA MÓVIL
function renderServicios(data) {
    const tbody = document.querySelector('#serviciosTable tbody');
    const isAdmin = Auth.isAdmin();
    
    if (data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="${isAdmin ? 9 : 7}" class="text-center text-muted">No hay servicios registrados</td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = data.map(servicio => {
        const estadoBadge = servicio.estado === 'activo' 
            ? '<span class="badge badge-success">Activo</span>'
            : '<span class="badge badge-secondary">Inactivo</span>';
        
        const tipoBadge = `<span class="badge badge-primary">${servicio.tipo}</span>`;
        
        let html = `
            <tr>
                <td class="hide-mobile">${servicio.id}</td>
                <td>
                    <strong>${servicio.nombre}</strong>
                    <div class="show-mobile text-muted" style="font-size: 11px; margin-top: 4px;">
                        ${tipoBadge} ${estadoBadge}
                    </div>
                </td>
                <td class="hide-mobile">${tipoBadge}</td>
                <td style="white-space: nowrap;">${Utils.formatCurrency(servicio.precio_venta)}</td>
                <td class="hide-mobile">${servicio.duracion_dias} días</td>
                <td>${servicio.perfiles_max}</td>
        `;
        
        if (isAdmin) {
            html += `<td class="hide-mobile">${Utils.formatCurrency(servicio.costo_base)}</td>`;
        }
        
        html += `<td class="hide-mobile">${estadoBadge}</td>`;
        
        if (isAdmin) {
            html += `
                <td>
                    <div class="table-actions">
                        <button class="btn btn-sm btn-secondary" onclick="editServicio(${servicio.id})">✏️</button>
                        <button class="btn btn-sm btn-danger" onclick="toggleEstadoServicio(${servicio.id})">
                            ${servicio.estado === 'activo' ? '🗑️' : '♻️'}
                        </button>
                    </div>
                </td>
            `;
        }
        
        html += `</tr>`;
        return html;
    }).join('');
}