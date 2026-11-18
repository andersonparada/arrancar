import type { DefinicionModulo } from '../core/modulos-sistema/definicion-modulo.js';
import { rutasDelModulo } from '../core/modulos-sistema/rutas-del-modulo.js';
import { ALCANCE_DE_FONDOS } from './infraestructura/persistencia/accesos-a-fondos.tablas.js';
import { PERMISOS_DE_CAJA_CHICA } from './permisos.js';
// generador: importaciones

/**
 * Fondos fijos de efectivo a cargo de un custodio para gastos menores, con reposición, arqueo y cierre. Ver
 * `docs/modulos/caja-chica.md`.
 */
export const moduloCajaChica: DefinicionModulo = {
  clave: 'caja-chica',
  nombre: 'Caja chica',
  descripcion: 'Fondos fijos de efectivo a cargo de un custodio para gastos menores, con reposición, arqueo y cierre',
  dependeDe: ['libro-de-compras', 'bancos'],
  permisos: PERMISOS_DE_CAJA_CHICA,
  recursosConAlcance: [
    {
      clave: 'caja-chica.fondos',
      descripcion: 'Fondos de caja chica',
      permisoVerTodos: 'caja-chica.fondos.ver-todos',
      permisoAsignar: 'caja-chica.fondos.asignar',
      alcance: ALCANCE_DE_FONDOS,
    },
  ],
  rutas: rutasDelModulo([
    // generador: rutas
  ]),
};
