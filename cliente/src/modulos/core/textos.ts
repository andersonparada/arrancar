/**
 * Nombres de las ventanas, menús y títulos del núcleo. Las rutas, el menú y las
 * páginas los toman de aquí: un cambio de nombre se hace en un solo lugar.
 */

export const SECCIONES_DEL_MENU = {
  operacion: 'Operación',
  administracion: 'Administración',
  reportes: 'Reportes',
} as const;

export const GRUPOS_CORE = {
  cuenta: 'Cuenta',
  soporte: 'Soporte',
} as const;

export const VENTANAS_CORE = {
  inicio: { titulo: 'Inicio' },
  iniciarSesion: { titulo: 'Iniciar sesión' },
  elegirEmpresa: { titulo: 'Elegir empresa' },
  sinPermiso: { titulo: 'Sin acceso' },
  usuarios: {
    titulo: 'Usuarios',
    descripcion: 'Personas con acceso a las empresas de esta cuenta y el rol que tienen en cada una.',
  },
  roles: {
    titulo: 'Roles y permisos',
    descripcion: 'Cada rol agrupa permisos de pantallas y de acciones. Un usuario tiene un rol en cada empresa.',
  },
  configuracion: {
    titulo: 'Configuración',
    descripcion: (empresa: string) =>
      `Ajustes de la cuenta y de ${empresa}. El valor de la empresa tiene prioridad sobre el de la cuenta, y este sobre el del servidor.`,
  },
  cuentas: {
    titulo: 'Cuentas suscriptoras',
    menu: 'Cuentas',
    descripcion: 'Soporte: alta de clientes del SaaS y módulos que tiene contratados cada uno.',
  },
  apariencia: {
    titulo: 'Apariencia',
    descripcion:
      'Nombre, logo y colores de esta instalación. Se aplican a todas las cuentas del servidor: menú, encabezados e inicio de sesión.',
  },
  bitacora: {
    titulo: 'Bitácora de soporte',
    menu: 'Bitácora',
    descripcion: 'Cada vez que alguien con superacceso entra a una empresa ajena queda registrado aquí.',
  },
} as const;
