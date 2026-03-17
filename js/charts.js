// Gráficos con Chart.js
let chartIngresos, chartServicios, chartOcupacion, chartTopServicios;

// Configuración global de Chart.js
Chart.defaults.font.family = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
Chart.defaults.font.size = 13;
Chart.defaults.color = '#475569';

// Crear gráfico de ingresos vs gastos
function createIngresosChart(labels, ingresos, gastos) {
    const ctx = document.getElementById('chartIngresos');
    
    if (chartIngresos) {
        chartIngresos.destroy();
    }
    
    chartIngresos = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Ingresos',
                    data: ingresos,
                    borderColor: '#10B981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    pointBackgroundColor: '#10B981',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                },
                {
                    label: 'Gastos',
                    data: gastos,
                    borderColor: '#EF4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    pointBackgroundColor: '#EF4444',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 15,
                        font: {
                            size: 13,
                            weight: '600'
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    padding: 12,
                    titleFont: {
                        size: 14,
                        weight: 'bold'
                    },
                    bodyFont: {
                        size: 13
                    },
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + Utils.formatCurrency(context.parsed.y);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + value;
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// Crear gráfico de distribución de servicios
function createServiciosChart(labels, data, colors) {
    const ctx = document.getElementById('chartServicios');
    
    if (chartServicios) {
        chartServicios.destroy();
    }
    
    chartServicios = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderColor: '#fff',
                borderWidth: 3,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'right',
                    labels: {
                        usePointStyle: true,
                        padding: 15,
                        font: {
                            size: 12,
                            weight: '600'
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    padding: 12,
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.parsed / total) * 100).toFixed(1);
                            return context.label + ': ' + context.parsed + ' (' + percentage + '%)';
                        }
                    }
                }
            }
        }
    });
}

// Crear gráfico de ocupación
function createOcupacionChart(labels, ocupados, disponibles) {
    const ctx = document.getElementById('chartOcupacion');
    
    if (chartOcupacion) {
        chartOcupacion.destroy();
    }
    
    chartOcupacion = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Ocupados',
                    data: ocupados,
                    backgroundColor: 'rgba(79, 70, 229, 0.8)',
                    borderColor: '#4F46E5',
                    borderWidth: 2,
                    borderRadius: 6
                },
                {
                    label: 'Disponibles',
                    data: disponibles,
                    backgroundColor: 'rgba(16, 185, 129, 0.8)',
                    borderColor: '#10B981',
                    borderWidth: 2,
                    borderRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 15,
                        font: {
                            size: 13,
                            weight: '600'
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    padding: 12,
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    stacked: false,
                    ticks: {
                        stepSize: 1
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    stacked: false,
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// Crear gráfico de top servicios
function createTopServiciosChart(labels, data) {
    const ctx = document.getElementById('chartTopServicios');
    
    if (chartTopServicios) {
        chartTopServicios.destroy();
    }
    
    const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(79, 70, 229, 0.8)');
    gradient.addColorStop(1, 'rgba(139, 92, 246, 0.8)');
    
    chartTopServicios = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Ingresos',
                data: data,
                backgroundColor: gradient,
                borderColor: '#4F46E5',
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    padding: 12,
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            return 'Ingresos: ' + Utils.formatCurrency(context.parsed.x);
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + value;
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                y: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// Actualizar todos los gráficos
async function updateCharts() {
    const periodo = parseInt(document.getElementById('chartPeriodo')?.value || 30);
    
    try {
        // Calcular datos para gráfico de ingresos vs gastos
        const fechaInicio = new Date();
        fechaInicio.setDate(fechaInicio.getDate() - periodo);
        
        const labels = [];
        const ingresos = [];
        const gastos = [];
        
        // Generar labels de fechas
        for (let i = 0; i < periodo; i++) {
            const fecha = new Date();
            fecha.setDate(fecha.getDate() - (periodo - 1 - i));
            labels.push(fecha.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }));
            
            const fechaStr = fecha.toISOString().split('T')[0];
            
            // Calcular ingresos del día
            const ingresoDia = cachedData.movimientos
                .filter(m => m.tipo === 'entrada' && m.fecha === fechaStr)
                .reduce((sum, m) => sum + parseFloat(m.monto || 0), 0);
            ingresos.push(ingresoDia);
            
            // Calcular gastos del día
            const gastoDia = cachedData.movimientos
                .filter(m => m.tipo === 'salida' && m.fecha === fechaStr)
                .reduce((sum, m) => sum + parseFloat(m.monto || 0), 0);
            gastos.push(gastoDia);
        }
        
        createIngresosChart(labels, ingresos, gastos);
        
        // Gráfico de distribución de servicios (suscripciones activas)
        const serviciosCount = {};
        cachedData.suscripciones
            .filter(s => s.estado === 'activa')
            .forEach(sus => {
                const servicio = cachedData.servicios.find(s => s.id == sus.servicio_id);
                if (servicio) {
                    serviciosCount[servicio.nombre] = (serviciosCount[servicio.nombre] || 0) + 1;
                }
            });
        
        const serviciosLabels = Object.keys(serviciosCount);
        const serviciosData = Object.values(serviciosCount);
        const serviciosColors = [
            'rgba(79, 70, 229, 0.8)',
            'rgba(139, 92, 246, 0.8)',
            'rgba(16, 185, 129, 0.8)',
            'rgba(245, 158, 11, 0.8)',
            'rgba(239, 68, 68, 0.8)',
            'rgba(6, 182, 212, 0.8)'
        ];
        
        createServiciosChart(serviciosLabels, serviciosData, serviciosColors);
        
        // Gráfico de ocupación por servicio
        const ocupacionData = {};
        cachedData.servicios
            .filter(s => s.estado === 'activo')
            .slice(0, 5)
            .forEach(servicio => {
                const cuentasServicio = cachedData.cuentas.filter(c => c.servicio_id == servicio.id);
                const perfilesServicio = cuentasServicio.flatMap(cuenta => 
                    cachedData.perfiles.filter(p => p.cuenta_id == cuenta.id)
                );
                
                ocupacionData[servicio.nombre] = {
                    ocupados: perfilesServicio.filter(p => p.estado === 'ocupado').length,
                    disponibles: perfilesServicio.filter(p => p.estado === 'disponible').length
                };
            });
        
        const ocupacionLabels = Object.keys(ocupacionData);
        const ocupados = ocupacionLabels.map(label => ocupacionData[label].ocupados);
        const disponibles = ocupacionLabels.map(label => ocupacionData[label].disponibles);
        
        createOcupacionChart(ocupacionLabels, ocupados, disponibles);
        
        // Top 5 servicios por ingresos
        const ingresosPorServicio = {};
        cachedData.movimientos
            .filter(m => m.tipo === 'entrada' && m.servicio_id)
            .forEach(mov => {
                const servicio = cachedData.servicios.find(s => s.id == mov.servicio_id);
                if (servicio) {
                    ingresosPorServicio[servicio.nombre] = (ingresosPorServicio[servicio.nombre] || 0) + parseFloat(mov.monto || 0);
                }
            });
        
        const topServicios = Object.entries(ingresosPorServicio)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        
        const topLabels = topServicios.map(s => s[0]);
        const topData = topServicios.map(s => s[1]);
        
        createTopServiciosChart(topLabels, topData);
        
    } catch (error) {
        console.error('Error actualizando gráficos:', error);
    }
}