import { DatoInvalido } from '../../core/compartido/dominio/errores.js';
import { Entidad } from '../../core/compartido/dominio/entidad.js';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import { tieneFactorALaReferencia, type Magnitud } from './magnitudes.js';

export type UnidadId = Identificador<'Unidad'>;

/** Lo que el usuario puede escribir de una unidad de medida. */
export interface DatosDeUnidad {
  nombre: string;
  simbolo: string;
  magnitud: Magnitud;
  /** Cuántas unidades de referencia (libra, galón, metro, metro cuadrado) trae una; solo en masa, volumen, longitud y superficie. */
  factorALaReferencia: string | null;
  activo: boolean;
}

export interface PropiedadesDeUnidad extends DatosDeUnidad {
  id: UnidadId;
  empresaId: Identificador<'Empresa'>;
}

/** Un dato de la unidad de medida no cumple sus reglas. */
export class UnidadInvalido extends DatoInvalido {
  readonly codigo = 'unidad_invalido';
}

/** Recorta el texto, exige que no quede vacío y que quepa en su largo. */
function textoObligatorio(texto: string, campo: string, maximo: number): string {
  const limpio = texto.trim();
  if (!limpio) throw new UnidadInvalido(`Escriba "${campo}".`);
  if (limpio.length > maximo) throw new UnidadInvalido(`"${campo}" no puede pasar de ${maximo} caracteres.`);
  return limpio;
}

/** Las de masa, volumen, longitud y superficie llevan su factor (mayor que cero); las demás no. */
function factorValido({ magnitud, factorALaReferencia }: DatosDeUnidad): string | null {
  if (!tieneFactorALaReferencia(magnitud)) {
    if (factorALaReferencia !== null)
      throw new UnidadInvalido('Solo masa, volumen, longitud y superficie llevan factor.');
    return null;
  }
  if (factorALaReferencia === null || !(Number(factorALaReferencia) > 0))
    throw new UnidadInvalido('Escriba el factor a la unidad de referencia, mayor que cero.');
  return factorALaReferencia;
}

function datosValidos(datos: DatosDeUnidad): DatosDeUnidad {
  return {
    ...datos,
    nombre: textoObligatorio(datos.nombre, 'Nombre', 40),
    simbolo: textoObligatorio(datos.simbolo, 'Símbolo', 10),
    factorALaReferencia: factorValido(datos),
  };
}

/** Unidad de medida de la empresa. Sus reglas van aquí, en el dominio. */
export class Unidad extends Entidad<UnidadId> {
  private constructor(private propiedades: PropiedadesDeUnidad) {
    super(propiedades.id);
  }

  static crear(empresaId: Identificador<'Empresa'>, datos: DatosDeUnidad): Unidad {
    return new Unidad({ ...datosValidos(datos), empresaId, id: Identificador.nuevo() });
  }

  static reconstruir(propiedades: PropiedadesDeUnidad): Unidad {
    return new Unidad(propiedades);
  }

  cambiarDatos(datos: DatosDeUnidad): void {
    this.propiedades = { ...this.propiedades, ...datosValidos(datos) };
  }

  /** Copia de solo lectura de sus propiedades, para guardarla. */
  instantanea(): Readonly<PropiedadesDeUnidad> {
    return { ...this.propiedades };
  }
}
