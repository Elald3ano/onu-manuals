import type { ONU } from '../types/onu'

/**
 * Catálogo de ONUs precargado desde la documentación de campo
 * (archivo "ACCESOS2.docx", exportado de Google Docs).
 *
 * Fuente de los enlaces: word/_rels/document.xml.rels (hipervínculos reales de Google Drive).
 *
 * ⚠️ Nota sobre `defaultIp`: el documento fuente "ACCESOS2" NO incluye direcciones IP
 * (solo credenciales y enlaces a manuales). Por eso `defaultIp` queda como string vacío
 * y debe completarse con la IP de gestión de cada equipo (típicamente 192.168.1.1 o 192.168.100.1).
 *
 * ⚠️ Equipos "Genérico": 5 entradas del documento no tienen marca legible (la pantalla de
 * login es genérica "XPON ONU"). Se registran como "Genérico" a la espera de confirmar la marca.
 */
export function getOnuById(id: string): ONU | undefined {
  return ONUS.find((onu) => onu.id === id)
}

export const ONUS: ONU[] = [
  {
    id: 'kingtype-cusa',
    brand: 'KingType',
    model: 'CUSA',
    aliases: [],
    defaultIp: '',
    credentials: {
      username: 'super',
      password: 'kingT#92Su',
    },
    loginUiImage: 'images/onus/kingtype-cusa-login.png',
    legacyManuals: [
      {
        label: 'Manual 1',
        url: 'https://drive.google.com/file/d/1VuWn0befwkypJfhRWBTIwh7lWXCiKusT/view?usp=sharing',
      },
      {
        label: 'Manual 2',
        url: 'https://drive.google.com/file/d/1blOMPxZcMBC22aCQinHudCeZJmQNy4lW/view?usp=sharing',
      },
    ],
  },
  {
    id: 'bestcom-cdata-fenix',
    brand: 'Bestcom',
    model: 'Genérico',
    aliases: ['cdata', 'Fenix'],
    defaultIp: '',
    credentials: {
      username: 'adminisp',
      password: 'adminisp',
    },
    loginUiImage: 'images/onus/bestcom-cdata-fenix-login.png',
    legacyManuals: [
      {
        label: 'Manual',
        url: 'https://drive.google.com/file/d/1XPhM3z6nKVIxWTRv-gVAmazEeylBhrWO/view?usp=sharing',
      },
    ],
  },
  {
    id: 'easy4link',
    brand: 'EASY4LINK',
    model: 'Genérico',
    aliases: [],
    defaultIp: '',
    credentials: {
      username: 'adminisp',
      password: 'adminisp',
    },
    loginUiImage: 'images/onus/easy4link-login.png',
    legacyManuals: [
      {
        label: 'Manual',
        url: 'https://drive.google.com/file/d/1ZHylwoaM78zMjN8QRAk_m9o8GLp3PuTJ/view?usp=sharing',
      },
    ],
  },
  {
    id: 'bdcom',
    brand: 'BDCOM',
    model: 'Genérico',
    aliases: [],
    defaultIp: '',
    credentials: {
      username: 'admin',
      password: 'super&123',
    },
    loginUiImage: 'images/onus/bdcom-login.png',
    legacyManuals: [
      {
        label: 'Manual',
        url: 'https://drive.google.com/file/d/166J6E4dFkz94ZeZCdCgGPv8vqql8r7x9/view?usp=sharing',
      },
    ],
    notes: 'La contraseña contiene el carácter "&".',
  },
  {
    id: 'optitimes',
    brand: 'OPTITIMES',
    model: 'Genérico',
    aliases: [],
    defaultIp: '',
    credentials: {
      username: 'admin',
      password: 'Admin123!',
    },
    loginUiImage: 'images/onus/optitimes-login.png',
    legacyManuals: [
      {
        label: 'Manual',
        url: 'https://drive.google.com/file/d/13SyFvLM4KhBZw7D7-9Oh6sZK6QZN5KTf/view?usp=sharing',
      },
    ],
  },
  {
    id: 'generico-xpon',
    brand: 'Genérico',
    model: 'Genérico',
    aliases: [],
    defaultIp: '',
    credentials: {
      username: 'Admin',
      password: 'Admin123!',
    },
    loginUiImage: 'images/onus/generico-xpon-login.png',
    notes: 'Marca no especificada en el documento fuente (login genérico "Welcome to XPON ONU").',
  },
  {
    id: 'generico-system',
    brand: 'Genérico',
    model: 'Genérico',
    aliases: [],
    defaultIp: '',
    credentials: {
      username: 'admin',
      password: 'system',
    },
    loginUiImage: 'images/onus/generico-system-login.png',
    legacyManuals: [
      {
        label: 'Manual',
        url: 'https://drive.google.com/file/d/1U9Kgt-udCqqhy8Yl5qdHtRZWFJAmLlBn/view?usp=sharing',
      },
    ],
    notes: 'Marca no especificada en el documento fuente (login genérico "XPON ONU").',
  },
  {
    id: 'generico-ont-4ge-rfdw',
    brand: 'Genérico',
    model: 'ONT-4GE-RFDW',
    aliases: [],
    defaultIp: '',
    credentials: {
      username: 'admin',
      password: 'Admin123!',
    },
    loginUiImage: 'images/onus/generico-ont-4ge-rfdw-login.png',
  },
  {
    id: 'generico-system-2',
    brand: 'Genérico',
    model: 'Genérico',
    aliases: [],
    defaultIp: '',
    credentials: {
      username: 'admin',
      password: 'system',
    },
    loginUiImage: 'images/onus/generico-system-2-login.png',
    legacyManuals: [
      {
        label: 'Manual',
        url: 'https://drive.google.com/file/d/1Qq-PmB_F1OXyr0oZmvgyfx7t_kmvcTwD/view?usp=sharing',
      },
    ],
    notes: 'Marca no especificada en el documento fuente (login genérico "Input username and password").',
  },
  {
    id: 'connet',
    brand: 'CONNET',
    model: 'Genérico',
    aliases: [],
    defaultIp: '',
    credentials: {
      username: 'admin',
      password: 'admin',
    },
    loginUiImage: 'images/onus/connet-login.png',
  },
  {
    id: 'vsol',
    brand: 'VSOL',
    model: 'Genérico',
    aliases: [],
    defaultIp: '',
    credentials: {
      username: 'admin',
      password: 'Admin123!',
    },
    loginUiImage: 'images/onus/vsol-login.png',
    legacyManuals: [
      {
        label: 'Manual 1',
        url: 'https://drive.google.com/file/d/1vkLfp-O3dx_NV2FgchY7CL2TWaOVsWxT/view?usp=sharing',
      },
      {
        label: 'Manual 2',
        url: 'https://drive.google.com/file/d/1E2WGZv8jB2_D5Gmeyi9jhqHVGz8IkR3k/view?usp=sharing',
      },
    ],
    // ⚠️ Checklist de EJEMPLO (genérico) para demostrar la guía interactiva.
    // Reemplazar por los pasos reales de la documentación de campo.
    interactiveManual: [
      {
        stepNumber: 1,
        title: 'Conectar el equipo',
        description:
          'Conecta la ONU a la fuente de alimentación y el cable de fibra óptica. Espera a que el LED PON se estabilice.',
        checklist: [
          'Conectar la alimentación',
          'Conectar el cable de fibra óptica',
          'Verificar el LED PON encendido',
        ],
      },
      {
        stepNumber: 2,
        title: 'Acceder a la interfaz web',
        description:
          'Conecta tu laptop al puerto LAN1 y abre la IP de gestión en el navegador. Ingresa con las credenciales indicadas.',
        screenshot: 'images/onus/vsol-login.png',
        checklist: [
          'Conectar el cable LAN1',
          'Abrir la IP de gestión en el navegador',
          'Ingresar usuario y contraseña',
        ],
      },
      {
        stepNumber: 3,
        title: 'Configurar la conexión WAN',
        description:
          'Según el servicio contratado (PPPoE o IPoE), configura los parámetros WAN que entrega el ISP.',
        checklist: [
          'Seleccionar el tipo de conexión',
          'Ingresar la VLAN del servicio',
          'Guardar y aplicar los cambios',
        ],
      },
      {
        stepNumber: 4,
        title: 'Configurar la red WiFi',
        description: 'Define el SSID y una contraseña WiFi segura para el cliente.',
        checklist: [
          'Cambiar el nombre de la red (SSID)',
          'Definir una contraseña segura',
          'Guardar los cambios',
        ],
      },
      {
        stepNumber: 5,
        title: 'Verificar el servicio',
        description:
          'Comprueba que el equipo navega y que el estado de los LEDs es correcto antes de cerrar la instalación.',
        checklist: [
          'Verificar que el LED LOS esté apagado',
          'Probar la navegación',
          'Registrar la instalación',
        ],
      },
    ],
  },
  {
    id: 'generico-admin',
    brand: 'Genérico',
    model: 'Genérico',
    aliases: [],
    defaultIp: '',
    credentials: {
      username: 'admin',
      password: 'admin',
    },
    loginUiImage: 'images/onus/generico-admin-login.png',
    notes: 'Marca no especificada en el documento fuente (login genérico "Username / Password").',
  },
  {
    id: 'generico-admin-2',
    brand: 'Genérico',
    model: 'Genérico',
    aliases: [],
    defaultIp: '',
    credentials: {
      username: 'admin',
      password: 'admin',
    },
    loginUiImage: 'images/onus/generico-admin-2-login.png',
    notes: 'Marca no especificada en el documento fuente (login genérico "Administrator / Language / Reset").',
  },
  {
    id: 'latic',
    brand: 'LATIC',
    model: 'Genérico',
    aliases: [],
    defaultIp: '',
    credentials: {
      username: 'Administrador',
      password: 'ltc753aa',
    },
    loginUiImage: 'images/onus/latic-login.png',
    legacyManuals: [
      {
        label: 'Manual',
        url: 'https://drive.google.com/file/d/1ep7iFY90hmQFdXAWjMQ0DZPcCWqq0HaV/view?usp=sharing',
      },
    ],
  },
  {
    id: 'supreme',
    brand: 'SUPREME',
    model: 'Genérico',
    aliases: [],
    defaultIp: '',
    credentials: {
      username: 'adminisp',
      password: 'adminisp',
    },
    loginUiImage: 'images/onus/supreme-login.png',
    legacyManuals: [
      {
        label: 'Manual',
        url: 'https://drive.google.com/file/d/1Xs_Lpzf0s5pSOC4riA4gt1eKwI1wJKbh/view?usp=drive_link',
      },
    ],
  },
  {
    id: 'fiber-home',
    brand: 'FiberHome',
    model: 'Genérico',
    aliases: [],
    defaultIp: '',
    credentials: {
      username: 'AdminFHome',
      password: 'Admin@Fhome',
    },
    loginUiImage: 'images/onus/fiber-home-login.png',
    deviceImage: 'images/onus/fiber-home-device.webp',
    legacyManuals: [
      {
        label: 'Manual',
        url: 'https://drive.google.com/file/d/15KMWQzh3O6VcvVBLx6xqE0K8alQ-6EK6/view?usp=drive_link',
      },
    ],
  },
]
