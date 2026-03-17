// Sistema de Notificaciones - SOLO WHATSAPP
class NotificationSystem {
    constructor() {
        this.whatsappAPI = 'https://api.whatsapp.com/send';
    }

    // Enviar mensaje por WhatsApp
    async sendWhatsApp(telefono, mensaje) {
        try {
            if (!telefono) {
                Utils.showNotification('El cliente no tiene teléfono registrado', 'warning');
                return false;
            }

            // Limpiar el número de teléfono - eliminar todos los caracteres excepto números
            const phoneNumber = telefono.replace(/\D/g, '');
            
            if (phoneNumber.length < 10) {
                Utils.showNotification('Número de teléfono inválido', 'error');
                return false;
            }

            // Construir URL de WhatsApp correctamente
            const encodedMessage = encodeURIComponent(mensaje);
            const whatsappURL = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
            
            // Abrir WhatsApp en nueva ventana
            window.open(whatsappURL, '_blank', 'width=800,height=600');
            
            return true;
        } catch (error) {
            console.error('Error enviando WhatsApp:', error);
            Utils.showNotification('Error: ' + error.message, 'error');
            return false;
        }
    }

    // Generar mensaje de vencimiento
    generarMensajeVencimiento(cliente, servicio, dias, fechaVenc) {
        const urgencia = dias <= 3 ? '⚠️ *URGENTE*' : '⏰ *RECORDATORIO*';
        
        return `${urgencia}

Hola ${cliente.nombre} 👋

Tu suscripción a *${servicio.nombre}* vencerá en *${dias} día${dias !== 1 ? 's' : ''}* 📅

📌 Fecha de vencimiento: ${fechaVenc}

Para renovar tu servicio, contáctanos.

¡Gracias por tu preferencia! 🎬
_Streaming Manager_`;
    }

    // Generar mensaje de bienvenida
    generarMensajeBienvenida(cliente, servicio, perfil, duracionDias) {
        let textoAdicional = '';
        if (perfil.nombre) {
            textoAdicional += `📺 Perfil: ${perfil.nombre}\n`;
        }
        if (perfil.pin) {
            textoAdicional += `🔐 PIN: ${perfil.pin}\n`;
        }
        
        return `🎉 *¡BIENVENIDO A ${servicio.nombre.toUpperCase()}!*

Hola ${cliente.nombre} 👋

Tu suscripción ha sido activada exitosamente ✅

*DETALLES DE TU CUENTA:*
${textoAdicional}
⏱️ Duración: ${duracionDias} días
📅 Fecha de vencimiento: ${new Date(new Date().setDate(new Date().getDate() + duracionDias)).toLocaleDateString('es-ES')}

¡Disfruta tu contenido! 🎬
_Streaming Manager_`;
    }

    // Generar mensaje de renovación
    generarMensajeRenovacion(cliente, servicio, nuevaFechaFin) {
        return `✅ *RENOVACIÓN EXITOSA*

Hola ${cliente.nombre} 👋

Tu suscripción a *${servicio.nombre}* ha sido renovada exitosamente 🎉

📅 Nueva fecha de vencimiento: ${nuevaFechaFin}

¡Continúa disfrutando! 🎬
_Streaming Manager_`;
    }

    // Mostrar modal de notificación por WhatsApp
    mostrarModalWhatsApp(cliente, mensaje, titulo = '📱 Enviar por WhatsApp') {
        if (!cliente.telefono) {
            Utils.showNotification('El cliente no tiene teléfono registrado', 'warning');
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.innerHTML = `
            <div class="modal" style="max-width: 550px;">
                <div class="modal-header">
                    <h3>${titulo}</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label><strong>📲 Cliente:</strong></label>
                        <input type="text" value="${cliente.nombre}" readonly class="form-control" style="background: var(--bg-tertiary);">
                    </div>
                    
                    <div class="form-group">
                        <label><strong>📞 Teléfono:</strong></label>
                        <input type="text" value="${cliente.telefono}" readonly class="form-control" style="background: var(--bg-tertiary);">
                    </div>
                    
                    <div class="form-group">
                        <label><strong>💬 Mensaje:</strong></label>
                        <textarea id="notifMensaje" class="form-control" rows="10" style="font-family: 'Courier New', monospace; font-size: 13px; resize: vertical;">${mensaje}</textarea>
                        <small class="text-muted" style="margin-top: 8px; display: block;">
                            ✏️ Puedes editar el mensaje antes de enviar
                        </small>
                    </div>
                    
                    <div class="notification-preview" style="background: #25D366; color: white; padding: 16px; border-radius: 12px; margin-top: 16px; white-space: pre-wrap; font-size: 12px; font-family: monospace; line-height: 1.5;">
                        ${mensaje}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                        ❌ Cancelar
                    </button>
                    <button class="btn btn-success" onclick="notificationSystem.ejecutarEnvioWhatsApp('${cliente.telefono}')">
                        ✅ Enviar por WhatsApp
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // Ejecutar envío de WhatsApp
    async ejecutarEnvioWhatsApp(telefono) {
        const mensaje = document.getElementById('notifMensaje').value;
        
        if (!mensaje.trim()) {
            Utils.showNotification('El mensaje no puede estar vacío', 'warning');
            return;
        }

        const exitoso = await this.sendWhatsApp(telefono, mensaje);
        
        if (exitoso) {
            Utils.showNotification('WhatsApp abierto correctamente ✅', 'success');
            // Cerrar modal después de 1 segundo
            setTimeout(() => {
                const modal = document.querySelector('.modal-overlay.active');
                if (modal) modal.remove();
            }, 500);
        }
    }
}

// Instancia global
const notificationSystem = new NotificationSystem();