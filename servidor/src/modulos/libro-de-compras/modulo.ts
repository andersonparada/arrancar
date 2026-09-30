import { dependenciasCompartidas } from '../core/compartido/infraestructura/dependencias-compartidas.js';
import type { DefinicionModulo } from '../core/modulos-sistema/definicion-modulo.js';
import { rutasDelModulo } from '../core/modulos-sistema/rutas-del-modulo.js';
import { rutasDeDatosFiscalesComponidas } from './composicion/datos-fiscales.js';
import { rutasDeConceptosDeGasto } from './composicion/conceptos-de-gasto.js';
import { rutasDeCombustibles } from './composicion/combustibles.js';
import { rutasDeVigenciasDeCombustible } from './composicion/vigencias-de-combustible.js';
// generador: importaciones

/** Raíz de composición: el único lugar donde se eligen las implementaciones concretas. */
function componerRutas() {
  const compartidas = dependenciasCompartidas();
  return rutasDelModulo([
    rutasDeDatosFiscalesComponidas(compartidas),
    rutasDeConceptosDeGasto(),
    rutasDeCombustibles(),
    rutasDeVigenciasDeCombustible(),
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
    // generador: permisos
  ],
  rutas: componerRutas(),
};
