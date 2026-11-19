import {
  AuditoriaEnMemoria,
  CorrelativosEnMemoria,
  PublicadorEventosEnMemoria,
  RelojFijo,
  UnidadDeTrabajoEnMemoria,
} from '../../core/compartido/pruebas/dobles-compartidos.js';
import type { DependenciasDeAnticipos } from '../aplicacion/casos-uso/anticipos/dependencias-de-anticipos.js';
import type {
  AnticipoNuevo,
  AnticipoVencido,
  AnulacionDeAnticipo,
  ConsultasDeAnticipos,
  GastadoDelAnticipo,
  LiquidacionDeAnticipo,
  RepartoDeLosGastos,
  RepositorioDeAnticipos,
} from '../aplicacion/puertos/puertos-de-anticipos.js';
import type {
  AnulacionDeMovimiento,
  AnulacionDelMovimiento,
  ChequeAEmitir,
  DesgloseDelMovimiento,
  MovimientoCreado,
  MovimientosDeBancos,
  NotaDeCreditoARegistrar,
  NotaDeDebitoARegistrar,
  OrdenesABancos,
} from '../aplicacion/puertos/puertos-de-bancos.js';
import type { Anticipo } from '../dominio/anticipos.js';
import { PoliticaFija, ReferenciasFalsas } from './referencias-y-politica-falsas.js';
import { MarcadorDeDocumentosFalso } from './marcador-de-documentos-falso.js';

export class RepositorioDeAnticiposEnMemoria implements RepositorioDeAnticipos {
  readonly guardados = new Map<string, Anticipo>();

  async agregar({ montoCentavos, ...nuevo }: AnticipoNuevo): Promise<void> {
    this.guardados.set(nuevo.id, {
      ...nuevo,
      montoCentavos,
      estado: 'abierto',
      fechaDeLiquidacion: null,
      devueltoCentavos: 0,
      movimientoDeDevolucionId: null,
      reembolsadoCentavos: 0,
      movimientoDeReembolsoId: null,
      noLiquidadoCentavos: 0,
      destinoDeNoLiquidado: null,
      cuotas: null,
      motivoDeNoLiquidado: null,
      fechaDeAnulacion: null,
      motivoDeAnulacion: null,
    });
  }

  async buscar(id: string): Promise<Anticipo | null> {
    return this.guardados.get(id) ?? null;
  }

  bloquear(id: string): Promise<Anticipo | null> {
    return this.buscar(id);
  }

  async delMovimiento(movimientoId: string): Promise<Anticipo | null> {
    const coincide = (a: Anticipo) =>
      [a.movimientoId, a.movimientoDeDevolucionId, a.movimientoDeReembolsoId].includes(movimientoId);
    return [...this.guardados.values()].find(coincide) ?? null;
  }

  async liquidar(id: string, liquidacion: LiquidacionDeAnticipo): Promise<void> {
    const { liquidadoPor: _, ...datos } = liquidacion;
    this.guardados.set(id, {
      ...this.guardados.get(id)!,
      ...datos,
      estado: 'liquidado',
      motivoDeNoLiquidado: liquidacion.motivoDeNoLiquidado,
    });
  }

  async reabrir(id: string): Promise<void> {
    this.guardados.set(id, {
      ...this.guardados.get(id)!,
      estado: 'abierto',
      fechaDeLiquidacion: null,
      devueltoCentavos: 0,
      movimientoDeDevolucionId: null,
      reembolsadoCentavos: 0,
      movimientoDeReembolsoId: null,
      noLiquidadoCentavos: 0,
      destinoDeNoLiquidado: null,
      cuotas: null,
      motivoDeNoLiquidado: null,
    });
  }

  async anular(id: string, { motivo, fechaDeAnulacion }: AnulacionDeAnticipo): Promise<void> {
    const anticipo = this.guardados.get(id)!;
    this.guardados.set(id, { ...anticipo, estado: 'anulado', motivoDeAnulacion: motivo, fechaDeAnulacion });
  }
}

export class ConsultasDeAnticiposFalsas implements ConsultasDeAnticipos {
  gastado: GastadoDelAnticipo = { cantidad: 0, totalCentavos: 0 };
  vencidos: AnticipoVencido[] = [];
  reparto: RepartoDeLosGastos = { totalCentavos: 0, deActivoCentavos: 0, ultimaFecha: null, documentosDeCompraIds: [] };

  async repartoDeLosGastos(): Promise<RepartoDeLosGastos> {
    return this.reparto;
  }

  async gastadoDe(): Promise<GastadoDelAnticipo> {
    return this.gastado;
  }

  async vencidosDe(): Promise<AnticipoVencido[]> {
    return this.vencidos;
  }

  async listar() {
    return { filas: [], total: 0, totalPorJustificarCentavos: 0 };
  }
}

/** Bancos de mentira: recuerda lo que se le ordenó y puede rechazar o contestar cómo anuló. */
export class BancosFalsos implements OrdenesABancos {
  cheque: ChequeAEmitir | null = null;
  nota: NotaDeDebitoARegistrar | null = null;
  anulaciones: AnulacionDeMovimiento[] = [];
  notasDeCredito: NotaDeCreditoARegistrar[] = [];
  desgloses: DesgloseDelMovimiento[] = [];
  /** Los movimientos que crea, para que el depósito y el reembolso no se confundan con la entrega. */
  siguiente = 1;
  rechazo: Error | null = null;
  anulacion: AnulacionDelMovimiento = { forma: 'sin_inverso', fechaDelInverso: null };

  async emitirCheque(_: unknown, cheque: ChequeAEmitir): Promise<MovimientoCreado> {
    if (this.rechazo) throw this.rechazo;
    this.cheque = cheque;
    return { movimientoId: `mov-${this.siguiente++}`, cuentaBancariaId: 'cuenta-1', numero: 101, avisos: [] };
  }

  async registrarNotaDeDebito(_: unknown, nota: NotaDeDebitoARegistrar): Promise<MovimientoCreado> {
    if (this.rechazo) throw this.rechazo;
    this.nota = nota;
    const aviso = { codigo: 'fondos', mensaje: 'La cuenta quedará sin fondos.' };
    return {
      movimientoId: `mov-${this.siguiente++}`,
      cuentaBancariaId: nota.cuentaBancariaId,
      numero: 7,
      avisos: [aviso],
    };
  }

  async registrarNotaDeCredito(_: unknown, nota: NotaDeCreditoARegistrar): Promise<MovimientoCreado> {
    if (this.rechazo) throw this.rechazo;
    this.notasDeCredito.push(nota);
    return { movimientoId: `mov-${this.siguiente++}`, cuentaBancariaId: nota.cuentaBancariaId, numero: 9, avisos: [] };
  }

  async fijarDesglose(_: unknown, desglose: DesgloseDelMovimiento): Promise<void> {
    this.desgloses.push(desglose);
  }

  async anularMovimiento(_: unknown, anulacion: AnulacionDeMovimiento): Promise<AnulacionDelMovimiento> {
    if (this.rechazo) throw this.rechazo;
    this.anulaciones.push(anulacion);
    return this.anulacion;
  }
}

export class MovimientosFalsos implements MovimientosDeBancos {
  conciliado = false;
  bloqueados: string[] = [];

  async bloquear(movimientoId: string): Promise<void> {
    this.bloqueados.push(movimientoId);
  }

  async estaConciliado(): Promise<boolean> {
    return this.conciliado;
  }

  async fechaDe(): Promise<string | null> {
    return '2026-11-18';
  }

  async datosDe() {
    return { cuentaBancariaId: 'cuenta-1', numero: 101 };
  }
}

/** Todo lo de los casos de uso de los anticipos en memoria, a mano para que cada prueba cambie lo suyo. */
export function dependenciasEnMemoria() {
  const piezas = {
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    anticipos: new RepositorioDeAnticiposEnMemoria(),
    consultas: new ConsultasDeAnticiposFalsas(),
    referencias: new ReferenciasFalsas(),
    politica: new PoliticaFija(),
    bancos: new BancosFalsos(),
    movimientos: new MovimientosFalsos(),
    documentos: new MarcadorDeDocumentosFalso(),
    correlativos: new CorrelativosEnMemoria(),
    auditoria: new AuditoriaEnMemoria(),
    publicadorEventos: new PublicadorEventosEnMemoria(),
    reloj: new RelojFijo('2026-11-18'),
  };
  const dependencias: DependenciasDeAnticipos = piezas;
  return { ...piezas, dependencias };
}
