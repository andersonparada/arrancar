import type { FiltrosDeParcelas, ParcelaDto } from '../dto/parcela.dto.js';

/** Lecturas para pantallas: devuelven datos planos, sin reconstruir entidades. */
export interface ConsultasParcelas {
  /** Ordenadas por localidad, nivel y código. */
  listar(filtros: FiltrosDeParcelas): Promise<ParcelaDto[]>;
  /** @throws RecursoNoEncontrado si no existe o el operador no la ve. */
  obtener(parcelaId: string): Promise<ParcelaDto>;
  /** Cuántas subparcelas activas tiene. */
  contarHijasActivas(parcelaId: string): Promise<number>;
  /** Cuántas subparcelas tiene, activas o no. */
  contarHijas(parcelaId: string): Promise<number>;
  /** El id de la parcela con ese código en la empresa, o `null` si no existe o no se ve. */
  buscarIdPorCodigo(codigo: string): Promise<string | null>;
  /** Los inmuebles de la empresa, para elegirlos por nombre al importar. */
  inmueblesPorNombre(): Promise<Array<{ id: string; nombre: string }>>;
  /** Si la localidad (que el operador ve) está activa. */
  localidadEstaActiva(localidadId: string): Promise<boolean>;
  /** @throws RecursoNoEncontrado si la localidad, el tipo o algún inmueble elegido no existe o es ajeno. */
  exigirReferencias(referencias: ReferenciasDeParcela): Promise<void>;
}

/** Lo que una parcela elige de otras tablas. */
export interface ReferenciasDeParcela {
  localidadId?: string;
  tipoId: string;
  inmuebleIds: string[];
}
