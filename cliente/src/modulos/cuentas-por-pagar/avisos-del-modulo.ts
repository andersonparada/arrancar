import { Mail } from 'lucide-vue-next';
import type { RouteRecordRaw } from 'vue-router';
import type { EntradaMenu } from '@/modulos/core/tipos';

/** Los nombres de la pantalla «Avisos de pago» (los demás están en `textos.ts`, que ya no admite más líneas). */
export const VENTANA_DE_AVISOS_DE_PAGO = {
  titulo: 'Avisos de pago',
  descripcion:
    'Cuándo se le avisa por correo al proveedor que se le pagó, y cómo se escribe el aviso. Vale para esta empresa.',
} as const;

const PERMISO_DE_CONFIGURAR = 'cuentas-por-pagar.avisos-de-pago.configurar';

/** La pantalla de los ajustes de los avisos de pago de la empresa. */
export const rutasDeAvisos: RouteRecordRaw[] = [
  {
    path: '/cuentas-por-pagar/avisos-de-pago',
    name: 'cuentas-por-pagar.avisos-de-pago',
    component: () => import('./paginas/AvisosDePago.vue'),
    meta: { permiso: PERMISO_DE_CONFIGURAR, titulo: VENTANA_DE_AVISOS_DE_PAGO.titulo },
  },
];

export const entradasDeAvisos: EntradaMenu[] = [
  {
    titulo: VENTANA_DE_AVISOS_DE_PAGO.titulo,
    ruta: '/cuentas-por-pagar/avisos-de-pago',
    icono: Mail,
    seccion: 'administracion',
    permiso: PERMISO_DE_CONFIGURAR,
  },
];
