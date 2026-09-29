import {
  Building,
  CircleUserRound,
  LifeBuoy,
  Palette,
  ScrollText,
  ShieldCheck,
  SlidersHorizontal,
  Users,
} from 'lucide-vue-next';
import { GRUPOS_CORE, VENTANAS_CORE } from './textos';
import type { DefinicionModuloCliente } from './tipos';

const DE_SOPORTE = { soloSuperacceso: true, requiereEmpresa: false } as const;

export const moduloCore: DefinicionModuloCliente = {
  clave: 'core',
  rutas: [
    {
      path: '/',
      name: 'inicio',
      component: () => import('./paginas/PanelInicio.vue'),
      meta: { titulo: VENTANAS_CORE.inicio.titulo },
    },
    {
      path: '/usuarios',
      name: 'usuarios',
      component: () => import('./paginas/UsuariosCuenta.vue'),
      meta: { permiso: 'usuarios.ver', titulo: VENTANAS_CORE.usuarios.titulo },
    },
    {
      path: '/usuarios/:usuarioId/permisos',
      name: 'usuario-permisos',
      component: () => import('./paginas/PermisosDeUsuario.vue'),
      props: (ruta) => ({ usuarioId: ruta.params.usuarioId }),
      meta: { permiso: 'usuarios.ver', titulo: VENTANAS_CORE.permisosDeUsuario.titulo },
    },
    {
      path: '/roles',
      name: 'roles',
      component: () => import('./paginas/RolesCuenta.vue'),
      meta: { permiso: 'roles.ver', titulo: VENTANAS_CORE.roles.titulo },
    },
    {
      path: '/configuracion',
      name: 'configuracion',
      component: () => import('./paginas/ConfiguracionCuenta.vue'),
      meta: { permiso: 'configuracion.ver', titulo: VENTANAS_CORE.configuracion.titulo },
    },
    {
      path: '/plataforma/cuentas',
      name: 'plataforma-cuentas',
      component: () => import('./paginas/PlataformaCuentas.vue'),
      meta: { ...DE_SOPORTE, titulo: VENTANAS_CORE.cuentas.menu },
    },
    {
      path: '/plataforma/apariencia',
      name: 'plataforma-apariencia',
      component: () => import('./paginas/PlataformaApariencia.vue'),
      meta: { ...DE_SOPORTE, titulo: VENTANAS_CORE.apariencia.titulo },
    },
    {
      path: '/plataforma/bitacora',
      name: 'plataforma-bitacora',
      component: () => import('./paginas/PlataformaBitacora.vue'),
      meta: { ...DE_SOPORTE, titulo: VENTANAS_CORE.bitacora.titulo },
    },
  ],
  menu: [
    {
      clave: 'cuenta',
      titulo: GRUPOS_CORE.cuenta,
      icono: CircleUserRound,
      entradas: [
        {
          titulo: VENTANAS_CORE.usuarios.titulo,
          ruta: '/usuarios',
          icono: Users,
          seccion: 'administracion',
          permiso: 'usuarios.ver',
        },
        {
          titulo: VENTANAS_CORE.roles.titulo,
          ruta: '/roles',
          icono: ShieldCheck,
          seccion: 'administracion',
          permiso: 'roles.ver',
        },
        {
          titulo: VENTANAS_CORE.configuracion.titulo,
          ruta: '/configuracion',
          icono: SlidersHorizontal,
          seccion: 'administracion',
          permiso: 'configuracion.ver',
        },
      ],
    },
    {
      clave: 'soporte',
      titulo: GRUPOS_CORE.soporte,
      icono: LifeBuoy,
      soloSuperacceso: true,
      entradas: [
        { titulo: VENTANAS_CORE.cuentas.menu, ruta: '/plataforma/cuentas', icono: Building, seccion: 'administracion' },
        {
          titulo: VENTANAS_CORE.apariencia.titulo,
          ruta: '/plataforma/apariencia',
          icono: Palette,
          seccion: 'administracion',
        },
        { titulo: VENTANAS_CORE.bitacora.menu, ruta: '/plataforma/bitacora', icono: ScrollText, seccion: 'reportes' },
      ],
    },
  ],
};
