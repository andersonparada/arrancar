import type { DefinicionModulo } from '../core/modulos-sistema/definicion-modulo.js';
import { rutasDelModulo } from '../core/modulos-sistema/rutas-del-modulo.js';
import { rutasDeDocumentosComponidas } from './composicion/documentos.js';
import { configuracionDeCuentasPorPagar } from './configuracion.js';
// generador: importaciones

/**
 * Lo que cada empresa debe a sus proveedores: documentos recibidos de Libro de compras, vencimientos, autorización,
 * contraseñas y pagos. Ver `docs/modulos/cuentas-por-pagar.md`.
 */
export const moduloCuentasPorPagar: DefinicionModulo = {
  clave: 'cuentas-por-pagar',
  nombre: 'Cuentas por pagar',
  descripcion:
    'Lo que cada empresa debe a sus proveedores: documentos, vencimientos, autorización, contraseñas y pagos',
  dependeDe: ['libro-de-compras', 'bancos'],
  permisos: [
    { clave: 'cuentas-por-pagar.documentos.ver', descripcion: 'Ver la bandeja, los documentos por pagar y sus saldos' },
    {
      clave: 'cuentas-por-pagar.documentos.registrar',
      descripcion: 'Completar los documentos de la bandeja y cambiar su vencimiento',
    },
    { clave: 'cuentas-por-pagar.documentos.autorizar', descripcion: 'Autorizar documentos por pagar' },
    {
      clave: 'cuentas-por-pagar.documentos.autorizar-propios',
      descripcion: 'Autorizar documentos que uno mismo ingresó o completó (excepción a la separación de funciones)',
    },
    {
      clave: 'cuentas-por-pagar.documentos.anular',
      descripcion: 'Anular documentos por pagar (anula también su registro en el libro de compras)',
    },
    {
      clave: 'cuentas-por-pagar.documentos.eliminar',
      descripcion: 'Eliminar documentos por pagar que no están autorizados (también en el libro de compras)',
    },
    // generador: permisos
  ],
  configuracion: configuracionDeCuentasPorPagar,
  rutas: rutasDelModulo([
    rutasDeDocumentosComponidas(),
    // generador: rutas
  ]),
};
