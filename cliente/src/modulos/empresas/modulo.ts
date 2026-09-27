import { Building2 } from 'lucide-vue-next';
import type { DefinicionModuloCliente } from '@/modulos/core/tipos';
import { NOMBRE_EMPRESAS, VENTANAS_EMPRESAS } from './textos';

export const moduloEmpresas: DefinicionModuloCliente = {
  clave: 'empresas',
  rutas: [
    {
      path: '/empresas',
      name: 'empresas',
      component: () => import('./paginas/ListaEmpresas.vue'),
      meta: { permiso: 'empresas.ver', titulo: VENTANAS_EMPRESAS.empresas.titulo },
    },
  ],
  menu: [
    {
      clave: 'empresas',
      titulo: NOMBRE_EMPRESAS,
      icono: Building2,
      entradas: [
        {
          titulo: VENTANAS_EMPRESAS.empresas.titulo,
          ruta: '/empresas',
          icono: Building2,
          seccion: 'administracion',
          permiso: 'empresas.ver',
        },
      ],
    },
  ],
};
