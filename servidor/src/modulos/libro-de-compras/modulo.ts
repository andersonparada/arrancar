import { dependenciasCompartidas } from '../core/compartido/infraestructura/dependencias-compartidas.js';
import type { DefinicionModulo } from '../core/modulos-sistema/definicion-modulo.js';
import { rutasDelModulo } from '../core/modulos-sistema/rutas-del-modulo.js';
import { rutasDeDatosFiscalesComponidas } from './composicion/datos-fiscales.js';
// generador: importaciones

/** Raíz de composición: el único lugar donde se eligen las implementaciones concretas. */
function componerRutas() {
  const compartidas = dependenciasCompartidas();
  return rutasDelModulo([
    rutasDeDatosFiscalesComponidas(compartidas),
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
    // generador: permisos
  ],
  rutas: componerRutas(),
};
