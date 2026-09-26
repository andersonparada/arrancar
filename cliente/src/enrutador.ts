import { createRouter, createWebHistory, type RouteLocationNormalized } from 'vue-router';
import { usarApariencia } from './modulos/core/almacenes/apariencia';
import { usarSesion } from './modulos/core/almacenes/sesion';
import { alPerderLaSesion } from './modulos/core/servicios/cliente-http';
import DisenoPrincipal from './modulos/core/disenos/DisenoPrincipal.vue';
import { modulosCliente } from './modulos/indice';

export const enrutador = createRouter({
  history: createWebHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    {
      path: '/iniciar-sesion',
      name: 'iniciar-sesion',
      component: () => import('./modulos/core/paginas/IniciarSesion.vue'),
      meta: { publica: true, titulo: 'Iniciar sesión' },
    },
    {
      path: '/',
      component: DisenoPrincipal,
      children: [
        ...modulosCliente.flatMap((m) => m.rutas),
        {
          path: '/elegir-empresa',
          name: 'elegir-empresa',
          component: () => import('./modulos/core/paginas/SeleccionarEmpresa.vue'),
          meta: { requiereEmpresa: false, titulo: 'Elegir empresa' },
        },
        {
          path: '/sin-permiso',
          name: 'sin-permiso',
          component: () => import('./modulos/core/paginas/SinPermiso.vue'),
          meta: { requiereEmpresa: false, titulo: 'Sin acceso' },
        },
      ],
    },
    { path: '/:ruta(.*)*', redirect: '/' },
  ],
});

/**
 * Decide a dónde ir antes de entrar a una ruta: inicio de sesión, elegir
 * empresa o "sin permiso". Es solo navegación; la API valida lo mismo.
 */
function resolverAcceso(destino: RouteLocationNormalized) {
  const sesion = usarSesion();
  const { meta } = destino;

  if (meta.publica) return sesion.autenticado && destino.name === 'iniciar-sesion' ? { name: 'inicio' } : true;
  if (!sesion.autenticado) return { name: 'iniciar-sesion', query: { volver: destino.fullPath } };
  if (meta.soloSuperacceso && !sesion.esSuperacceso) return { name: 'sin-permiso' };
  if ((meta.requiereEmpresa ?? true) && !sesion.empresa) return { name: 'elegir-empresa' };
  if (meta.permiso && !sesion.puede(meta.permiso)) return { name: 'sin-permiso' };
  return true;
}

enrutador.beforeEach(async (destino) => {
  const sesion = usarSesion();
  if (!sesion.cargada) await sesion.cargar();
  return resolverAcceso(destino);
});

enrutador.afterEach((destino) => {
  const nombre = usarApariencia().nombreAplicacion;
  document.title = destino.meta.titulo ? `${destino.meta.titulo} · ${nombre}` : nombre;
});

alPerderLaSesion(() => {
  const sesion = usarSesion();
  if (!sesion.autenticado) return;
  sesion.limpiar();
  void enrutador.push({ name: 'iniciar-sesion' });
});
