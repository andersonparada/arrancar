import { Identificador } from '../../core/compartido/dominio/identificador.js';
import { Activo } from './activo.js';
import { validarCodigo } from './reglas-de-activo.js';

/** Lo propio de cada pieza que un activo separado no hereda. */
const SIN_IDENTIFICACION = { numeroDeSerie: null, placa: null, fotoArchivoId: null, observaciones: null } as const;

/**
 * Separa `cantidad` unidades de un activo en otro nuevo con el código dado (§6.11): copia la descripción, la clase, el
 * tipo de registro, la marca, el modelo, las fechas, los parámetros de depreciación, la ubicación, el ocio y la alta
 * conjunta; no copia serie, placa, foto ni observaciones. El origen queda con las que sobran. Los montos los reparte quien
 * divide.
 * @throws ActivoInvalido si el código o la cantidad no sirven.
 */
export function separarActivo(origen: Activo, { cantidad, codigo }: { cantidad: number; codigo: string }): Activo {
  const propiedades = origen.instantanea();
  const nuevo = Activo.reconstruir({
    ...propiedades,
    ...SIN_IDENTIFICACION,
    id: Identificador.nuevo(),
    codigo: validarCodigo(codigo),
    cantidad,
  });
  origen.cambiarCantidad(propiedades.cantidad - cantidad);
  return nuevo;
}
