import { RecursoNoEncontrado } from '../../core/compartido/aplicacion/errores.js';
import type { ChequeDto, ChequeListadoDto, FiltroDeChequesDeLaEmpresa } from '../aplicacion/dto/cheque.dto.js';
import type { MovimientoDto } from '../aplicacion/dto/movimiento.dto.js';
import type { ConsultasCheques } from '../aplicacion/puertos/consultas-cheques.js';
import type { LimiteDeChequera } from '../aplicacion/puertos/limite-de-chequera.js';
import type { RepositorioCheques } from '../aplicacion/puertos/repositorio-cheques.js';
import { Cheque, type ChequeId } from '../dominio/cheque.js';
import type { ChequerasEnMemoria } from './dobles-de-chequeras.js';
import type { MovimientosEnMemoria } from './dobles-de-movimientos.js';

const copia = (cheque: Cheque) => Cheque.reconstruir(cheque.instantanea());

function aDto(cheque: Cheque): ChequeDto {
  const { id, empresaId: _empresaId, anuladoEn, ...datos } = cheque.instantanea();
  return { ...datos, id: id.valor, anuladoEn: anuladoEn?.toISOString() ?? null };
}

const cumpleFiltro =
  ({ cuentaBancariaId, estado, desde, hasta }: FiltroDeChequesDeLaEmpresa) =>
  (dto: ChequeListadoDto) =>
    (!cuentaBancariaId || dto.cuentaBancariaId === cuentaBancariaId) &&
    (!estado || dto.estado === estado) &&
    (!desde || dto.fecha >= desde) &&
    (!hasta || dto.fecha <= hasta);

/** La chequera del cheque (serie, cuenta); si no se vinculó ninguna, datos vacíos. */
function datosDeLaChequera(chequeras: ChequerasEnMemoria | undefined, chequeraId: string) {
  return chequeras?.datosDe(chequeraId) ?? { serie: null, cuentaBancariaId: '', cuentaBancariaNombre: '' };
}

/** El movimiento del cheque, si llegó a emitirse. */
async function datosDelMovimiento(
  movimientos: MovimientosEnMemoria | undefined,
  movimientoId: string | null,
): Promise<MovimientoDto | null> {
  if (!movimientoId || !movimientos) return null;
  return movimientos.obtener(movimientoId);
}

/** La fecha del listado: la del movimiento, o si nunca se emitió, la de su anulación. */
function fechaDelListado(movimiento: MovimientoDto | null, anuladoEn: Date | null): string {
  return movimiento ? movimiento.fecha : anuladoEn!.toISOString().slice(0, 10);
}

/** Monto, beneficiario y referencia del cheque; sin movimiento, los tres quedan en `null`. */
function datosDelChequeEmitido(movimiento: MovimientoDto | null) {
  return {
    monto: movimiento?.monto ?? null,
    beneficiario: movimiento?.beneficiario ?? null,
    referencia: movimiento?.referencia ?? null,
  };
}

/**
 * Guarda los cheques en memoria y responde tanto de repositorio como de
 * consultas. Para `siguienteDisponible` y `listarDeLaEmpresa` necesita conocer
 * las chequeras y, para los datos del movimiento, los movimientos: se vincula
 * con `vincularChequeras`/`vincularMovimientos` después de crear las tres.
 */
export class ChequesEnMemoria implements RepositorioCheques, ConsultasCheques {
  readonly registros = new Map<string, Cheque>();
  private chequeras?: ChequerasEnMemoria;
  private movimientos?: MovimientosEnMemoria;

  vincularChequeras(chequeras: ChequerasEnMemoria): void {
    this.chequeras = chequeras;
  }

  vincularMovimientos(movimientos: MovimientosEnMemoria): void {
    this.movimientos = movimientos;
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

  /** Los cheques emitidos y anulados, opcionalmente filtrados; los disponibles no se incluyen. */
  async listarDeLaEmpresa(filtro: FiltroDeChequesDeLaEmpresa): Promise<ChequeListadoDto[]> {
    const emitidosOAnulados = [...this.registros.values()].filter((c) => !c.estaDisponible);
    const listados = await Promise.all(emitidosOAnulados.map((c) => this.aListado(c)));
    return listados.filter(cumpleFiltro(filtro)).sort((a, b) => b.fecha.localeCompare(a.fecha));
  }

  /** Junta el cheque con su chequera (serie, cuenta) y su movimiento, si llegó a emitirse. */
  private async aListado(cheque: Cheque): Promise<ChequeListadoDto> {
    const { id, chequeraId, numero, estado, noNegociable, movimientoId, anuladoEn, motivoDeAnulacion } =
      cheque.instantanea();
    const { serie, cuentaBancariaId, cuentaBancariaNombre } = datosDeLaChequera(this.chequeras, chequeraId);
    const movimiento = await datosDelMovimiento(this.movimientos, movimientoId);
    return {
      id: id.valor,
      numero,
      serie,
      cuentaBancariaId,
      cuentaBancariaNombre,
      estado: estado as ChequeListadoDto['estado'],
      noNegociable,
      fecha: fechaDelListado(movimiento, anuladoEn),
      ...datosDelChequeEmitido(movimiento),
      anuladoEn: anuladoEn?.toISOString() ?? null,
      motivoDeAnulacion,
    };
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
