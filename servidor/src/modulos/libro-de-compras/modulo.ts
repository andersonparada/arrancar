import { dependenciasCompartidas } from '../core/compartido/infraestructura/dependencias-compartidas.js';
import type { DefinicionModulo } from '../core/modulos-sistema/definicion-modulo.js';
import { rutasDelModulo } from '../core/modulos-sistema/rutas-del-modulo.js';
import { rutasDeDatosFiscalesComponidas } from './composicion/datos-fiscales.js';
import { rutasDeDocumentosComponidas } from './composicion/documentos.js';
import { rutasDeConceptosDeGasto } from './composicion/conceptos-de-gasto.js';
import { rutasDeCombustibles } from './composicion/combustibles.js';
import { configuracionDelLibroDeCompras } from './configuracion.js';
import { rutasDeVigenciasDeCombustible } from './composicion/vigencias-de-combustible.js';
import { rutasDeAnalisisComponidas } from './composicion/analisis.js';
import { rutasDeLibro } from './composicion/libro.js';
import { rutasDePeriodosComponidas } from './composicion/periodos.js';
import { rutasDeRetencionesComponidas } from './composicion/retenciones.js';
// generador: importaciones

/** Raíz de composición: el único lugar donde se eligen las implementaciones concretas. */
function componerRutas() {
  const compartidas = dependenciasCompartidas();
  return rutasDelModulo([
    rutasDeDatosFiscalesComponidas(compartidas),
    rutasDeConceptosDeGasto(),
    rutasDeCombustibles(),
    rutasDeVigenciasDeCombustible(),
    rutasDeDocumentosComponidas(),
    rutasDeLibro(),
    rutasDeRetencionesComponidas(),
    rutasDePeriodosComponidas(),
    rutasDeAnalisisComponidas(),
    // generador: rutas
  ]);
}

/** Registro fiscal de las compras: facturas, notas de credito, IDP y retenciones. Ver `docs/modulos/libro-de-compras.md`. */
export const moduloLibroDeCompras: DefinicionModulo = {
  clave: 'libro-de-compras',
  nombre: 'Libro de compras',
  descripcion: 'Registro fiscal de las compras: facturas, notas de credito, IDP y retenciones.',
  dependeDe: ['terceros'],
  permisos: [
    { clave: 'libro-de-compras.conceptos-de-gasto.ver', descripcion: 'Ver conceptos de gasto' },
    { clave: 'libro-de-compras.conceptos-de-gasto.crear', descripcion: 'Registrar conceptos de gasto' },
    {
      clave: 'libro-de-compras.conceptos-de-gasto.editar',
      descripcion: 'Editar, inactivar y reactivar conceptos de gasto',
    },
    { clave: 'libro-de-compras.conceptos-de-gasto.importar', descripcion: 'Importar conceptos de gasto desde Excel' },
    { clave: 'libro-de-compras.conceptos-de-gasto.exportar', descripcion: 'Exportar conceptos de gasto a Excel' },
    { clave: 'libro-de-compras.combustibles.ver', descripcion: 'Ver combustibles' },
    { clave: 'libro-de-compras.combustibles.crear', descripcion: 'Registrar combustibles' },
    { clave: 'libro-de-compras.combustibles.editar', descripcion: 'Editar, inactivar y reactivar combustibles' },
    { clave: 'libro-de-compras.combustibles.importar', descripcion: 'Importar combustibles desde Excel' },
    { clave: 'libro-de-compras.combustibles.exportar', descripcion: 'Exportar combustibles a Excel' },
    { clave: 'libro-de-compras.vigencias-de-combustible.ver', descripcion: 'Ver vigencias de combustible' },
    { clave: 'libro-de-compras.vigencias-de-combustible.crear', descripcion: 'Registrar vigencias de combustible' },
    { clave: 'libro-de-compras.vigencias-de-combustible.editar', descripcion: 'Editar vigencias de combustible' },
    { clave: 'libro-de-compras.vigencias-de-combustible.eliminar', descripcion: 'Eliminar vigencias de combustible' },
    {
      clave: 'libro-de-compras.vigencias-de-combustible.importar',
      descripcion: 'Importar vigencias de combustible desde Excel',
    },
    {
      clave: 'libro-de-compras.vigencias-de-combustible.exportar',
      descripcion: 'Exportar vigencias de combustible a Excel',
    },
    { clave: 'libro-de-compras.documentos.ver', descripcion: 'Ver los documentos del libro de compras' },
    {
      clave: 'libro-de-compras.documentos.crear',
      descripcion: 'Registrar documentos de compra (facturas, notas de crédito y recibos)',
    },
    {
      clave: 'libro-de-compras.documentos.anular',
      descripcion: 'Anular documentos de compra (el número queda libre y el destino revierte lo suyo)',
    },
    {
      clave: 'libro-de-compras.documentos.eliminar',
      descripcion: 'Eliminar documentos de compra que no se han procesado en su destino',
    },
    {
      clave: 'libro-de-compras.retenciones.ajustar',
      descripcion: 'Cambiar o quitar las retenciones que el sistema propone al registrar un documento',
    },
    { clave: 'libro-de-compras.libro.ver', descripcion: 'Ver el libro de compras del período y su anexo de anulados' },
    { clave: 'libro-de-compras.libro.exportar', descripcion: 'Exportar el libro de compras del período' },
    {
      clave: 'libro-de-compras.libro.emitir',
      descripcion: 'Emitir el libro de compras en PDF con folios y corregir el último folio',
    },
    {
      clave: 'libro-de-compras.retenciones.ver',
      descripcion: 'Ver las retenciones del mes, lo por resolver y los enteros',
    },
    { clave: 'libro-de-compras.retenciones.exportar', descripcion: 'Exportar las retenciones del mes a Excel' },
    {
      clave: 'libro-de-compras.retenciones.constancias',
      descripcion:
        'Anotar, cambiar y quitar constancias de retención y resolver las retenciones de documentos anulados',
    },
    {
      clave: 'libro-de-compras.retenciones.enterar',
      descripcion: 'Marcar como enterados, corregir y anular los pagos de las retenciones',
    },
    {
      clave: 'libro-de-compras.periodos.ver',
      descripcion: 'Ver los períodos del libro, su historial de declaraciones y lo que cambió desde declararlos',
    },
    {
      clave: 'libro-de-compras.periodos.declarar',
      descripcion: 'Declarar y rectificar períodos del libro y encender el bloqueo de los períodos declarados',
    },
    {
      clave: 'libro-de-compras.periodos.reabrir',
      descripcion: 'Reabrir períodos declarados y apagar el bloqueo de los períodos declarados',
    },
    {
      clave: 'libro-de-compras.analisis-de-compras.ver',
      descripcion:
        'Ver los análisis de compras: por proveedor, por concepto, IVA al costo, activos fijos y combustibles',
    },
    {
      clave: 'libro-de-compras.analisis-de-compras.exportar',
      descripcion: 'Exportar a Excel los análisis de compras',
    },
    // generador: permisos
  ],
  configuracion: configuracionDelLibroDeCompras,
  rutas: componerRutas(),
};
