import type { Medicion, MedicionId } from '../../dominio/medicion.js';
import type { MedicionDto } from '../dto/medicion.dto.js';

/** Guarda y recupera las mediciones. La seguridad por empresa (RLS) limita lo que se ve. */
export interface RepositorioMediciones {
  buscar(id: MedicionId): Promise<Medicion | null>;
  agregar(medicion: Medicion): Promise<void>;
  guardar(medicion: Medicion): Promise<void>;
  /** Quita las mediciones anuladas de una parcela que se elimina (quedan en la auditoría). */
  eliminarAnuladasDe(parcelaId: string): Promise<void>;
}

/** La superficie que vale hoy en una parcela: la de la medición vigente más reciente. */
export interface SuperficieVigente {
  total: string;
  util: string;
}

export interface ConsultasMediciones {
  /** Todas las de la parcela, la más reciente primero (las anuladas quedan como rastro). */
  listar(parcelaId: string): Promise<MedicionDto[]>;
  /** La superficie de la medición vigente más reciente, o `null` si no hay ninguna. */
  superficieVigente(parcelaId: string): Promise<SuperficieVigente | null>;
  /** La superficie de la medición vigente que regía en la fecha (`vigente_desde` menor o igual), o `null`. */
  superficieEnFecha(parcelaId: string, fecha: string): Promise<SuperficieVigente | null>;
  /** Si la parcela tiene alguna medición vigente (con una, no se elimina). */
  hayVigentes(parcelaId: string): Promise<boolean>;
  /** @throws RecursoNoEncontrado si no existe o no es de una parcela que el operador ve. */
  obtener(medicionId: string): Promise<MedicionDto>;
  /** La medición vigente más reciente de cada parcela que el operador ve (para exportar a Excel). */
  vigentesPorParcela(): Promise<Map<string, MedicionDto>>;
}
