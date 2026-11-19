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
  PoliticaDeAnticipos,
  ReferenciasDelAnticipo,
  RepositorioDeAnticipos,
} from '../aplicacion/puertos/puertos-de-anticipos.js';
import type {
  AnulacionDeMovimiento,
  AnulacionDelMovimiento,
  ChequeAEmitir,
  MovimientoCreado,
  MovimientosDeBancos,
  NotaDeDebitoARegistrar,
  OrdenesABancos,
} from '../aplicacion/puertos/puertos-de-bancos.js';
import type { Anticipo } from '../dominio/anticipos.js';

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
    return [...this.guardados.values()].find((a) => a.movimientoId === movimientoId) ?? null;
  }

  async anular(id: string, { motivo, fechaDeAnulacion }: AnulacionDeAnticipo): Promise<void> {
    const anticipo = this.guardados.get(id)!;
    this.guardados.set(id, { ...anticipo, estado: 'anulado', motivoDeAnulacion: motivo, fechaDeAnulacion });
  }
}

export class ConsultasDeAnticiposFalsas implements ConsultasDeAnticipos {
  gastado: GastadoDelAnticipo = { cantidad: 0, totalCentavos: 0 };
  vencidos: AnticipoVencido[] = [];

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

export class ReferenciasFalsas implements ReferenciasDelAnticipo {
  tercero: string | null = 'Ana López';
  usuarioValido = true;
  localidadValida = true;

  async nombreDelTercero(): Promise<string | null> {
    return this.tercero;
  }

  async usuarioDeLaEmpresa(): Promise<boolean> {
    return this.usuarioValido;
  }

  async localidadDeLaEmpresa(): Promise<boolean> {
    return this.localidadValida;
  }
}

export class PoliticaFija implements PoliticaDeAnticipos {
  dias = 15;
  bloquear = false;

  async diasParaLiquidar(): Promise<number> {
    return this.dias;
  }

  async bloquearConVencidos(): Promise<boolean> {
    return this.bloquear;
  }
}

/** Bancos de mentira: recuerda lo que se le ordenó y puede rechazar o contestar cómo anuló. */
export class BancosFalsos implements OrdenesABancos {
  cheque: ChequeAEmitir | null = null;
  nota: NotaDeDebitoARegistrar | null = null;
  anulaciones: AnulacionDeMovimiento[] = [];
  rechazo: Error | null = null;
  anulacion: AnulacionDelMovimiento = { forma: 'sin_inverso', fechaDelInverso: null };

  async emitirCheque(_: unknown, cheque: ChequeAEmitir): Promise<MovimientoCreado> {
    if (this.rechazo) throw this.rechazo;
    this.cheque = cheque;
    return { movimientoId: 'mov-1', cuentaBancariaId: 'cuenta-1', numero: 101, avisos: [] };
  }

  async registrarNotaDeDebito(_: unknown, nota: NotaDeDebitoARegistrar): Promise<MovimientoCreado> {
    if (this.rechazo) throw this.rechazo;
    this.nota = nota;
    const aviso = { codigo: 'fondos', mensaje: 'La cuenta quedará sin fondos.' };
    return { movimientoId: 'mov-1', cuentaBancariaId: nota.cuentaBancariaId, numero: 7, avisos: [aviso] };
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
    correlativos: new CorrelativosEnMemoria(),
    auditoria: new AuditoriaEnMemoria(),
    publicadorEventos: new PublicadorEventosEnMemoria(),
    reloj: new RelojFijo('2026-11-18'),
  };
  const dependencias: DependenciasDeAnticipos = piezas;
  return { ...piezas, dependencias };
}
