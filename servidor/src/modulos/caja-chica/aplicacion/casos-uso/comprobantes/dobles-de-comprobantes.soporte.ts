import {
  AuditoriaEnMemoria,
  CorrelativosEnMemoria,
  PublicadorEventosEnMemoria,
  RelojFijo,
  UnidadDeTrabajoEnMemoria,
} from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import type { Comprobante } from '../../../dominio/comprobantes.js';
import { efectoEnLoPendiente } from '../../../dominio/reglas-de-comprobantes.js';
import type {
  AnulacionDelComprobante,
  AsignacionDeComprobante,
  ConsultasDeComprobantes,
  DocumentoRecibido,
  RepositorioDeComprobantes,
  ValeDeGastoNuevo,
} from '../../puertos/puertos-de-comprobantes.js';
import type { ConsultasDeFondos } from '../../puertos/puertos-de-fondos.js';
import { BancarizacionFalsa } from './dobles-de-bancarizacion.soporte.js';
import { FondosEnMemoria } from '../fondos/dobles-de-fondos.soporte.js';
import type { DependenciasDeComprobantes } from './dependencias-de-comprobantes.js';

export { BancarizacionFalsa };

export const HOY = '2026-11-18';
/** El fondo de los escenarios: con forma de uuid, como el que manda el libro en la referencia de destino. */
export const FONDO_ID = '11111111-1111-4111-8111-111111111111';

/** Un repositorio en memoria con lo justo para estos casos de uso. */
export class ComprobantesEnMemoria implements RepositorioDeComprobantes {
  readonly filas = new Map<string, Comprobante>();
  /** Lo que el libro dice de los documentos que llegan; cambiarlo antes de recibir. */
  enElLibro = true;
  private secuencia = 0;

  private base(id: string, fecha: string): Comprobante {
    return {
      id,
      fondoId: null,
      clase: 'documento',
      estado: 'vigente',
      fecha,
      montoCentavos: 0,
      resta: false,
      esNotaDeCredito: false,
      documentoDeCompraId: null,
      documentoAfectadoId: null,
      proveedorId: null,
      conRetencion: false,
      montoRetenidoCentavos: 0,
      motivoConRetencion: null,
      conActivoFijo: false,
      sobreElTope: false,
      motivoSobreElTope: null,
      sinBancarizar: false,
      destinoDelFaltante: null,
      numero: null,
      anioDeNumero: 0,
      descripcion: null,
      pagadoA: null,
      conceptoDeGastoId: null,
      motivoSinDocumento: null,
      asignadoEn: null,
      asignadoPor: null,
      motivoDeAnulacion: null,
      reposicionNumero: null,
      documento: null,
    };
  }

  async agregarDocumento(nuevo: DocumentoRecibido): Promise<string> {
    const id = `comprobante-${++this.secuencia}`;
    this.filas.set(id, {
      ...this.base(id, nuevo.fecha),
      montoCentavos: nuevo.montoCentavos,
      resta: nuevo.esNotaDeCredito,
      esNotaDeCredito: nuevo.esNotaDeCredito,
      documentoDeCompraId: nuevo.documentoDeCompraId,
      documentoAfectadoId: nuevo.documentoAfectadoId,
      proveedorId: nuevo.proveedorId,
      conRetencion: nuevo.montoRetenidoCentavos > 0,
      montoRetenidoCentavos: nuevo.montoRetenidoCentavos,
      conActivoFijo: nuevo.conActivoFijo,
      documento: {
        tipo: 'factura',
        serie: 'A',
        numero: String(this.secuencia),
        proveedorNombre: 'Veterinaria',
        fechaEmision: nuevo.fecha,
        totalCentavos: nuevo.montoCentavos + nuevo.montoRetenidoCentavos,
        enElLibro: this.enElLibro,
        motivoFueraDelLibro: this.enElLibro ? null : 'sin_fel',
      },
    });
    return id;
  }

  async agregarVale(nuevo: ValeDeGastoNuevo): Promise<string> {
    const id = `vale-${++this.secuencia}`;
    this.filas.set(id, {
      ...this.base(id, nuevo.fecha),
      fondoId: nuevo.fondoId,
      clase: 'vale_de_gasto',
      montoCentavos: nuevo.montoCentavos,
      descripcion: nuevo.descripcion,
      pagadoA: nuevo.pagadoA,
      conceptoDeGastoId: nuevo.conceptoDeGastoId,
      motivoSinDocumento: nuevo.motivoSinDocumento,
      sobreElTope: nuevo.motivoSobreElTope !== null,
      motivoSobreElTope: nuevo.motivoSobreElTope,
      numero: nuevo.numero,
      anioDeNumero: nuevo.anioDeNumero,
      asignadoEn: HOY,
      asignadoPor: nuevo.asignadoPor,
    });
    return id;
  }

  async buscar(id: string) {
    return this.filas.get(id) ?? null;
  }

  bloquear(id: string) {
    return this.buscar(id);
  }

  async buscarDelDocumento(documentoDeCompraId: string) {
    return [...this.filas.values()].find((c) => c.documentoDeCompraId === documentoDeCompraId) ?? null;
  }

  async asignar(id: string, asignacion: AsignacionDeComprobante): Promise<void> {
    const { motivoSobreElTope, asignadoPor, ...resto } = asignacion;
    this.filas.set(id, {
      ...this.filas.get(id)!,
      ...resto,
      sobreElTope: motivoSobreElTope !== null,
      motivoSobreElTope,
      asignadoEn: HOY,
      asignadoPor,
    });
  }

  async devolverALaBandeja(id: string, fechaDeEmision: string): Promise<void> {
    this.filas.set(id, {
      ...this.filas.get(id)!,
      fondoId: null,
      asignadoEn: null,
      asignadoPor: null,
      motivoConRetencion: null,
      sobreElTope: false,
      motivoSobreElTope: null,
      sinBancarizar: false,
      fecha: fechaDeEmision,
    });
  }

  async anular(id: string, anulacion: AnulacionDelComprobante): Promise<void> {
    this.filas.set(id, { ...this.filas.get(id)!, estado: 'anulado', motivoDeAnulacion: anulacion.motivo });
  }

  async eliminar(id: string): Promise<void> {
    this.filas.delete(id);
  }

  readonly conReposicionAnulada = new Set<string>();

  tuvoReposicionAnulada = async (id: string): Promise<boolean> => this.conReposicionAnulada.has(id);

  async contarNotasVigentes(facturaId: string): Promise<number> {
    return [...this.filas.values()].filter(
      (c) => c.documentoAfectadoId === facturaId && c.estado === 'vigente' && c.fondoId !== null,
    ).length;
  }

  /** Lo pendiente de reponer de un fondo, como lo sumaría la base. */
  pendienteDe(fondoId: string): number {
    return [...this.filas.values()]
      .filter((c) => c.fondoId === fondoId && c.estado === 'vigente' && c.reposicionNumero === null)
      .reduce((suma, c) => suma + efectoEnLoPendiente(c), 0);
  }
}

export interface EscenarioEnMemoria {
  dependencias: DependenciasDeComprobantes;
  comprobantes: ComprobantesEnMemoria;
  fondos: FondosEnMemoria;
  auditoria: AuditoriaEnMemoria;
  publicador: PublicadorEventosEnMemoria;
  bancarizacion: BancarizacionFalsa;
  /** Los conceptos de gasto que están activos. */
  conceptosActivos: Set<string>;
  config: { topePorOmisionCentavos: number; valesPermitidos: boolean; topeDelValeCentavos: number };
  fondoId: string;
}

/** Un fondo abierto el 2026-11-01 con Q1,000.00 y todo lo demás en memoria. */
export async function armarEscenario(montoDelFondoCentavos = 100_000): Promise<EscenarioEnMemoria> {
  const fondos = new FondosEnMemoria();
  const fondoId = FONDO_ID;
  await fondos.agregar({
    id: fondoId,
    nombre: 'Caja',
    localidadId: null,
    topeCentavos: null,
    cuentaBancariaId: null,
    fechaDeApertura: '2026-11-01',
  });
  const comprobantes = new ComprobantesEnMemoria();
  const auditoria = new AuditoriaEnMemoria();
  const publicador = new PublicadorEventosEnMemoria();
  const bancarizacion = new BancarizacionFalsa();
  const conceptosActivos = new Set(['concepto-1']);
  const config = { topePorOmisionCentavos: 200_000, valesPermitidos: true, topeDelValeCentavos: 20_000 };
  const consultasDeFondos = {
    listar: async () => ({ filas: [], total: 0 }),
    datosDeLectura: async (ids: readonly string[]) =>
      new Map(
        ids.map((id) => [
          id,
          {
            custodio: 'Juan',
            custodioUsuarioId: null,
            localidadNombre: null,
            montoCentavos: montoDelFondoCentavos,
            pendienteCentavos: comprobantes.pendienteDe(id),
            valesCentavos: 0,
            ultimoArqueo: null,
            aperturaAnulada: false,
          },
        ]),
      ),
    usoDelFondo: async () => ({ comprobantes: 0, arqueos: 0, reposiciones: 0, vales: 0 }),
  } satisfies ConsultasDeFondos;
  const consultas: ConsultasDeComprobantes = {
    bandeja: async () => [...comprobantes.filas.values()].filter((c) => c.fondoId === null),
    delFondo: async ({ fondoId: id }) => [...comprobantes.filas.values()].filter((c) => c.fondoId === id),
  };
  const dependencias: DependenciasDeComprobantes = {
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    fondos,
    consultasDeFondos,
    comprobantes,
    consultas,
    configuracion: {
      topePorOmisionCentavos: async () => config.topePorOmisionCentavos,
      valesDeGasto: async () => ({ permitidos: config.valesPermitidos, topeCentavos: config.topeDelValeCentavos }),
    },
    conceptos: { estaActivo: async (id) => conceptosActivos.has(id) },
    bancarizacion,
    correlativos: new CorrelativosEnMemoria(),
    auditoria,
    publicadorEventos: publicador,
    reloj: new RelojFijo(HOY),
  };
  return {
    dependencias,
    comprobantes,
    fondos,
    auditoria,
    publicador,
    bancarizacion,
    conceptosActivos,
    config,
    fondoId,
  };
}
