import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import { RecursoNoEncontrado } from '../../core/compartido/aplicacion/errores.js';
import type { FiltroDeMovimientos, MovimientoDto } from '../aplicacion/dto/movimiento.dto.js';
import type { ConsultasMovimientos } from '../aplicacion/puertos/consultas-movimientos.js';
import type { PoliticaDeSobregiro } from '../aplicacion/puertos/politica-de-sobregiro.js';
import type { RepositorioMovimientos } from '../aplicacion/puertos/repositorio-movimientos.js';
import { deCentavos } from '../dominio/centavos.js';
import { Movimiento, type MovimientoId } from '../dominio/movimiento.js';

const copia = (movimiento: Movimiento) => Movimiento.reconstruir(movimiento.instantanea());

function aDto(movimiento: Movimiento): MovimientoDto {
  const { id, empresaId: _empresaId, anuladoEn, ...datos } = movimiento.instantanea();
  return {
    ...datos,
    id: id.valor,
    anuladoEn: anuladoEn?.toISOString() ?? null,
    cuentaBancariaNombre: null,
    chequeId: null,
    numeroDeCheque: null,
    conciliacionId: null,
  };
}

const cumple =
  ({ cuentaBancariaId, desde, hasta }: FiltroDeMovimientos) =>
  (dto: MovimientoDto) =>
    (!cuentaBancariaId || dto.cuentaBancariaId === cuentaBancariaId) &&
    (!desde || dto.fecha >= desde) &&
    (!hasta || dto.fecha <= hasta);

/** Guarda los movimientos en memoria y responde tanto de repositorio como de consultas. */
export class MovimientosEnMemoria implements RepositorioMovimientos, ConsultasMovimientos {
  private readonly registros = new Map<string, Movimiento>();
  /** Las cuentas que las pruebas dan por inactivas; las demás existen y están activas. */
  readonly cuentasInactivas = new Set<string>();
  /** Fecha fija que las pruebas dan como conciliada hasta; `null` si ninguna cuenta tiene conciliaciones cerradas. */
  fechaConciliadaHasta: string | null = null;

  /** Una copia, como la base de datos: lo que el caso de uso cambie no cuenta hasta que lo guarde. */
  async buscar(id: MovimientoId): Promise<Movimiento | null> {
    const guardado = this.registros.get(id.valor);
    return guardado ? copia(guardado) : null;
  }

  async agregar(movimiento: Movimiento): Promise<void> {
    this.registros.set(movimiento.id.valor, copia(movimiento));
  }

  async guardar(movimiento: Movimiento): Promise<void> {
    this.registros.set(movimiento.id.valor, copia(movimiento));
  }

  async listar(filtro: FiltroDeMovimientos): Promise<MovimientoDto[]> {
    const dtos = [...this.registros.values()].map(aDto).filter(cumple(filtro));
    return dtos.sort((a, b) => b.fecha.localeCompare(a.fecha));
  }

  async obtener(movimientoId: string): Promise<MovimientoDto> {
    const movimiento = this.registros.get(movimientoId);
    if (!movimiento) throw new RecursoNoEncontrado('El movimiento');
    return aDto(movimiento);
  }

  /** En memoria, todo lo elegido existe. */
  async exigirReferencias(): Promise<void> {}

  async cuentaEstaActiva(cuentaBancariaId: string): Promise<boolean> {
    return !this.cuentasInactivas.has(cuentaBancariaId);
  }

  async saldoDe(cuentaBancariaId: string): Promise<string> {
    const efectos = this.deLaCuenta(cuentaBancariaId).map((movimiento) => movimiento.efectoEnCentavos);
    return deCentavos(efectos.reduce((suma, efecto) => suma + efecto, 0));
  }

  async fechaDelSaldoInicial(cuentaBancariaId: string, excluir?: string): Promise<string | null> {
    const inicial = this.vigentes(cuentaBancariaId, excluir).find((dto) => dto.saldoInicial);
    return inicial?.fecha ?? null;
  }

  async fechaMasAntigua(cuentaBancariaId: string, excluir?: string): Promise<string | null> {
    return (
      this.vigentes(cuentaBancariaId, excluir)
        .map((dto) => dto.fecha)
        .sort()[0] ?? null
    );
  }

  async conciliadaHasta(_cuentaBancariaId: string): Promise<string | null> {
    return this.fechaConciliadaHasta;
  }

  async saldoAlFinDe(cuentaBancariaId: string, fecha: string): Promise<string> {
    const efectos = this.vigentes(cuentaBancariaId)
      .filter((dto) => dto.fecha <= fecha)
      .map((dto) => this.registros.get(dto.id)!.efectoEnCentavos);
    return deCentavos(efectos.reduce((suma, efecto) => suma + efecto, 0));
  }

  async vigentesEntre(cuentaBancariaId: string, desde: string, hasta: string): Promise<MovimientoDto[]> {
    return this.vigentes(cuentaBancariaId).filter((dto) => dto.fecha >= desde && dto.fecha <= hasta);
  }

  private deLaCuenta(cuentaBancariaId: string): Movimiento[] {
    return [...this.registros.values()].filter((m) => m.instantanea().cuentaBancariaId === cuentaBancariaId);
  }

  private vigentes(cuentaBancariaId: string, excluir?: string): MovimientoDto[] {
    return this.deLaCuenta(cuentaBancariaId)
      .filter((m) => !m.estaAnulado && m.id.valor !== excluir)
      .map(aDto);
  }
}

/** La variable de sobregiro fija para la prueba. */
export class PoliticaDeSobregiroFija implements PoliticaDeSobregiro {
  constructor(private readonly permite: boolean) {}

  async permiteSobregiro(_operador: Operador): Promise<boolean> {
    return this.permite;
  }
}
