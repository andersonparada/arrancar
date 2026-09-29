import { DatoInvalido } from '../../core/compartido/dominio/errores.js';
import { Entidad } from '../../core/compartido/dominio/entidad.js';
import { Identificador } from '../../core/compartido/dominio/identificador.js';

export type TipoDeLocalidadId = Identificador<'TipoDeLocalidad'>;

/** Lo que el usuario puede escribir de un tipo de localidad. */
export interface DatosDeTipoDeLocalidad {
  nombre: string;
  activo: boolean;
}

export interface PropiedadesDeTipoDeLocalidad extends DatosDeTipoDeLocalidad {
  id: TipoDeLocalidadId;
  empresaId: Identificador<'Empresa'>;
}

/** Un dato del tipo de localidad no cumple sus reglas. */
export class TipoDeLocalidadInvalido extends DatoInvalido {
  readonly codigo = 'tipo_de_localidad_invalido';
}

/** Largo máximo del nombre; la base de datos lo exige con un `check`. */
export const LARGO_MAXIMO_DEL_NOMBRE = 60;

/** Recorta el nombre y exige que no quede vacío ni pase del largo máximo. */
function nombreValido(nombre: string): string {
  const limpio = nombre.trim();
  if (!limpio) throw new TipoDeLocalidadInvalido('Escriba "Nombre".');
  if (limpio.length > LARGO_MAXIMO_DEL_NOMBRE) {
    throw new TipoDeLocalidadInvalido(`"Nombre" no puede pasar de ${LARGO_MAXIMO_DEL_NOMBRE} caracteres.`);
  }
  return limpio;
}

function datosValidos(datos: DatosDeTipoDeLocalidad): DatosDeTipoDeLocalidad {
  return { ...datos, nombre: nombreValido(datos.nombre) };
}

/** Tipo de localidad de la empresa. Sus reglas van aquí, en el dominio. */
export class TipoDeLocalidad extends Entidad<TipoDeLocalidadId> {
  private constructor(private propiedades: PropiedadesDeTipoDeLocalidad) {
    super(propiedades.id);
  }

  static crear(empresaId: Identificador<'Empresa'>, datos: DatosDeTipoDeLocalidad): TipoDeLocalidad {
    return new TipoDeLocalidad({ ...datosValidos(datos), empresaId, id: Identificador.nuevo() });
  }

  static reconstruir(propiedades: PropiedadesDeTipoDeLocalidad): TipoDeLocalidad {
    return new TipoDeLocalidad(propiedades);
  }

  cambiarDatos(datos: DatosDeTipoDeLocalidad): void {
    this.propiedades = { ...this.propiedades, ...datosValidos(datos) };
  }

  /** Copia de solo lectura de sus propiedades, para guardarla. */
  instantanea(): Readonly<PropiedadesDeTipoDeLocalidad> {
    return { ...this.propiedades };
  }
}
