import { DatoInvalido, ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';
import { Entidad } from '../../core/compartido/dominio/entidad.js';
import { Identificador } from '../../core/compartido/dominio/identificador.js';

export type ConceptoDeIngresoId = Identificador<'ConceptoDeIngreso'>;

/** Lo que el usuario puede escribir de un concepto de ingreso. */
export interface DatosDeConceptoDeIngreso {
  nombre: string;
  tipo: 'bien' | 'servicio';
  activo: boolean;
}

/** Los conceptos que el módulo necesita para sus propias reglas (una venta de activo fijo alimenta a Activos fijos). */
export type ClaveDeSistemaDeIngreso = 'venta_de_activo_fijo';

export interface PropiedadesDeConceptoDeIngreso extends DatosDeConceptoDeIngreso {
  id: ConceptoDeIngresoId;
  empresaId: Identificador<'Empresa'>;
  claveDeSistema: ClaveDeSistemaDeIngreso | null;
}

/** El concepto de sistema no se edita, no se inactiva y no se elimina. */
export class ConceptoDeIngresoDeSistema extends ReglaDeNegocioInfringida {
  readonly codigo = 'concepto_de_ingreso_de_sistema';

  constructor() {
    super('Este concepto de ingreso es del sistema: no se puede editar, inactivar ni eliminar.');
  }
}

/** Un dato del concepto de ingreso no cumple sus reglas. */
export class ConceptoDeIngresoInvalido extends DatoInvalido {
  readonly codigo = 'concepto_de_ingreso_invalido';
}

/** Recorta el texto y exige que no quede vacío. */
function textoObligatorio(texto: string, campo: string): string {
  const limpio = texto.trim();
  if (!limpio) throw new ConceptoDeIngresoInvalido(`Escriba "${campo}".`);
  return limpio;
}

/** Los textos obligatorios no pueden quedar vacíos. */
function datosValidos(datos: DatosDeConceptoDeIngreso): DatosDeConceptoDeIngreso {
  return { ...datos, nombre: textoObligatorio(datos.nombre, 'Nombre') };
}

/** Concepto de ingreso de la empresa. Sus reglas van aquí, en el dominio. */
export class ConceptoDeIngreso extends Entidad<ConceptoDeIngresoId> {
  private constructor(private propiedades: PropiedadesDeConceptoDeIngreso) {
    super(propiedades.id);
  }

  static crear(
    empresaId: Identificador<'Empresa'>,
    datos: DatosDeConceptoDeIngreso,
    claveDeSistema: ClaveDeSistemaDeIngreso | null = null,
  ): ConceptoDeIngreso {
    return new ConceptoDeIngreso({ ...datosValidos(datos), empresaId, id: Identificador.nuevo(), claveDeSistema });
  }

  static reconstruir(propiedades: PropiedadesDeConceptoDeIngreso): ConceptoDeIngreso {
    return new ConceptoDeIngreso(propiedades);
  }

  /** @throws ConceptoDeIngresoDeSistema si es de sistema. */
  cambiarDatos(datos: DatosDeConceptoDeIngreso): void {
    this.exigirQueNoSeaDeSistema();
    this.propiedades = { ...this.propiedades, ...datosValidos(datos) };
  }

  /** @throws ConceptoDeIngresoDeSistema si es de sistema. */
  exigirQueNoSeaDeSistema(): void {
    if (this.propiedades.claveDeSistema !== null) throw new ConceptoDeIngresoDeSistema();
  }

  /** Copia de solo lectura de sus propiedades, para guardarla. */
  instantanea(): Readonly<PropiedadesDeConceptoDeIngreso> {
    return { ...this.propiedades };
  }
}
