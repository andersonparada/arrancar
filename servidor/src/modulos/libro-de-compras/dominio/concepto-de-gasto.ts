import { DatoInvalido } from '../../core/compartido/dominio/errores.js';
import { Entidad } from '../../core/compartido/dominio/entidad.js';
import { Identificador } from '../../core/compartido/dominio/identificador.js';

export type ConceptoDeGastoId = Identificador<'ConceptoDeGasto'>;

/** Lo que el usuario puede escribir de un concepto de gasto. */
export interface DatosDeConceptoDeGasto {
  nombre: string;
  tipoPorOmision: 'bien' | 'servicio';
  esProductoAgropecuario: boolean;
  esActivoFijo: boolean;
  esInventario: boolean;
  activo: boolean;
}

export interface PropiedadesDeConceptoDeGasto extends DatosDeConceptoDeGasto {
  id: ConceptoDeGastoId;
  empresaId: Identificador<'Empresa'>;
}

/** Un dato del concepto de gasto no cumple sus reglas. */
export class ConceptoDeGastoInvalido extends DatoInvalido {
  readonly codigo = 'concepto_de_gasto_invalido';
}

/** Recorta el texto y exige que no quede vacío. */
function textoObligatorio(texto: string, campo: string): string {
  const limpio = texto.trim();
  if (!limpio) throw new ConceptoDeGastoInvalido(`Escriba "${campo}".`);
  return limpio;
}

/**
 * Los textos obligatorios no pueden quedar vacíos; un servicio también puede capitalizarse como activo fijo,
 * pero no es inventario, y el costo no puede ir a la vez a activo fijo y a inventario.
 */
function datosValidos(datos: DatosDeConceptoDeGasto): DatosDeConceptoDeGasto {
  if (datos.esActivoFijo && datos.esInventario) {
    throw new ConceptoDeGastoInvalido('Un concepto no puede ser a la vez activo fijo e inventario.');
  }
  if (datos.esInventario && datos.tipoPorOmision !== 'bien') {
    throw new ConceptoDeGastoInvalido('Un concepto de inventario debe ser un bien.');
  }
  return { ...datos, nombre: textoObligatorio(datos.nombre, 'Nombre') };
}

/** Concepto de gasto de la empresa. Sus reglas van aquí, en el dominio. */
export class ConceptoDeGasto extends Entidad<ConceptoDeGastoId> {
  private constructor(private propiedades: PropiedadesDeConceptoDeGasto) {
    super(propiedades.id);
  }

  static crear(empresaId: Identificador<'Empresa'>, datos: DatosDeConceptoDeGasto): ConceptoDeGasto {
    return new ConceptoDeGasto({ ...datosValidos(datos), empresaId, id: Identificador.nuevo() });
  }

  static reconstruir(propiedades: PropiedadesDeConceptoDeGasto): ConceptoDeGasto {
    return new ConceptoDeGasto(propiedades);
  }

  cambiarDatos(datos: DatosDeConceptoDeGasto): void {
    this.propiedades = { ...this.propiedades, ...datosValidos(datos) };
  }

  /** Copia de solo lectura de sus propiedades, para guardarla. */
  instantanea(): Readonly<PropiedadesDeConceptoDeGasto> {
    return { ...this.propiedades };
  }
}
