// Configuración global del sistema
const CONFIG = {
    SPREADSHEET_ID: '1O5gOc-Ka5PEZxKUA2idUpDKRgZG9DEj_JK9VulMKPUA', // Reemplazar con tu ID
    
    // Service Account credentials (en producción, considera usar variables de entorno)
    SERVICE_ACCOUNT: {
        client_email: 'streaming-manager-sa@tempmail-codigomanager.iam.gserviceaccount.com',
        private_key: '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCkfH3Z8AuBknVD\nsHj92n4XLZXTmM/dB8nUG2gb23jlkd+cJcwvRDnADS9SK7G9Fb5WfuaIzS1DIFjz\nJ1iumsZTW9A6oPAqJWgx9AdM+xYTb7vdXP2bWT4mbHboCVIQTlztsf1Lv06auvZy\n5zYiin2lykfcRCpquBPlQVqgMLka91mNUwnpr9X3BNfF1NmNRHeyP+HL5TCru/YZ\nhYzGJB02ZAq2L9AwrldUTIJML5XgGSvSob8Joq2KKiEwn3ZQTZgRaS0C76SvZf6n\n+CRClQ7E4tO8AjpL4VmlW2giKyCGCcl/Xfe55KzQQRit2jGmTwy1z1gB2x28wUul\nNMoaTncLAgMBAAECggEAUAB657rQpdtZrKwTFQklxdk2o72R8EPe/wq7dr0nDqWG\nGHjr2Ft7KTVgfDtjTf/a3VAIiaYdqyX7DXzoLbh62MVxwGpRlXYvOQijWmZPRPHV\n8mNNuDbOOzsLFG2gG+05VqT4+VQZg7mGr7lUQ7WPSklZ7UC8Tr6scpd4YCyCg6He\nDPbdAmuL96cbRxoubj3Ipqm2oCLFqJbBQYtwCEC813DF9W+oSK3csRU7Oh048WGA\nq00/xmF7NkX3aiWXWdeqlZbFETpZlTrLRLxERO9f4wRDDv9q1pkRQUwjqezlfMGa\nmsYjnxgYB9ekm3g7iYbOppDnfYslGZAdj3PpzVPSqQKBgQDU69DanLS942PDgq53\nou4x/wU6E5ICFIWb50FDRYiHzNxz5JQxAs3eJgfJ5+aLkd2mSawEVx65ln2QorAQ\ns3A6iZrnHyCa1cav7EtSak56od/uw8R0Bvu2PU9Ki3QESqGTRpoY5CTAldJT7T+g\nu94sEupkIey4YBAa1I/h90FhGQKBgQDFxAHn6J82pmhd96cL+04oVZPtnPehpsUA\nJMK592ZW+MxSRDJg6g1Cua3wbU8PKN8gMLWNDPozQ56kF/KzqTNYLfxHXA+u+dQd\n9YgqQVPHiaEeDb/KJenJodpi7AXPJZ0SEOh5RBPEmkOfACX12bR+wapmf0IOaP2C\nuJxiMqipwwKBgFXF/afjkwgf71OWdHQrhatMYa2orpv56m0ItwjDnSGfzHs/bNdl\nmstQJLkYm45EH7daXFqPQghfcIvwjd7cemyKfIV4y6i0T8sU9K7ptl2+kjhcUuqu\n2X3rquKL1RvZeMecnH1Egu22LTm0DHrS08iLgjL+W59Wy4YTdTcBZSwZAoGAdQ84\nMZU36JlHXZehgS4XbTh6f0NSMJUONq+Ls5gFM6XBC1DioQrpHn3Zv150VXzT1bH/\nRKZR0tZLqMWkG0Qj6CYQFg0gG2o1bCZRmvFgLdQBUlDBHV6jq33qTnN2XM7e0jq/\n4Eezi8PkEtF7prJebEkmG9VnvC/ZHu83YciqnRECgYEAuFiWWWEkPXwGLMstolA0\nmE9cfsF4rc1GcXhBHb3gU2mHM6uMwrZ7SXFYpy/rnNDHIbWQolar1RZZI+91Hp0e\nGjdKK+7iBnaUUXoAZiL6onLQ6qSlYK2BftmqgEhwzF0l+KfrLBKYnYCzyy5cpyzd\nMhhH+mqQHhIBvw6kWnLfQp0=\n-----END PRIVATE KEY-----\n'
    },
    
    // Nombres exactos de las hojas en Google Sheets
    SHEETS: {
        USUARIOS: 'UsuariosSistema',
        SERVICIOS: 'Servicios',
        CLIENTES: 'Clientes',
        CORREOS: 'Correos',
        CUENTAS: 'Cuentas',
        PERFILES: 'Perfiles',
        SUSCRIPCIONES: 'Suscripciones',
        MOVIMIENTOS: 'Movimientos'
    },
    
    // Scopes de Google Sheets API
    SCOPES: ['https://www.googleapis.com/auth/spreadsheets'],
    
    // Configuración de la aplicación
    APP: {
        NAME: 'Streaming Manager',
        VERSION: '1.0.0',
        DIAS_ALERTA: 7 // Alertar con 7 días de anticipación
    }
};