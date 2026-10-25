/**
 * Modelo de datos del catálogo de ONUs.
 * Tipado estricto para garantizar la integridad de los datos de campo.
 */

export interface ManualStep {
  stepNumber: number;
  title: string;
  description: string;
  screenshot?: string;
  checklist?: string[]; // Ej: ["Activar modo Bridge", "Configurar VLAN 100"]
}

export interface LegacyManualLink {
  label: string; // Ej: "Manual 1", "Manual 2", "Manual General"
  url: string;   // URL a Google Drive o enlace externo
}

export interface ONU {
  id: string; // Slug único para URL (ej: "kingtype-cusa", "vsol")
  brand: string; // Marca principal (ej: "VSOL", "FiberHome", "KingType")
  model: string; // Modelo (ej: "CUSA", "HG102WT", "ONT-4GE-RFDW", "Genérico")
  aliases: string[]; // Nombres alternativos o marcas blancas para búsqueda difusa (ej: ["Bestcom", "cdata", "Fenix"])
  defaultIp: string; // IP habitual de acceso: "192.168.1.1" o "192.168.100.1"
  credentials: {
    username: string;
    password: string;
  };
  loginUiImage: string; // Ruta relativa a la captura de pantalla de login (/images/onus/<id>-login.webp o .svg)
  deviceImage?: string; // Foto física del equipo (opcional)
  legacyManuals?: LegacyManualLink[]; // Enlaces a manuales existentes en Drive/PDF
  interactiveManual?: ManualStep[];   // Pasos de configuración guiada (checklist)
  notes?: string; // Observaciones técnicas (ej: "Captcha visible en login", "Requiere reiniciar al cambiar VLAN")
}
