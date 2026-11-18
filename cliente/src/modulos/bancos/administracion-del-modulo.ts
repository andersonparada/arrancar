import { Scale, Tags } from 'lucide-vue-next';
import type { RouteRecordRaw } from 'vue-router';
import type { EntradaMenu } from '@/modulos/core/tipos';
import { VENTANAS_BANCOS } from './textos';

/** Rutas y entradas de Administración que viven aparte para que `modulo.ts` no crezca de más: Conceptos y Saldos iniciales. */
const metaDeSaldosIniciales = {
  permiso: 'bancos.saldos-iniciales.ver',
  titulo: VENTANAS_BANCOS.saldosIniciales.titulo,
};

export const RUTAS_DE_ADMINISTRACION: RouteRecordRaw[] = [
  {
    path: '/bancos/conceptos',
    name: 'bancos.conceptos',
    component: () => import('./paginas/ListaDeConceptos.vue'),
    meta: { permiso: 'bancos.conceptos.ver', titulo: VENTANAS_BANCOS.conceptos.titulo },
  },
  {
    path: '/bancos/saldos-iniciales',
    name: 'bancos.saldos-iniciales',
    component: () => import('./paginas/SaldosIniciales.vue'),
    meta: metaDeSaldosIniciales,
  },
  {
    path: '/bancos/saldos-iniciales/:cuentaBancariaId',
    name: 'bancos.saldos-iniciales.ficha',
    component: () => import('./paginas/FichaDeSaldoInicial.vue'),
    props: true,
    meta: metaDeSaldosIniciales,
  },
];

export const ENTRADAS_DE_ADMINISTRACION: EntradaMenu[] = [
  {
    titulo: VENTANAS_BANCOS.conceptos.titulo,
    ruta: '/bancos/conceptos',
    icono: Tags,
    seccion: 'administracion',
    permiso: 'bancos.conceptos.ver',
  },
  {
    titulo: VENTANAS_BANCOS.saldosIniciales.titulo,
    ruta: '/bancos/saldos-iniciales',
    icono: Scale,
    seccion: 'administracion',
    permiso: 'bancos.saldos-iniciales.ver',
  },
];
