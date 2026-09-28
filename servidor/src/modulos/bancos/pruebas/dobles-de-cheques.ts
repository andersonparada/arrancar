import { RecursoNoEncontrado } from '../../core/compartido/aplicacion/errores.js';
import type { ChequeDto } from '../aplicacion/dto/cheque.dto.js';
import type { ConsultasCheques } from '../aplicacion/puertos/consultas-cheques.js';
import type { LimiteDeChequera } from '../aplicacion/puertos/limite-de-chequera.js';
import type { RepositorioCheques } from '../aplicacion/puertos/repositorio-cheques.js';
import { Cheque, type ChequeId } from '../dominio/cheque.js';
import type { ChequerasEnMemoria } from './dobles-de-chequeras.js';

const copia = (cheque: Cheque) => Cheque.reconstruir(cheque.instantanea());

function aDto(cheque: Cheque): ChequeDto {
  const { id, empresaId: _empresaId, anuladoEn, ...datos } = cheque.instantanea();
  return { ...datos, id: id.valor, anuladoEn: anuladoEn?.toISOString() ?? null };
}

/**
 * Guarda los cheques en memoria y responde tanto de repositorio como de
 * consultas. Para `siguienteDisponible` necesita conocer las chequeras
 * activas: se vincula con `vincularChequeras` después de crear las dos.
 */
export class ChequesEnMemoria implements RepositorioCheques, ConsultasCheques {
  readonly registros = new Map<string, Cheque>();
  private chequeras?: ChequerasEnMemoria;

  vincularChequeras(chequeras: ChequerasEnMemoria): void {
    this.chequeras = chequeras;
  }

  async buscar(id: ChequeId): Promise<Cheque | null> {
    const guardado = this.registros.get(id.valor);
    return guardado ? copia(guardado) : null;
  }

  async agregarVarios(varios: Cheque[]): Promise<void> {
    for (const cheque of varios) this.registros.set(cheque.id.valor, copia(cheque));
  }

  async guardar(cheque: Cheque): Promise<void> {
    this.registros.set(cheque.id.valor, copia(cheque));
  }

  async listarDeLaChequera(chequeraId: string, estado?: 'disponible' | 'emitido' | 'anulado'): Promise<ChequeDto[]> {
    return [...this.registros.values()]
      .filter((c) => c.instantanea().chequeraId === chequeraId)
      .filter((c) => !estado || c.instantanea().estado === estado)
      .map(aDto)
      .sort((a, b) => a.numero - b.numero);
  }

  async obtener(chequeId: string): Promise<ChequeDto> {
    const cheque = this.registros.get(chequeId);
    if (!cheque) throw new RecursoNoEncontrado('El cheque');
    return aDto(cheque);
  }

  async siguienteDisponible(cuentaBancariaId: string): Promise<ChequeDto | null> {
    const activas = this.chequeras?.activasDeLaCuenta(cuentaBancariaId) ?? [];
    const candidatos = [...this.registros.values()]
      .filter((c) => c.estaDisponible)
      .map((cheque) => ({ cheque, chequera: activas.find((a) => a.chequeraId === cheque.instantanea().chequeraId) }))
      .filter((c): c is { cheque: Cheque; chequera: { chequeraId: string; serie: string | null } } => !!c.chequera)
      .sort(
        (a, b) =>
          (a.chequera.serie ?? '').localeCompare(b.chequera.serie ?? '') ||
          a.cheque.instantanea().numero - b.cheque.instantanea().numero,
      );
    return candidatos[0] ? aDto(candidatos[0].cheque) : null;
  }
}

/** El máximo de cheques por chequera fijo para la prueba. */
export class LimiteDeChequeraFijo implements LimiteDeChequera {
  constructor(private readonly maximo: number) {}

  async maximoDeCheques(): Promise<number> {
    return this.maximo;
  }
}
