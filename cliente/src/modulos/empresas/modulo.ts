import { Building2 } from 'lucide-vue-next';
import type { DefinicionModuloCliente } from '@/modulos/core/tipos';

export const moduloEmpresas: DefinicionModuloCliente = {
  clave: 'empresas',
  rutas: [
    {
      path: '/empresas',
      name: 'empresas',
      component: () => import('./paginas/ListaEmpresas.vue'),
      meta: { permiso: 'empresas.ver', titulo: 'Empresas' },
    },
  ],
  menu: [{ titulo: 'Empresas', ruta: '/empresas', icono: Building2, permiso: 'empresas.ver', grupo: 'Administración' }],
};
