import { createRouter, createWebHistory } from 'vue-router';
import { resolverAcceso } from './modulos/core/acceso/reglas-de-acceso';
import { usarApariencia } from './modulos/core/almacenes/apariencia';
import { usarSesion } from './modulos/core/almacenes/sesion';
import { clienteHttp } from './modulos/core/servicios/cliente-http';
import DisenoPrincipal from './modulos/core/disenos/DisenoPrincipal.vue';
import { modulosCliente } from './modulos/indice';
import { VENTANAS_CORE } from './modulos/core/textos';

export const enrutador = createRouter({
  history: createWebHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    {
      path: '/iniciar-sesion',
      name: 'iniciar-sesion',
      component: () => import('./modulos/core/paginas/IniciarSesion.vue'),
      meta: { publica: true, titulo: VENTANAS_CORE.iniciarSesion.titulo },
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
          meta: { requiereEmpresa: false, titulo: VENTANAS_CORE.elegirEmpresa.titulo },
        },
        {
          path: '/sin-permiso',
          name: 'sin-permiso',
          component: () => import('./modulos/core/paginas/SinPermiso.vue'),
          meta: { requiereEmpresa: false, titulo: VENTANAS_CORE.sinPermiso.titulo },
        },
      ],
    },
    { path: '/:ruta(.*)*', redirect: '/' },
  ],
});

enrutador.beforeEach(async (destino) => {
  const sesion = usarSesion();
  if (!sesion.cargada) await sesion.cargar();
  return resolverAcceso(destino, sesion);
});

enrutador.afterEach((destino) => {
  const nombre = usarApariencia().nombreAplicacion;
  document.title = destino.meta.titulo ? `${destino.meta.titulo} · ${nombre}` : nombre;
});

clienteHttp.alPerderLaSesion(() => {
  const sesion = usarSesion();
  if (!sesion.autenticado) return;
  sesion.limpiar();
  void enrutador.push({ name: 'iniciar-sesion' });
});
