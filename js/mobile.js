// ============ MENÚ MÓVIL ============
function toggleMobileSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (sidebar && overlay) {
        sidebar.classList.toggle('mobile-open');
        overlay.classList.toggle('active');
        
        // Prevenir scroll del body cuando el sidebar está abierto
        if (sidebar.classList.contains('mobile-open')) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    }
}

function closeMobileSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (sidebar && overlay) {
        sidebar.classList.remove('mobile-open');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Cerrar sidebar al hacer clic en un link de navegación (solo móvil)
document.addEventListener('DOMContentLoaded', () => {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                closeMobileSidebar();
            }
        });
    });
    
    // Cerrar sidebar al cambiar el tamaño de la ventana a desktop
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            closeMobileSidebar();
        }
    });
});

// Prevenir zoom en inputs en iOS
document.addEventListener('DOMContentLoaded', () => {
    const addMaximumScaleToMetaViewport = () => {
        const el = document.querySelector('meta[name=viewport]');
        
        if (el !== null) {
            let content = el.getAttribute('content');
            let regex = /maximum-scale=[0-9.]+/g;
            
            if (regex.test(content)) {
                content = content.replace(regex, 'maximum-scale=1.0');
            } else {
                content = [content, 'maximum-scale=1.0'].join(', ');
            }
            
            el.setAttribute('content', content);
        }
    };
    
    const disableIosTextFieldZoom = addMaximumScaleToMetaViewport;
    
    // Detectar iOS
    const checkIsIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    
    if (checkIsIOS()) {
        disableIosTextFieldZoom();
    }
});

// Detectar orientación del dispositivo
window.addEventListener('orientationchange', () => {
    // Recargar gráficos si es necesario
    setTimeout(() => {
        if (typeof updateCharts === 'function') {
            updateCharts();
        }
    }, 500);
});

// Mostrar aviso en móvil cuando se abre
if (window.innerWidth < 768) {
    const chartResponsive = document.getElementById('chartResponsive');
    if (chartResponsive) {
        chartResponsive.style.display = 'block';
    }
}