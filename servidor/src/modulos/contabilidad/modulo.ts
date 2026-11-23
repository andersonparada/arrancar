import type { DefinicionModulo } from '../core/modulos-sistema/definicion-modulo.js';
import { rutasDelModulo } from '../core/modulos-sistema/rutas-del-modulo.js';
import { rutasDeCuentas } from './composicion/cuentas.js';
import { rutasDeInicio } from './composicion/inicio.js';
// generador: importaciones

/**
 * Nomenclatura, partidas, períodos y libros contables por empresa. Ver `docs/modulos/contabilidad.md` y
 * `docs/modulos/diseno-contabilidad.md`. Escucha a los demás módulos; ninguno depende de él.
 */
export const moduloContabilidad: DefinicionModulo = {
  clave: 'contabilidad',
  nombre: 'Contabilidad',
  descripcion: 'Nomenclatura, partidas, períodos y libros contables por empresa',
  dependeDe: ['terceros'],
  permisos: [
    { clave: 'contabilidad.inicio.ver', descripcion: 'Ver el inicio de la contabilidad (fecha, máscara y firmantes)' },
    {
      clave: 'contabilidad.inicio.editar',
      descripcion: 'Iniciar la contabilidad y cambiar su fecha, máscara de códigos y firmantes',
    },
    { clave: 'contabilidad.cuentas.ver', descripcion: 'Ver la nomenclatura (cuentas contables)' },
    { clave: 'contabilidad.cuentas.crear', descripcion: 'Registrar cuentas contables' },
    { clave: 'contabilidad.cuentas.editar', descripcion: 'Editar, inactivar y reactivar cuentas contables' },
    { clave: 'contabilidad.cuentas.eliminar', descripcion: 'Eliminar cuentas contables que no se usan' },
    { clave: 'contabilidad.cuentas.importar', descripcion: 'Importar la nomenclatura desde Excel' },
    { clave: 'contabilidad.cuentas.exportar', descripcion: 'Exportar la nomenclatura a Excel' },
    // generador: permisos
  ],
  rutas: rutasDelModulo([
    rutasDeInicio(),
    rutasDeCuentas(),
    // generador: rutas
  ]),
};
