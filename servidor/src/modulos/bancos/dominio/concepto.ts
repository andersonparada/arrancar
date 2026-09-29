import { DatoInvalido } from '../../core/compartido/dominio/errores.js';
import { Entidad } from '../../core/compartido/dominio/entidad.js';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import { ConceptoDeSistema } from './errores-de-conceptos.js';

export type ConceptoId = Identificador<'Concepto'>;

/** Lo que el usuario puede escribir de un concepto. */
export interface DatosDeConcepto {
  nombre: string;
  aplicaA: 'credito' | 'debito' | 'ambos';
  actividadDeFlujo: 'operacion' | 'inversion' | 'financiamiento' | 'ninguna';
  grupoDeFlujo: string | null;
  esCargoBancario: boolean;
  pideDatosDeIntereses: boolean;
  admiteFactura: boolean;
  activo: boolean;
}

export interface PropiedadesDeConcepto extends DatosDeConcepto {
  id: ConceptoId;
  empresaId: Identificador<'Empresa'>;
  /** Solo los conceptos que el sistema usa por su cuenta la tienen; el usuario nunca la escribe. */
  claveDeSistema: string | null;
}

/** Un dato del concepto no cumple sus reglas. */
export class ConceptoInvalido extends DatoInvalido {
  readonly codigo = 'concepto_invalido';
}

/** Recorta el texto y exige que no quede vacío. */
function textoObligatorio(texto: string, campo: string): string {
  const limpio = texto.trim();
  if (!limpio) throw new ConceptoInvalido(`Escriba "${campo}".`);
  return limpio;
}

/** El grupo del flujo es opcional: un texto en blanco es lo mismo que ninguno. */
function grupoOpcional(grupo: string | null): string | null {
  return grupo?.trim() || null;
}

/** Los intereses los acredita el banco: solo una nota de crédito puede pedir sus datos (H8). */
function exigirInteresesCoherentes({ pideDatosDeIntereses, aplicaA }: DatosDeConcepto): void {
  if (pideDatosDeIntereses && aplicaA === 'debito') {
    throw new ConceptoInvalido('Los datos de intereses solo se piden en notas de crédito o en ambas.');
  }
}

/** Los textos obligatorios no pueden quedar vacíos y las banderas deben ser coherentes. */
function datosValidos(datos: DatosDeConcepto): DatosDeConcepto {
  exigirInteresesCoherentes(datos);
  return {
    ...datos,
    nombre: textoObligatorio(datos.nombre, 'Nombre'),
    grupoDeFlujo: grupoOpcional(datos.grupoDeFlujo),
  };
}

/** Concepto de la empresa. Sus reglas van aquí, en el dominio. */
export class Concepto extends Entidad<ConceptoId> {
  private constructor(private propiedades: PropiedadesDeConcepto) {
    super(propiedades.id);
  }

  /** Un concepto que el usuario registra: nunca es de sistema. */
  static crear(empresaId: Identificador<'Empresa'>, datos: DatosDeConcepto): Concepto {
    return new Concepto({ ...datosValidos(datos), empresaId, id: Identificador.nuevo(), claveDeSistema: null });
  }

  /** Un concepto que el sistema usa por su cuenta (semilla); se reconoce por su clave. */
  static crearDeSistema(empresaId: Identificador<'Empresa'>, clave: string, datos: DatosDeConcepto): Concepto {
    return new Concepto({ ...datosValidos(datos), empresaId, id: Identificador.nuevo(), claveDeSistema: clave });
  }

  static reconstruir(propiedades: PropiedadesDeConcepto): Concepto {
    return new Concepto(propiedades);
  }

  get esDeSistema(): boolean {
    return this.propiedades.claveDeSistema !== null;
  }

  /** @throws ConceptoDeSistema si lo usa el sistema. */
  cambiarDatos(datos: DatosDeConcepto): void {
    this.exigirQueNoSeaDeSistema();
    this.propiedades = { ...this.propiedades, ...datosValidos(datos) };
  }

  /** @throws ConceptoDeSistema si lo usa el sistema. */
  exigirQueSePuedaEliminar(): void {
    this.exigirQueNoSeaDeSistema();
  }

  /** Copia de solo lectura de sus propiedades, para guardarla. */
  instantanea(): Readonly<PropiedadesDeConcepto> {
    return { ...this.propiedades };
  }

  private exigirQueNoSeaDeSistema(): void {
    if (this.esDeSistema) throw new ConceptoDeSistema();
  }
}
