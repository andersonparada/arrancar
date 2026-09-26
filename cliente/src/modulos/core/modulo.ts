import { Building, House, Palette, ScrollText, ShieldCheck, SlidersHorizontal, Users } from 'lucide-vue-next';
import type { DefinicionModuloCliente } from './tipos';

export const moduloCore: DefinicionModuloCliente = {
  clave: 'core',
  rutas: [
    { path: '/', name: 'inicio', component: () => import('./paginas/PanelInicio.vue'), meta: { titulo: 'Inicio' } },
    {
      path: '/usuarios',
      name: 'usuarios',
      component: () => import('./paginas/UsuariosCuenta.vue'),
      meta: { permiso: 'usuarios.ver', titulo: 'Usuarios' },
    },
    {
      path: '/roles',
      name: 'roles',
      component: () => import('./paginas/RolesCuenta.vue'),
      meta: { permiso: 'roles.ver', titulo: 'Roles y permisos' },
    },
    {
      path: '/configuracion',
      name: 'configuracion',
      component: () => import('./paginas/ConfiguracionCuenta.vue'),
      meta: { permiso: 'configuracion.ver', titulo: 'Configuración' },
    },
    {
      path: '/plataforma/cuentas',
      name: 'plataforma-cuentas',
      component: () => import('./paginas/PlataformaCuentas.vue'),
      meta: { soloSuperacceso: true, requiereEmpresa: false, titulo: 'Cuentas' },
    },
    {
      path: '/plataforma/apariencia',
      name: 'plataforma-apariencia',
      component: () => import('./paginas/PlataformaApariencia.vue'),
      meta: { soloSuperacceso: true, requiereEmpresa: false, titulo: 'Apariencia' },
    },
    {
      path: '/plataforma/bitacora',
      name: 'plataforma-bitacora',
      component: () => import('./paginas/PlataformaBitacora.vue'),
      meta: { soloSuperacceso: true, requiereEmpresa: false, titulo: 'Bitácora de soporte' },
    },
  ],
  menu: [
    { titulo: 'Inicio', ruta: '/', icono: House },
    { titulo: 'Usuarios', ruta: '/usuarios', icono: Users, permiso: 'usuarios.ver', grupo: 'Administración' },
    { titulo: 'Roles y permisos', ruta: '/roles', icono: ShieldCheck, permiso: 'roles.ver', grupo: 'Administración' },
    {
      titulo: 'Configuración',
      ruta: '/configuracion',
      icono: SlidersHorizontal,
      permiso: 'configuracion.ver',
      grupo: 'Administración',
    },
    { titulo: 'Cuentas', ruta: '/plataforma/cuentas', icono: Building, soloSuperacceso: true, grupo: 'Soporte' },
    { titulo: 'Apariencia', ruta: '/plataforma/apariencia', icono: Palette, soloSuperacceso: true, grupo: 'Soporte' },
    { titulo: 'Bitácora', ruta: '/plataforma/bitacora', icono: ScrollText, soloSuperacceso: true, grupo: 'Soporte' },
  ],
};
