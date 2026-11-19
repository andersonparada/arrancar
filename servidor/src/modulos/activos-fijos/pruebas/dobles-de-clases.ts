import { RecursoNoEncontrado } from '../../core/compartido/aplicacion/errores.js';
import type { ClaseDto } from '../aplicacion/dto/clase.dto.js';
import type { ConsultasClases } from '../aplicacion/puertos/consultas-clases.js';
import type { RepositorioClases } from '../aplicacion/puertos/repositorio-clases.js';
import type { Clase, ClaseId } from '../dominio/clase.js';
import { TOPES_POR_OMISION } from '../configuracion.js';
import { esTerreno, INCISOS_FISCALES, type IncisoFiscal } from '../dominio/incisos-fiscales.js';
import type { ConceptoDeClaseDto } from '../aplicacion/dto/concepto-de-clase.dto.js';
import type { LectorDeTopes, TopesPorInciso } from '../aplicacion/puertos/lector-de-topes.js';
import type { RelacionClasesConceptos } from '../aplicacion/puertos/relacion-clases-conceptos.js';

function aDto(clase: Clase): ClaseDto {
  const { id, empresaId, ...datos } = clase.instantanea();
  return { ...datos, id: id.valor };
}

/** Guarda las clases de activos en memoria y responde tanto de repositorio como de consultas. */
export class ClasesEnMemoria implements RepositorioClases, ConsultasClases {
  private readonly registros = new Map<string, Clase>();

  async buscar(id: ClaseId): Promise<Clase | null> {
    return this.registros.get(id.valor) ?? null;
  }

  async agregar(clase: Clase): Promise<void> {
    this.registros.set(clase.id.valor, clase);
  }

  async guardar(clase: Clase): Promise<void> {
    this.registros.set(clase.id.valor, clase);
  }

  async eliminar(clase: Clase): Promise<void> {
    this.registros.delete(clase.id.valor);
  }

  /** Las clases que tienen algo ligado; la prueba las marca con `ligar`. */
  readonly ligadas = new Set<string>();

  async enUso(id: ClaseId): Promise<boolean> {
    return this.ligadas.has(id.valor);
  }

  async hayAlguna(): Promise<boolean> {
    return this.registros.size > 0;
  }

  async sembrar(nuevas: readonly Clase[]): Promise<void> {
    for (const clase of nuevas) this.registros.set(clase.id.valor, clase);
  }

  async listar(): Promise<ClaseDto[]> {
    const porNombre = (a: ClaseDto, b: ClaseDto) => String(a.nombre).localeCompare(String(b.nombre));
    return [...this.registros.values()].map(aDto).sort(porNombre);
  }

  async obtener(claseId: string): Promise<ClaseDto> {
    const clase = this.registros.get(claseId);
    if (!clase) throw new RecursoNoEncontrado('La clase de activo');
    return aDto(clase);
  }
}

/** Los topes de ley de la instalación por omisión (§10.4), sin tocar la configuración. */
export class TopesFijos implements LectorDeTopes {
  constructor(private readonly cambios: Partial<Record<IncisoFiscal, number>> = {}) {}

  async paraEmpresa(): Promise<TopesPorInciso> {
    const por = (inciso: IncisoFiscal) => ({
      porcentajeMaximo: this.cambios[inciso] ?? (esTerreno(inciso) ? 0 : TOPES_POR_OMISION[inciso]),
    });
    return Object.fromEntries(INCISOS_FISCALES.map((inciso) => [inciso, por(inciso)])) as TopesPorInciso;
  }
}

/** La relación de conceptos con clases en memoria; los conceptos del libro se dan al construirla. */
export class RelacionEnMemoria implements RelacionClasesConceptos {
  /** concepto → clase */
  readonly propuestas = new Map<string, string>();

  constructor(private readonly conceptos: Readonly<Record<string, string>> = {}) {}

  private aDto(conceptoDeGastoId: string): ConceptoDeClaseDto {
    return {
      conceptoDeGastoId,
      nombre: this.conceptos[conceptoDeGastoId]!,
      claseId: this.propuestas.get(conceptoDeGastoId) ?? null,
    };
  }

  async deLaClase(claseId: string): Promise<ConceptoDeClaseDto[]> {
    return [...this.propuestas.entries()]
      .filter(([, clase]) => clase === claseId)
      .map(([concepto]) => this.aDto(concepto))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  async actuales(conceptoIds: readonly string[]): Promise<ConceptoDeClaseDto[]> {
    return conceptoIds.filter((id) => id in this.conceptos).map((id) => this.aDto(id));
  }

  async poner(_empresaId: string, claseId: string, conceptoIds: readonly string[]): Promise<void> {
    for (const concepto of conceptoIds) this.propuestas.set(concepto, claseId);
  }

  async quitar(claseId: string, conceptoIds: readonly string[]): Promise<void> {
    for (const concepto of conceptoIds) if (this.propuestas.get(concepto) === claseId) this.propuestas.delete(concepto);
  }
}
