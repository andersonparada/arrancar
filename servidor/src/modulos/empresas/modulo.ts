import type { DefinicionModulo } from '../core/modulos-sistema/definicion-modulo.js';
import { rutasEmpresas } from './rutas/empresas.rutas.js';

export const moduloEmpresas: DefinicionModulo = {
  clave: 'empresas',
  nombre: 'Empresas',
  descripcion: 'Ranchos y parcelas de la cuenta y sus datos generales.',
  esencial: true,
  permisos: [
    { clave: 'empresas.ver', descripcion: 'Ver las empresas de la cuenta' },
    { clave: 'empresas.gestionar', descripcion: 'Crear y editar empresas y su fierro' },
  ],
  rutas: rutasEmpresas,
};
