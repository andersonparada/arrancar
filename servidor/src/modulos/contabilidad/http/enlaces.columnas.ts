import { opcionesDe, type Columna } from '../../core/intercambio/aplicacion/columnas.js';
import type { ConsultasCuentas } from '../aplicacion/puertos/consultas-cuentas.js';
import { ROLES_DE_CUENTA } from '../../core/contratos/contabilidad.contratos.js';
import { DEFINICIONES_DE_ROLES } from '../dominio/roles-de-enlace.js';

const NOMBRES_DE_ROL = Object.fromEntries(ROLES_DE_CUENTA.map((rol) => [rol, DEFINICIONES_DE_ROLES[rol].nombre]));

/**
 * Las columnas del Excel de los enlaces: el rol, la llave por su nombre (vacía si el rol no lleva o es la de todo el
 * rol) y la cuenta por su código. Solo se enlazan cuentas de detalle y activas (lo revisa el dominio al importar).
 */
export function columnasDeEnlaces(cuentas: Pick<ConsultasCuentas, 'listar'>): Columna[] {
  return [
    { clave: 'rol', titulo: 'Rol', requerido: true, tipo: 'lista', opciones: NOMBRES_DE_ROL },
    { clave: 'llaveNombre', titulo: 'Llave', requerido: false, tipo: 'texto' },
    {
      clave: 'cuentaId',
      titulo: 'Cuenta',
      requerido: true,
      tipo: 'referencia',
      campoDeNombre: 'cuentaCodigo',
      opciones: opcionesDe(cuentas, 'codigo'),
    },
  ];
}
