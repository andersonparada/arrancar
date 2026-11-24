import { randomUUID } from 'node:crypto';
import { CorregirSaldoInicial } from '../aplicacion/casos-uso/saldos-iniciales/corregir-saldo-inicial.js';
import type { DependenciasDeSaldosIniciales } from '../aplicacion/casos-uso/saldos-iniciales/dependencias-de-saldos-iniciales.js';
import { EliminarSaldoInicial } from '../aplicacion/casos-uso/saldos-iniciales/eliminar-saldo-inicial.js';
import { ListarSaldosIniciales } from '../aplicacion/casos-uso/saldos-iniciales/listar-saldos-iniciales.js';
import { RegistrarSaldoInicial } from '../aplicacion/casos-uso/saldos-iniciales/registrar-saldo-inicial.js';
import { RevisarCierreDeCargaEnInventarios } from '../aplicacion/casos-uso/saldos-iniciales/revisar-cierre-de-carga-en-inventarios.js';
import { ValidarFechaDeInicioEnInventarios } from '../aplicacion/casos-uso/saldos-iniciales/validar-fecha-de-inicio-en-inventarios.js';
import type { SolicitudDeSaldoInicial } from '../aplicacion/dto/saldo-inicial.dto.js';
import type { MetodoDeCosteo } from '../dominio/costeo/tipos.js';
import { LotesEnMemoria, SaldosEnMemoria } from './dobles-de-saldos-iniciales.js';
import { ARTICULO, BODEGA, EscenarioDelKardex } from './escenario-del-kardex.js';

export const INICIO = '2026-09-01';

/** El kardex en memoria con la fecha de inicio puesta, los lotes y los casos de uso de los saldos iniciales. */
export class EscenarioDeSaldosIniciales extends EscenarioDelKardex {
  readonly lotes = new LotesEnMemoria(this.kardex);
  readonly saldos = new SaldosEnMemoria(this.kardex, this.lotes);
  readonly dependenciasDeSaldos: DependenciasDeSaldosIniciales;

  constructor() {
    super();
    this.cargaInicial.fechaDeInicio = INICIO;
    this.dependenciasDeSaldos = { ...this.dependencias, saldos: this.saldos, lotes: this.lotes };
  }

  /** Deja elegido (sin fijar) el método de costeo, como lo hace la pantalla antes del primer saldo. */
  elegirMetodo(metodo: MetodoDeCosteo): void {
    this.kardex.metodos.unshift({
      id: randomUUID(),
      metodo,
      desde: '2000-01-01',
      fijadoEn: null,
      autorizacionSatNumero: null,
      autorizacionSatFecha: null,
      motivo: null,
    });
  }

  /** Un renglón de `cantidad` lb a `costoTotal` quetzales del artículo y la bodega. */
  saldo(cantidad: string, costoTotal: string, cambios: Partial<SolicitudDeSaldoInicial> = {}): SolicitudDeSaldoInicial {
    return {
      articuloId: ARTICULO,
      bodegaId: BODEGA,
      loteId: null,
      loteCodigo: null,
      loteVencimiento: null,
      cantidad,
      unidadId: null,
      costoTotal,
      fechaDeCapa: null,
      ...cambios,
    };
  }

  registrarSaldo(cantidad: string, costoTotal: string, cambios: Partial<SolicitudDeSaldoInicial> = {}) {
    return new RegistrarSaldoInicial(this.dependenciasDeSaldos).ejecutar(
      this.operador,
      this.saldo(cantidad, costoTotal, cambios),
    );
  }

  corregirSaldo(movimientoId: string, solicitud: SolicitudDeSaldoInicial) {
    return new CorregirSaldoInicial(this.dependenciasDeSaldos).ejecutar(this.operador, movimientoId, solicitud);
  }

  eliminarSaldo(movimientoId: string) {
    return new EliminarSaldoInicial(this.dependenciasDeSaldos).ejecutar(this.operador, movimientoId);
  }

  listarSaldos() {
    return new ListarSaldosIniciales(this.dependenciasDeSaldos).ejecutar(this.operador);
  }

  revisarCierre() {
    return new RevisarCierreDeCargaEnInventarios(this.dependenciasDeSaldos).ejecutar(this.operador, {
      fechaDeInicio: INICIO,
    });
  }

  cambiarFechaDeInicio(fechaDeInicio: string) {
    return new ValidarFechaDeInicioEnInventarios(this.dependenciasDeSaldos).ejecutar(this.operador, {
      empresaId: this.operador.empresaId,
      fechaDeInicio,
    });
  }
}
