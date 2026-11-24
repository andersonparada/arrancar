import { RecursoNoEncontrado } from '../../core/compartido/aplicacion/errores.js';
import { calcularConciliacion, type MovimientoParaConciliar } from '../aplicacion/calculo-de-conciliacion.js';
import type {
  ConciliacionDto,
  ConciliacionResumenDto,
  EstadoDeCuentaDto,
  MovimientoConMarcaDto,
} from '../aplicacion/dto/conciliacion.dto.js';
import type { ConsultasConciliaciones, PuntoDePartida } from '../aplicacion/puertos/consultas-conciliaciones.js';
import type {
  RepositorioConciliaciones,
  ResumenDeLaUltimaConciliacion,
} from '../aplicacion/puertos/repositorio-conciliaciones.js';
import {
  type Conciliacion,
  finDelMesDe,
  inicioDelMesDe,
  type ConciliacionId,
  type Periodo,
} from '../dominio/conciliacion.js';
import { diferenciaConElEstadoDeCuenta } from '../dominio/estado-de-cuenta.js';
import {
  candidatosEnMemoria,
  hayAnteriorEnMemoria,
  cobradosEnMesesAnterioresEnMemoria,
  marcadosAntesDeEnMemoria,
  paresCompensadosEnMemoria,
} from './candidatos-en-memoria.js';
import {
  fotoDelMesAnteriorEnMemoria,
  puntoDePartidaEnMemoria,
  saldoDelBancoEnMemoria,
} from './punto-de-partida-en-memoria.js';
import {
  aEncabezado,
  aMovimientoParaConciliar,
  aResumen,
  copia,
  ordenDescendente,
} from './ayudas-de-conciliaciones.js';
import type { DocumentosEnMemoria } from './dobles-de-estado-de-cuenta.js';
import type { MovimientosEnMemoria } from './dobles-de-movimientos.js';

/**
 * Guarda las conciliaciones en memoria y responde tanto de repositorio como de
 * consultas; las marcas se guardan aparte (no tocan la entidad Movimiento) y
 * necesita los movimientos de la cuenta para armar el documento: se vincula
 * con `vincularMovimientos` después de crear las dos.
 */
export class ConciliacionesEnMemoria implements RepositorioConciliaciones, ConsultasConciliaciones {
  readonly registros = new Map<string, Conciliacion>();
  /** conciliacionId → ids de movimientos marcados. */
  private readonly marcas = new Map<string, Set<string>>();
  private movimientos?: MovimientosEnMemoria;
  /** Cuentas cargadas con el saldo del banco en cero: solo tienen cabecera, sin movimiento. */
  readonly conCabeceraSinSaldo = new Set<string>();
  /** Para que el DTO muestre los datos del archivo del estado de cuenta. */
  documentos?: DocumentosEnMemoria;

  private get enlazados(): MovimientosEnMemoria {
    if (!this.movimientos) throw new Error('Vincule los movimientos primero: vincularMovimientos(movimientos).');
    return this.movimientos;
  }

  vincularMovimientos(movimientos: MovimientosEnMemoria): void {
    this.movimientos = movimientos;
  }

  async estadoDeCuentaDe(conciliacionId: string): Promise<EstadoDeCuentaDto | null> {
    return this.datosDelArchivo(this.registros.get(conciliacionId));
  }

  async buscar(id: ConciliacionId): Promise<Conciliacion | null> {
    const guardada = this.registros.get(id.valor);
    return guardada ? copia(guardada) : null;
  }

  async bloquear(id: ConciliacionId): Promise<Conciliacion | null> {
    return this.buscar(id);
  }

  async agregar(conciliacion: Conciliacion): Promise<void> {
    this.registros.set(conciliacion.id.valor, copia(conciliacion));
  }

  async guardar(conciliacion: Conciliacion): Promise<void> {
    this.registros.set(conciliacion.id.valor, copia(conciliacion));
  }

  async eliminar(id: ConciliacionId): Promise<void> {
    this.registros.delete(id.valor);
    this.marcas.delete(id.valor);
  }

  async ultimaDeLaCuenta(cuentaBancariaId: string): Promise<ResumenDeLaUltimaConciliacion | null> {
    const ultima = this.deLaCuenta(cuentaBancariaId).sort((a, b) =>
      ordenDescendente(a.instantanea(), b.instantanea()),
    )[0];
    if (!ultima) return null;
    const { id, anio, mes, estado } = ultima.instantanea();
    return { id: id.valor, anio, mes, estado };
  }

  async guardarMarcas(conciliacionId: string, movimientoIds: string[]): Promise<void> {
    this.marcas.set(conciliacionId, new Set(movimientoIds));
  }

  async listar(cuentaBancariaId: string): Promise<ConciliacionResumenDto[]> {
    return this.deLaCuenta(cuentaBancariaId).map(aResumen).sort(ordenDescendente);
  }

  async obtener(conciliacionId: string): Promise<ConciliacionDto> {
    const conciliacion = this.registros.get(conciliacionId);
    if (!conciliacion) throw new RecursoNoEncontrado('La conciliación');
    return this.armarDto(conciliacion);
  }

  async idsDeCandidatos(cuentaBancariaId: string, finDelMes: string, conciliacionId: string): Promise<string[]> {
    const candidatos = await this.candidatosConMarca(cuentaBancariaId, finDelMes, conciliacionId);
    return candidatos.map((c) => c.id);
  }

  async tieneAlguna(cuentaBancariaId: string): Promise<boolean> {
    return this.deLaCuenta(cuentaBancariaId).length > 0;
  }

  hayAnteriorA = async (cuenta: string, periodo: Periodo) => hayAnteriorEnMemoria(this.deLaCuenta(cuenta), periodo);

  async conSaldoDelBanco(cuentaBancariaId: string): Promise<boolean> {
    if (this.conCabeceraSinSaldo.has(cuentaBancariaId)) return true;
    return (await saldoDelBancoEnMemoria(this.enlazados, cuentaBancariaId)) !== null;
  }

  async fechaDelPrimerMovimiento(cuentaBancariaId: string): Promise<string | null> {
    const todos = await this.enlazados.listar({ cuentaBancariaId });
    const fechas = todos.filter((m) => !m.anuladoEn).map((m) => m.fecha);
    return fechas.sort()[0] ?? null;
  }

  /** Como en Postgres: pares original + inverso donde ninguno se marcó en otra conciliación, con fecha hasta `finDelMes`. */
  async paresCompensadosPendientes(
    cuentaBancariaId: string,
    finDelMes: string,
    conciliacionId: string,
  ): Promise<string[]> {
    const deOtras = [...this.marcas.entries()].filter(([id]) => id !== conciliacionId);
    const marcadosAlgunaVez = new Set(deOtras.flatMap(([, ids]) => [...ids]));
    const todos = await this.enlazados.listar({ cuentaBancariaId });
    return paresCompensadosEnMemoria(todos, { marcadosAlgunaVez, finDelMes });
  }

  private async calcularDocumento(conciliacion: Conciliacion) {
    const { id, cuentaBancariaId, anio, mes } = conciliacion.instantanea();
    const periodo = { anio, mes };
    const finDelMes = finDelMesDe(periodo);
    const todos = await this.candidatosConMarca(cuentaBancariaId, finDelMes, id.valor);
    const marcadosAntes = marcadosAntesDeEnMemoria(this.marcas, this.registros, finDelMes);
    const partida = await this.puntoDePartida(cuentaBancariaId, periodo);
    const resultado = calcularConciliacion({
      saldoInicialLibrosEnCentavos: partida.librosEnCentavos,
      saldoInicialBancoEnCentavos: partida.bancoEnCentavos,
      movimientosDelMes: await this.movimientosDelMes(cuentaBancariaId, periodo, partida.despuesDe),
      candidatos: [
        ...todos.map(aMovimientoParaConciliar),
        ...(await cobradosEnMesesAnterioresEnMemoria(this.enlazados, { cuentaBancariaId, finDelMes, marcadosAntes })),
      ],
      finDelMes,
    });
    const esPosfechado = (m: MovimientoConMarcaDto) => m.tipo === 'cheque' && m.fecha > finDelMes;
    return {
      candidatos: todos.filter((m) => !esPosfechado(m)),
      posfechadosCandidatos: todos.filter(esPosfechado),
      saldoInicialDelBancoDeLaApertura: partida.saldoInicialDelBancoDeLaApertura,
      resultado,
    };
  }

  private async armarDto(conciliacion: Conciliacion): Promise<ConciliacionDto> {
    const { estado, foto, saldoEstadoDeCuenta } = conciliacion.instantanea();
    const estadoDeCuenta = this.datosDelArchivo(conciliacion);
    const { resultado, ...candidatos } = await this.calcularDocumento(conciliacion);
    const saldoQueDebeMostrarElEstadoDeCuenta =
      estado === 'autorizada' && foto
        ? foto.saldoCalculadoEstadoDeCuenta
        : resultado.saldoQueDebeMostrarElEstadoDeCuenta;
    return {
      ...aEncabezado(conciliacion),
      estadoDeCuenta,
      ...candidatos,
      cuadratica: { libros: resultado.libros, banco: resultado.banco },
      partidas: resultado.partidas,
      saldoQueDebeMostrarElEstadoDeCuenta,
      diferenciaConElEstadoDeCuenta: diferenciaConElEstadoDeCuenta(
        saldoEstadoDeCuenta,
        saldoQueDebeMostrarElEstadoDeCuenta,
      ),
    };
  }

  private datosDelArchivo(conciliacion: Conciliacion | undefined): EstadoDeCuentaDto | null {
    const archivoId = conciliacion?.instantanea().estadoDeCuentaArchivoId ?? null;
    return this.documentos?.datosDelEstadoDeCuenta(archivoId) ?? null;
  }

  private deLaCuenta(cuentaBancariaId: string): Conciliacion[] {
    return [...this.registros.values()].filter((c) => c.instantanea().cuentaBancariaId === cuentaBancariaId);
  }

  private puntoDePartida(cuentaBancariaId: string, periodo: Periodo): Promise<PuntoDePartida> {
    const fotoAnterior = fotoDelMesAnteriorEnMemoria(this.deLaCuenta(cuentaBancariaId), periodo);
    return puntoDePartidaEnMemoria({ movimientos: this.enlazados, cuentaBancariaId, periodo, fotoAnterior });
  }

  private async movimientosDelMes(
    cuentaBancariaId: string,
    periodo: Periodo,
    despuesDe: string,
  ): Promise<MovimientoParaConciliar[]> {
    const filas = await this.enlazados.vigentesEntre(cuentaBancariaId, inicioDelMesDe(periodo), finDelMesDe(periodo));
    return filas.filter((m) => m.fecha > despuesDe).map((m) => aMovimientoParaConciliar({ ...m, marcado: false }));
  }

  private async candidatosConMarca(
    cuentaBancariaId: string,
    finDelMes: string,
    conciliacionId: string,
  ): Promise<MovimientoConMarcaDto[]> {
    const marcados = this.marcas.get(conciliacionId) ?? new Set<string>();
    const todos = await this.enlazados.listar({ cuentaBancariaId });
    return candidatosEnMemoria(todos, {
      marcados,
      marcadosAntes: marcadosAntesDeEnMemoria(this.marcas, this.registros, finDelMes),
      finDelMes,
    });
  }
}
