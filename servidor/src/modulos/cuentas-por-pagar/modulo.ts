import type { DefinicionModulo } from '../core/modulos-sistema/definicion-modulo.js';
import { rutasDelModulo } from '../core/modulos-sistema/rutas-del-modulo.js';
import { rutasDeAccionesComponidas } from './composicion/acciones.js';
import { rutasDeBajasComponidas } from './composicion/bajas.js';
import { rutasDeCondicionesComponidas } from './composicion/condiciones.js';
import { rutasDeConsultasComponidas } from './composicion/consultas.js';
import { rutasDeDocumentosComponidas } from './composicion/documentos.js';
import { escuchasDeFechaDeInicioComponidas } from './composicion/fecha-de-inicio.js';
import { rutasDeSaldosInicialesComponidas } from './composicion/saldos-iniciales.js';
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
    { clave: 'cuentas-por-pagar.saldos-iniciales.ver', descripcion: 'Ver los saldos iniciales cargados' },
    {
      clave: 'cuentas-por-pagar.saldos-iniciales.crear',
      descripcion: 'Cargar saldos iniciales (documentos del sistema anterior que seguían pendientes)',
    },
    {
      clave: 'cuentas-por-pagar.saldos-iniciales.editar',
      descripcion: 'Corregir saldos iniciales mientras la carga inicial esté abierta',
    },
    {
      clave: 'cuentas-por-pagar.saldos-iniciales.eliminar',
      descripcion: 'Eliminar saldos iniciales mientras la carga inicial esté abierta',
    },
    {
      clave: 'cuentas-por-pagar.saldos-iniciales.importar',
      descripcion: 'Importar saldos iniciales desde Excel (también bajar la plantilla)',
    },
    {
      clave: 'cuentas-por-pagar.saldos-iniciales.exportar',
      descripcion: 'Exportar la lista de saldos iniciales y su cuadre',
    },
    // generador: permisos
  ],
  configuracion: configuracionDeCuentasPorPagar,
  rutas: rutasDelModulo([
    rutasDeDocumentosComponidas(),
    rutasDeCondicionesComponidas(),
    rutasDeConsultasComponidas(),
    rutasDeAccionesComponidas(),
    rutasDeBajasComponidas(),
    escuchasDeFechaDeInicioComponidas(),
    rutasDeSaldosInicialesComponidas(),
    // generador: rutas
  ]),
};
