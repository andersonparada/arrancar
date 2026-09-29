import { accionesDeMovimiento, type HechosDeUnMovimiento } from '../aplicacion/acciones-posibles.js';
import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import { RecursoNoEncontrado } from '../../core/compartido/aplicacion/errores.js';
import type { FiltroDeMovimientos, MovimientoDto } from '../aplicacion/dto/movimiento.dto.js';
import type { ConsultasMovimientos } from '../aplicacion/puertos/consultas-movimientos.js';
import type { PoliticaDeMismaFechaEnAnulacion } from '../aplicacion/puertos/politica-de-misma-fecha-en-anulacion.js';
import type { PoliticaDeSobregiro } from '../aplicacion/puertos/politica-de-sobregiro.js';
import type { RepositorioMovimientos } from '../aplicacion/puertos/repositorio-movimientos.js';
import { deCentavos } from '../dominio/centavos.js';
import { Movimiento, type MovimientoId } from '../dominio/movimiento.js';

const copia = (movimiento: Movimiento) => Movimiento.reconstruir(movimiento.instantanea());

/** Lo que en la base de datos se consulta de la cuenta (conciliaciones), para calcular qué acciones caben. */
interface HechosDeLaCuenta {
  mesConciliado: boolean;
  cuentaConConciliaciones: boolean;
}

function hechosDe(
  movimiento: Movimiento,
  conciliacionId: string | null,
  cuenta: HechosDeLaCuenta,
): HechosDeUnMovimiento {
  const { tipo, saldoInicial, transferenciaId } = movimiento.instantanea();
  return {
    tipo,
    saldoInicial,
    esDeTransferencia: transferenciaId !== null,
    marcadoEnConciliacion: conciliacionId !== null,
    anulado: movimiento.estaAnulado,
    revertido: movimiento.estaRevertido,
    esInverso: movimiento.esInverso,
    ...cuenta,
  };
}

function aDto(movimiento: Movimiento, conciliacionId: string | null, cuenta: HechosDeLaCuenta): MovimientoDto {
  const { id, empresaId: _empresaId, anuladoEn, revertidoEn, revierteAId, ...datos } = movimiento.instantanea();
  return {
    ...datos,
    id: id.valor,
    anuladoEn: anuladoEn?.toISOString() ?? null,
    revertidoEn: revertidoEn?.toISOString() ?? null,
    revierteAId: revierteAId ?? null,
    cuentaBancariaNombre: null,
    chequeId: null,
    numeroDeCheque: null,
    conciliacionId,
    ...accionesDeMovimiento(hechosDe(movimiento, conciliacionId, cuenta)),
  };
}

const cumpleLaClase = (clase: FiltroDeMovimientos['clase'], dto: MovimientoDto) => {
  if (clase === 'saldosIniciales') return dto.saldoInicial;
  if (clase === 'notas') return dto.tipo !== 'cheque' && !dto.saldoInicial && !dto.transferenciaId;
  return true;
};

const cumple =
  ({ cuentaBancariaId, desde, hasta, clase }: FiltroDeMovimientos) =>
  (dto: MovimientoDto) =>
    (!cuentaBancariaId || dto.cuentaBancariaId === cuentaBancariaId) &&
    (!desde || dto.fecha >= desde) &&
    (!hasta || dto.fecha <= hasta) &&
    cumpleLaClase(clase, dto);

/** Guarda los movimientos en memoria y responde tanto de repositorio como de consultas. */
export class MovimientosEnMemoria implements RepositorioMovimientos, ConsultasMovimientos {
  private readonly registros = new Map<string, Movimiento>();
  /** Las cuentas que las pruebas dan por inactivas; las demás existen y están activas. */
  readonly cuentasInactivas = new Set<string>();
  /** Fecha fija que las pruebas dan como conciliada hasta; `null` si ninguna cuenta tiene conciliaciones cerradas. */
  fechaConciliadaHasta: string | null = null;
  /** Movimiento → conciliación donde las pruebas lo dan por marcado; lo que falte, sin marcar. */
  readonly marcadosEnConciliacion = new Map<string, string>();
  /** Cuentas que las pruebas dan por con alguna conciliación (aunque no esté autorizada). */
  readonly cuentasConConciliaciones = new Set<string>();

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

  async eliminar(id: MovimientoId): Promise<void> {
    this.registros.delete(id.valor);
  }

  async listar(filtro: FiltroDeMovimientos): Promise<MovimientoDto[]> {
    const dtos = [...this.registros.values()].map((m) => this.aDtoMarcado(m)).filter(cumple(filtro));
    return dtos.sort((a, b) => b.fecha.localeCompare(a.fecha));
  }

  async listarAscendente(filtro: FiltroDeMovimientos): Promise<MovimientoDto[]> {
    const dtos = [...this.registros.values()].map((m) => this.aDtoMarcado(m)).filter(cumple(filtro));
    return dtos.sort((a, b) => a.fecha.localeCompare(b.fecha));
  }

  async obtener(movimientoId: string): Promise<MovimientoDto> {
    const movimiento = this.registros.get(movimientoId);
    if (!movimiento) throw new RecursoNoEncontrado('El movimiento');
    return this.aDtoMarcado(movimiento);
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
      .map((m) => this.aDtoMarcado(m));
  }

  /** Qué se puede hacer con el movimiento, como lo calcularía la consulta real; para los dobles de cheques y transferencias. */
  hechosDe(movimientoId: string): HechosDeUnMovimiento {
    const movimiento = this.registros.get(movimientoId);
    if (!movimiento) throw new RecursoNoEncontrado('El movimiento');
    return hechosDe(
      movimiento,
      this.marcadosEnConciliacion.get(movimientoId) ?? null,
      this.hechosDeLaCuenta(movimiento),
    );
  }

  private aDtoMarcado(movimiento: Movimiento): MovimientoDto {
    const conciliacionId = this.marcadosEnConciliacion.get(movimiento.id.valor) ?? null;
    return aDto(movimiento, conciliacionId, this.hechosDeLaCuenta(movimiento));
  }

  private hechosDeLaCuenta(movimiento: Movimiento): HechosDeLaCuenta {
    const { fecha, cuentaBancariaId } = movimiento.instantanea();
    const conciliada = this.fechaConciliadaHasta;
    return {
      mesConciliado: conciliada !== null && fecha <= conciliada,
      cuentaConConciliaciones: conciliada !== null || this.cuentasConConciliaciones.has(cuentaBancariaId),
    };
  }
}

/** La variable de sobregiro fija para la prueba. */
export class PoliticaDeSobregiroFija implements PoliticaDeSobregiro {
  constructor(private readonly permite: boolean) {}

  async permiteSobregiro(_operador: Operador): Promise<boolean> {
    return this.permite;
  }
}

/** La variable `bancos.anulaciones.misma_fecha` fija para la prueba; `false` por omisión. */
export class PoliticaDeMismaFechaFija implements PoliticaDeMismaFechaEnAnulacion {
  constructor(private readonly aplicaSiempre: boolean = false) {}

  async aplica(_operador: Operador): Promise<boolean> {
    return this.aplicaSiempre;
  }
}
