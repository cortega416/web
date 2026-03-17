// Exportación de datos a PDF y Excel
// Usar jsPDF y SheetJS (xlsx)

// Cargar librerías dinámicamente
function loadExportLibraries() {
    return new Promise((resolve, reject) => {
        // Cargar jsPDF
        const scriptPDF = document.createElement('script');
        scriptPDF.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        scriptPDF.onload = () => {
            // Cargar jsPDF AutoTable
            const scriptAutoTable = document.createElement('script');
            scriptAutoTable.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.6.0/jspdf.plugin.autotable.min.js';
            scriptAutoTable.onload = () => {
                // Cargar SheetJS
                const scriptXLSX = document.createElement('script');
                scriptXLSX.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
                scriptXLSX.onload = resolve;
                scriptXLSX.onerror = reject;
                document.head.appendChild(scriptXLSX);
            };
            scriptAutoTable.onerror = reject;
            document.head.appendChild(scriptAutoTable);
        };
        scriptPDF.onerror = reject;
        document.head.appendChild(scriptPDF);
    });
}

// Exportar dashboard completo
async function exportarDashboard() {
    const options = `
        <div style="text-align: left; padding: 20px;">
            <h3 style="margin-bottom: 20px;">Selecciona el formato de exportación:</h3>
            <button onclick="exportarDashboardPDF()" class="btn btn-danger" style="width: 100%; margin-bottom: 10px;">
                📄 Exportar a PDF
            </button>
            <button onclick="exportarDashboardExcel()" class="btn btn-success" style="width: 100%;">
                📊 Exportar a Excel
            </button>
        </div>
    `;
    
    // Crear modal personalizado
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.innerHTML = `
        <div class="modal" style="max-width: 400px;">
            <div class="modal-header">
                <h3>Exportar Dashboard</h3>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
            </div>
            <div class="modal-body">
                ${options}
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Exportar a PDF
async function exportarDashboardPDF() {
    try {
        await loadExportLibraries();
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        const session = Auth.getSession();
        const fecha = new Date().toLocaleDateString('es-ES');
        
        // Título
        doc.setFontSize(20);
        doc.setTextColor(79, 70, 229);
        doc.text('🎬 Streaming Manager', 14, 20);
        
        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text(`Reporte del Dashboard`, 14, 28);
        doc.text(`Fecha: ${fecha}`, 14, 34);
        doc.text(`Usuario: ${session.usuario}`, 14, 40);
        
        doc.setDrawColor(79, 70, 229);
        doc.setLineWidth(0.5);
        doc.line(14, 42, 196, 42);
        
        let yPosition = 50;
        
        // Estadísticas principales
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text('📊 Estadísticas Generales', 14, yPosition);
        yPosition += 10;
        
        const totalServicios = cachedData.servicios.filter(s => s.estado === 'activo').length;
        const totalClientes = cachedData.clientes.filter(c => c.estado === 'activo').length;
        const suscripcionesActivas = cachedData.suscripciones.filter(s => s.estado === 'activa').length;
        
        const hoy = new Date();
        const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
        const ingresosMes = cachedData.movimientos
            .filter(m => m.tipo === 'entrada' && m.fecha >= inicioMes)
            .reduce((sum, m) => sum + parseFloat(m.monto || 0), 0);
        
        const perfilesOcupados = cachedData.perfiles.filter(p => p.estado === 'ocupado').length;
        const perfilesTotal = perfiles.length;
        const porcentajeOcupacion = perfilesTotal > 0 ? Math.round((perfilesOcupados / perfilesTotal) * 100) : 0;
        
        doc.setFontSize(11);
        doc.setTextColor(60);
        doc.text(`Servicios Activos: ${totalServicios}`, 20, yPosition);
        yPosition += 7;
        doc.text(`Clientes Activos: ${totalClientes}`, 20, yPosition);
        yPosition += 7;
        doc.text(`Suscripciones Activas: ${suscripcionesActivas}`, 20, yPosition);
        yPosition += 7;
        
        if (Auth.isAdmin()) {
            doc.text(`Ingresos del Mes: ${Utils.formatCurrency(ingresosMes)}`, 20, yPosition);
            yPosition += 7;
        }
        
        doc.text(`Ocupación: ${porcentajeOcupacion}% (${perfilesOcupados}/${perfilesTotal} perfiles)`, 20, yPosition);
        yPosition += 15;
        
        // Actividad reciente
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text('🕐 Actividad Reciente', 14, yPosition);
        yPosition += 10;
        
        const movimientosRecientes = cachedData.movimientos
            .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
            .slice(0, 10);
        
        const tableData = movimientosRecientes.map(mov => {
            const cliente = cachedData.clientes.find(c => c.id == mov.cliente_id);
            const servicio = cachedData.servicios.find(s => s.id == mov.servicio_id);
            
            return [
                Utils.formatDate(mov.fecha),
                mov.tipo === 'entrada' ? 'Entrada' : 'Salida',
                cliente ? cliente.nombre : '-',
                servicio ? servicio.nombre : '-',
                Utils.formatCurrency(mov.monto)
            ];
        });
        
        doc.autoTable({
            startY: yPosition,
            head: [['Fecha', 'Tipo', 'Cliente', 'Servicio', 'Monto']],
            body: tableData,
            theme: 'striped',
            headStyles: {
                fillColor: [79, 70, 229],
                textColor: 255,
                fontSize: 10,
                fontStyle: 'bold'
            },
            styles: {
                fontSize: 9,
                cellPadding: 3
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252]
            }
        });
        
        // Pie de página
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(9);
            doc.setTextColor(150);
            doc.text(
                `Página ${i} de ${pageCount}`,
                doc.internal.pageSize.width / 2,
                doc.internal.pageSize.height - 10,
                { align: 'center' }
            );
        }
        
        // Guardar PDF
        doc.save(`Dashboard_${fecha.replace(/\//g, '-')}.pdf`);
        
        Utils.showNotification('Dashboard exportado a PDF correctamente', 'success');
        document.querySelector('.modal-overlay').remove();
        
    } catch (error) {
        console.error('Error exportando a PDF:', error);
        Utils.showNotification('Error al exportar a PDF', 'error');
    }
}

// Exportar a Excel
async function exportarDashboardExcel() {
    try {
        await loadExportLibraries();
        
        const fecha = new Date().toLocaleDateString('es-ES');
        
        // Preparar datos de estadísticas
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
        
        // Hoja 1: Estadísticas
        const statsData = [
            ['Streaming Manager - Reporte Dashboard'],
            [`Fecha: ${fecha}`],
            [],
            ['Estadísticas Generales'],
            ['Métrica', 'Valor'],
            ['Servicios Activos', totalServicios],
            ['Clientes Activos', totalClientes],
            ['Suscripciones Activas', suscripcionesActivas],
            ['Ingresos del Mes', ingresosMes],
            ['Ocupación', `${porcentajeOcupacion}%`],
            ['Perfiles Ocupados', perfilesOcupados],
            ['Perfiles Totales', perfilesTotal]
        ];
        
        // Hoja 2: Actividad Reciente
        const movimientosRecientes = cachedData.movimientos
            .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
            .slice(0, 50);
        
        const activityData = [
            ['Fecha', 'Tipo', 'Categoría', 'Cliente', 'Servicio', 'Monto']
        ];
        
        movimientosRecientes.forEach(mov => {
            const cliente = cachedData.clientes.find(c => c.id == mov.cliente_id);
            const servicio = cachedData.servicios.find(s => s.id == mov.servicio_id);
            
            activityData.push([
                mov.fecha,
                mov.tipo,
                mov.categoria,
                cliente ? cliente.nombre : '-',
                servicio ? servicio.nombre : '-',
                parseFloat(mov.monto)
            ]);
        });
        
        // Hoja 3: Alertas
        const today = new Date();
        const alertDays = CONFIG.APP.DIAS_ALERTA;
        
        const alertasData = [
            ['Cliente', 'Servicio', 'Perfil', 'Fecha Vencimiento', 'Días Restantes', 'Estado']
        ];
        
        cachedData.perfiles
            .filter(perfil => {
                if (perfil.estado !== 'ocupado' || !perfil.fecha_fin) return false;
                const daysRemaining = Utils.getDaysRemaining(perfil.fecha_fin);
                return daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= alertDays;
            })
            .forEach(perfil => {
                const cliente = cachedData.clientes.find(c => c.id == perfil.cliente_id);
                const cuenta = cachedData.cuentas.find(c => c.id == perfil.cuenta_id);
                const servicio = cuenta ? cachedData.servicios.find(s => s.id == cuenta.servicio_id) : null;
                const daysRemaining = Utils.getDaysRemaining(perfil.fecha_fin);
                
                alertasData.push([
                    cliente ? cliente.nombre : 'N/A',
                    servicio ? servicio.nombre : 'N/A',
                    `Perfil #${perfil.numero}`,
                    perfil.fecha_fin,
                    daysRemaining,
                    daysRemaining <= 3 ? 'CRÍTICO' : 'Urgente'
                ]);
            });
        
        // Crear libro de Excel
        const wb = XLSX.utils.book_new();
        
        // Agregar hojas
        const ws1 = XLSX.utils.aoa_to_sheet(statsData);
        const ws2 = XLSX.utils.aoa_to_sheet(activityData);
        const ws3 = XLSX.utils.aoa_to_sheet(alertasData);
        
        XLSX.utils.book_append_sheet(wb, ws1, 'Estadísticas');
        XLSX.utils.book_append_sheet(wb, ws2, 'Actividad Reciente');
        XLSX.utils.book_append_sheet(wb, ws3, 'Alertas');
        
        // Guardar archivo
        XLSX.writeFile(wb, `Dashboard_${fecha.replace(/\//g, '-')}.xlsx`);
        
        Utils.showNotification('Dashboard exportado a Excel correctamente', 'success');
        document.querySelector('.modal-overlay').remove();
        
    } catch (error) {
        console.error('Error exportando a Excel:', error);
        Utils.showNotification('Error al exportar a Excel', 'error');
    }
}

// Exportar tabla específica a Excel
function exportarTablaExcel(tableId, nombreArchivo) {
    loadExportLibraries().then(() => {
        const table = document.getElementById(tableId);
        const wb = XLSX.utils.table_to_book(table, { sheet: "Datos" });
        XLSX.writeFile(wb, `${nombreArchivo}_${new Date().toISOString().split('T')[0]}.xlsx`);
        Utils.showNotification('Datos exportados correctamente', 'success');
    }).catch(error => {
        console.error('Error:', error);
        Utils.showNotification('Error al exportar datos', 'error');
    });
}