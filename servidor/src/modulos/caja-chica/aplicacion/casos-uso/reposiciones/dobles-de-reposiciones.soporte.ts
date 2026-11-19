import type { Comprobante } from '../../../dominio/comprobantes.js';
import type { LineaDeReposicion, Reposicion } from '../../../dominio/reposiciones.js';
import type { SeparacionDeFuncionesConfigurada } from '../../../dominio/reglas-de-reposiciones.js';
import type {
  AnulacionDeMovimiento,
  ChequeAEmitir,
  MovimientoAnulado,
  NotaARegistrar,
} from '../../puertos/puertos-de-bancos.js';
import type {
  AnulacionDeLaReposicion,
  ComprobantesParaReponer,
  ConciliacionDeMovimientos,
  ConsultasDeReposiciones,
  LibroParaReponer,
  ReposicionNueva,
  RepositorioDeReposiciones,
} from '../../puertos/puertos-de-reposiciones.js';
import {
  armarEscenario,
  FONDO_ID,
  HOY,
  type ComprobantesEnMemoria,
  type EscenarioEnMemoria,
} from '../comprobantes/dobles-de-comprobantes.soporte.js';
import { BancosFalso } from '../fondos/dobles-de-fondos.soporte.js';
import type { DependenciasDeReposiciones } from './dependencias-de-reposiciones.js';

/** Las reposiciones en memoria; al guardar o anular también mueven el «repuesto» de los comprobantes, como la base. */
export class ReposicionesEnMemoria implements RepositorioDeReposiciones {
  readonly filas = new Map<string, Reposicion>();
  readonly lineasDe = new Map<string, LineaDeReposicion[]>();

  constructor(private readonly comprobantes: ComprobantesEnMemoria) {}

  async agregar({ lineas, ...nueva }: ReposicionNueva): Promise<void> {
    this.filas.set(nueva.id, {
      ...nueva,
      estado: 'vigente',
      fechaDeAnulacion: null,
      motivoDeAnulacion: null,
    });
    this.lineasDe.set(nueva.id, lineas);
    for (const { comprobanteId } of lineas) this.ponerNumero(comprobanteId, nueva.numero);
  }

  async buscar(id: string) {
    return this.filas.get(id) ?? null;
  }

  bloquear(id: string) {
    return this.buscar(id);
  }

  async delMovimiento(movimientoId: string) {
    return [...this.filas.values()].find((fila) => fila.movimientoId === movimientoId) ?? null;
  }

  async lineas(reposicionId: string) {
    return this.lineasDe.get(reposicionId) ?? [];
  }

  async anular(id: string, anulacion: AnulacionDeLaReposicion): Promise<void> {
    this.filas.set(id, {
      ...this.filas.get(id)!,
      estado: 'anulada',
      fechaDeAnulacion: anulacion.fechaDeAnulacion,
      motivoDeAnulacion: anulacion.motivo,
    });
    for (const { comprobanteId } of this.lineasDe.get(id) ?? []) this.ponerNumero(comprobanteId, null);
  }

  private ponerNumero(comprobanteId: string, numero: number | null): void {
    this.comprobantes.filas.set(comprobanteId, {
      ...this.comprobantes.filas.get(comprobanteId)!,
      reposicionNumero: numero,
    });
  }
}

/** El cheque o la nota anulados, y si Bancos rechaza algo. */
export class BancosDeReposicionesFalso extends BancosFalso {
  anulaciones: AnulacionDeMovimiento[] = [];
  forma: 'sin_inverso' | 'con_inverso' = 'sin_inverso';
  fechaDelInverso: string | null = null;

  override async anularMovimiento(_operador?: unknown, anulacion?: AnulacionDeMovimiento): Promise<MovimientoAnulado> {
    this.anulaciones.push(anulacion!);
    return { forma: this.forma, fechaDelInverso: this.fechaDelInverso };
  }

  /** El último cheque o nota que se pidió. */
  ultimo(): ChequeAEmitir | NotaARegistrar {
    return [...this.cheques, ...this.notas].at(-1)!;
  }
}

export class LibroFalso implements LibroParaReponer {
  readonly procesados = new Map<string, boolean>();

  async marcarProcesado(_operador: unknown, documentoId: string, procesado: boolean): Promise<void> {
    this.procesados.set(documentoId, procesado);
  }
}

export interface EscenarioDeReposiciones extends EscenarioEnMemoria {
  dependenciasDeReposiciones: DependenciasDeReposiciones;
  reposiciones: ReposicionesEnMemoria;
  bancos: BancosDeReposicionesFalso;
  libro: LibroFalso;
  conciliados: Set<string>;
  control: { separacion: SeparacionDeFuncionesConfigurada };
}

/** Un fondo abierto con Q10,000.00 cuyo custodio es el usuario `custodioUsuarioId` (nadie, por omisión). */
export async function armarEscenarioDeReposiciones(custodioUsuarioId: string | null = null) {
  const base = await armarEscenario(1_000_000);
  await base.fondos.agregarCustodio({
    fondoId: FONDO_ID,
    custodio: 'Juan Pérez',
    custodioUsuarioId,
    desde: '2026-11-01',
  });
  const reposiciones = new ReposicionesEnMemoria(base.comprobantes);
  const bancos = new BancosDeReposicionesFalso();
  const libro = new LibroFalso();
  const conciliados = new Set<string>();
  const control = { separacion: 'avisar' as SeparacionDeFuncionesConfigurada };
  const consultas: ConsultasDeReposiciones = {
    delFondo: async (fondoId) => [...reposiciones.filas.values()].filter((fila) => fila.fondoId === fondoId),
    comprobantesDe: async (id) =>
      (reposiciones.lineasDe.get(id) ?? []).map(({ comprobanteId }) => base.comprobantes.filas.get(comprobanteId)!),
    pendientesDelFondo: async (fondoId) =>
      [...base.comprobantes.filas.values()].filter(
        (c) => c.fondoId === fondoId && c.estado === 'vigente' && c.reposicionNumero === null,
      ),
  };
  const comprobantes: ComprobantesParaReponer = {
    bloquear: async (ids) => ids.flatMap((id) => base.comprobantes.filas.get(id) ?? []),
  };
  const conciliacion: ConciliacionDeMovimientos = { estaConciliado: async (id) => conciliados.has(id) };
  const dependenciasDeReposiciones: DependenciasDeReposiciones = {
    unidadDeTrabajo: base.dependencias.unidadDeTrabajo,
    fondos: base.fondos,
    consultasDeFondos: base.dependencias.consultasDeFondos,
    referencias: { exigirCuentaBancaria: async () => undefined },
    reposiciones,
    consultas,
    comprobantes,
    bancos,
    conciliacion,
    libro,
    configuracion: { separacionDeFunciones: async () => control.separacion },
    correlativos: base.dependencias.correlativos,
    auditoria: base.auditoria,
    publicadorEventos: base.publicador,
    reloj: base.dependencias.reloj,
  };
  return { ...base, dependenciasDeReposiciones, reposiciones, bancos, libro, conciliados, control };
}

/** Un comprobante vigente dentro del fondo; `cambios` lo ajusta (monto, resta, clase, activo fijo, fecha). */
export async function sembrarComprobante(
  m: EscenarioEnMemoria,
  cambios: Partial<Comprobante> = {},
): Promise<Comprobante> {
  const id = await m.comprobantes.agregarVale({
    fondoId: FONDO_ID,
    fecha: HOY,
    montoCentavos: 10_000,
    descripcion: 'Gasto',
    pagadoA: 'Pedro',
    conceptoDeGastoId: 'concepto-1',
    motivoSinDocumento: 'Sin factura',
    motivoSobreElTope: null,
    numero: m.comprobantes.filas.size + 1,
    anioDeNumero: 0,
    asignadoPor: 'usuario',
  });
  const sembrado = { ...m.comprobantes.filas.get(id)!, ...cambios };
  m.comprobantes.filas.set(id, sembrado);
  return sembrado;
}
