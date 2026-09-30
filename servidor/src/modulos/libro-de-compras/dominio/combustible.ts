import { DatoInvalido } from '../../core/compartido/dominio/errores.js';
import { Entidad } from '../../core/compartido/dominio/entidad.js';
import { Identificador } from '../../core/compartido/dominio/identificador.js';

export type CombustibleId = Identificador<'Combustible'>;

/** Lo que el usuario puede escribir de un combustible. */
export interface DatosDeCombustible {
  nombre: string;
  activo: boolean;
}

export interface PropiedadesDeCombustible extends DatosDeCombustible {
  id: CombustibleId;
  empresaId: Identificador<'Empresa'>;
}

/** Un dato del combustible no cumple sus reglas. */
export class CombustibleInvalido extends DatoInvalido {
  readonly codigo = 'combustible_invalido';
}

/** Recorta el texto y exige que no quede vacío. */
function textoObligatorio(texto: string, campo: string): string {
  const limpio = texto.trim();
  if (!limpio) throw new CombustibleInvalido(`Escriba "${campo}".`);
  return limpio;
}

/** Los textos obligatorios no pueden quedar vacíos. */
function datosValidos(datos: DatosDeCombustible): DatosDeCombustible {
  return { ...datos, nombre: textoObligatorio(datos.nombre, 'Nombre') };
}

/** Combustible de la empresa. Sus reglas van aquí, en el dominio. */
export class Combustible extends Entidad<CombustibleId> {
  private constructor(private propiedades: PropiedadesDeCombustible) {
    super(propiedades.id);
  }

  static crear(empresaId: Identificador<'Empresa'>, datos: DatosDeCombustible): Combustible {
    return new Combustible({ ...datosValidos(datos), empresaId, id: Identificador.nuevo() });
  }

  static reconstruir(propiedades: PropiedadesDeCombustible): Combustible {
    return new Combustible(propiedades);
  }

  cambiarDatos(datos: DatosDeCombustible): void {
    this.propiedades = { ...this.propiedades, ...datosValidos(datos) };
  }

  /** Copia de solo lectura de sus propiedades, para guardarla. */
  instantanea(): Readonly<PropiedadesDeCombustible> {
    return { ...this.propiedades };
  }
}
