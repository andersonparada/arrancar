import type { Parcela, ParcelaId } from '../../dominio/parcela.js';
import type { InmuebleDeParcelaDto, LigaConInmueble } from '../dto/parcela.dto.js';

/** Guarda y recupera las parcelas para modificarlas. La seguridad por empresa y localidad (RLS) limita lo que se ve. */
export interface RepositorioParcelas {
  buscar(id: ParcelaId): Promise<Parcela | null>;
  /** Como `buscar`, pero bloquea la fila hasta que termine la transacción: quien la cambia no pisa a otro. */
  buscarBloqueando(id: ParcelaId): Promise<Parcela | null>;
  agregar(parcela: Parcela): Promise<void>;
  guardar(parcela: Parcela): Promise<void>;
  /** @throws RecursoEnUso si algo la usa (llave foránea): subparcelas, mediciones o registros de otros módulos. */
  eliminar(parcela: Parcela): Promise<void>;
}

/** Los inmuebles registrales que abarca cada parcela (N:M). */
export interface LigasDeInmuebles {
  listar(parcelaId: string): Promise<InmuebleDeParcelaDto[]>;
  /** Los nombres de los inmuebles de cada parcela que el operador ve (para exportar a Excel). */
  nombresPorParcela(): Promise<Map<string, string[]>>;
  /** Deja solo las ligas dadas y devuelve las que se quitaron, para la auditoría. */
  reemplazar(
    destino: { empresaId: string; parcelaId: string },
    ligas: LigaConInmueble[],
  ): Promise<InmuebleDeParcelaDto[]>;
}
