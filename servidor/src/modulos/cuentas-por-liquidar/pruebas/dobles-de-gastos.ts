import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import type { EvaluacionDeBancarizacion } from '../../core/contratos/libro-de-compras.contratos.js';
import { operadorDePrueba } from '../../core/compartido/pruebas/dobles-compartidos.js';
import type { DependenciasDeGastos } from '../aplicacion/casos-uso/gastos/dependencias-de-gastos.js';
import type {
  AnulacionDeGasto,
  AsignacionDeGasto,
  BancarizacionDelLibro,
  ConsultasDeGastos,
  DatosDelDocumentoDelLibro,
  DocumentosDelLibro,
  FiltroDeGastos,
  GastoConDocumento,
  GastoDeDocumentoNuevo,
  GastoSinDocumentoNuevo,
  PagadoEnElMes,
  PoliticaDeGastos,
  ReferenciasDelGasto,
  RepositorioDeGastos,
} from '../aplicacion/puertos/puertos-de-gastos.js';
import type { Gasto } from '../dominio/gastos.js';
import { dependenciasEnMemoria } from './dobles-de-anticipos.js';

export class RepositorioDeGastosEnMemoria implements RepositorioDeGastos {
  readonly guardados = new Map<string, Gasto>();
  /** Lo que se borró (el libro eliminó el documento). */
  readonly eliminados: string[] = [];

  async agregarDocumento({ montoCentavos, montoRetenidoCentavos, ...nuevo }: GastoDeDocumentoNuevo): Promise<void> {
    this.guardados.set(nuevo.id, {
      ...vacio(nuevo.id),
      ...nuevo,
      clase: 'documento',
      montoCentavos,
      montoRetenidoCentavos,
      conRetencion: montoRetenidoCentavos > 0,
    });
  }

  async agregarSinDocumento({ tratamiento, montoCentavos, ...nuevo }: GastoSinDocumentoNuevo): Promise<void> {
    this.guardados.set(nuevo.id, {
      ...vacio(nuevo.id),
      ...nuevo,
      clase: 'sin_documento',
      montoCentavos,
      tratamientoSinDocumento: tratamiento,
      asignadoEn: '2026-11-18T12:00:00.000Z',
    });
  }

  async buscar(id: string): Promise<Gasto | null> {
    return this.guardados.get(id) ?? null;
  }

  bloquear(id: string): Promise<Gasto | null> {
    return this.buscar(id);
  }

  async delDocumento(documentoDeCompraId: string): Promise<Gasto | null> {
    return [...this.guardados.values()].find((g) => g.documentoDeCompraId === documentoDeCompraId) ?? null;
  }

  async asignar(id: string, { asignadoPor, ...asignacion }: AsignacionDeGasto): Promise<void> {
    this.cambiar(id, { ...asignacion, asignadoPor, asignadoEn: '2026-11-18T12:00:00.000Z' });
  }

  async devolverALaBandeja(id: string, fechaDeEmision: string): Promise<void> {
    this.cambiar(id, {
      anticipoId: null,
      asignadoEn: null,
      asignadoPor: null,
      motivoConRetencion: null,
      sinBancarizar: false,
      fecha: fechaDeEmision,
    });
  }

  async anular(id: string, { motivo, fechaDeAnulacion }: AnulacionDeGasto): Promise<void> {
    this.cambiar(id, { estado: 'anulado', motivoDeAnulacion: motivo, fechaDeAnulacion });
  }

  async eliminar(id: string): Promise<void> {
    this.guardados.delete(id);
    this.eliminados.push(id);
  }

  private cambiar(id: string, cambios: Partial<Gasto>): void {
    this.guardados.set(id, { ...this.guardados.get(id)!, ...cambios });
  }
}

const vacio = (id: string): Gasto => ({
  id,
  anticipoId: null,
  clase: 'documento',
  documentoDeCompraId: null,
  resta: false,
  proveedorId: null,
  fecha: '2026-11-10',
  montoCentavos: 0,
  montoRetenidoCentavos: 0,
  conRetencion: false,
  motivoConRetencion: null,
  conActivoFijo: false,
  descripcion: null,
  pagadoA: null,
  conceptoDeGastoId: null,
  motivoSinDocumento: null,
  tratamientoSinDocumento: null,
  sinBancarizar: false,
  asignadoPor: null,
  asignadoEn: null,
  estado: 'vigente',
  fechaDeAnulacion: null,
  motivoDeAnulacion: null,
});

/** Libro de mentira: cada documento es una factura `A-<id>` salvo que la prueba diga otra cosa. */
export class DocumentosDelLibroFalsos implements DocumentosDelLibro {
  readonly porDocumento = new Map<string, Partial<DatosDelDocumentoDelLibro>>();

  async datosDe(documentoId: string): Promise<DatosDelDocumentoDelLibro> {
    return {
      tipo: 'factura',
      serie: 'A',
      numero: documentoId,
      fechaEmision: '2026-11-12',
      proveedorNombre: 'Ferretería El Clavo',
      motivoFueraDelLibro: null,
      ...this.porDocumento.get(documentoId),
    };
  }
}

/** El libro de mentira que evalúa la bancarización: recuerda lo que le preguntaron y contesta lo que se le diga. */
export class BancarizacionFalsa implements BancarizacionDelLibro {
  preguntas: Array<Parameters<BancarizacionDelLibro['evaluar']>[1]> = [];
  respuesta: EvaluacionDeBancarizacion = { resultado: 'libre', mensaje: null, efecto: null, pagadoEnElMesCentavos: 0 };

  async evaluar(_: Operador, pedido: Parameters<BancarizacionDelLibro['evaluar']>[1]) {
    this.preguntas.push(pedido);
    return this.respuesta;
  }
}

export class ConsultasDeGastosFalsas implements ConsultasDeGastos {
  constructor(private readonly gastos: RepositorioDeGastosEnMemoria) {}

  async listar(filtro: FiltroDeGastos): Promise<GastoConDocumento[]> {
    return [...this.gastos.guardados.values()]
      .filter((g) => g.estado === 'vigente' && g.anticipoId === filtro.anticipoId)
      .map((gasto) => ({ gasto, documento: null }));
  }

  async pagadoAlProveedorEnElMes(): Promise<PagadoEnElMes> {
    return { totalCentavos: 0, anticipos: [] };
  }
}

export class ReferenciasDelGastoFalsas implements ReferenciasDelGasto {
  conceptoActivo = true;

  async conceptoDeGastoActivo(): Promise<boolean> {
    return this.conceptoActivo;
  }
}

export class PoliticaDeGastosFija implements PoliticaDeGastos {
  sinDocumento = true;

  async sinDocumentoPermitido(): Promise<boolean> {
    return this.sinDocumento;
  }
}

/** Un documento del libro tal como llega a la orden `recibir_documento`. */
export const documentoDelLibro = (cambios: Record<string, unknown> = {}) => ({
  documentoId: crypto.randomUUID(),
  tipo: 'factura' as const,
  proveedorId: 'proveedor-1',
  documentoAfectadoId: null,
  fechaEmision: '2026-11-12',
  totalCentavos: 56_000,
  retencionesCentavos: 0,
  tieneActivoFijo: false,
  ...cambios,
});

export { operadorDePrueba };

/** Las piezas de los gastos en memoria, a mano para que cada prueba cambie lo suyo. */
function piezasDeGastos() {
  const gastos = new RepositorioDeGastosEnMemoria();
  return {
    gastos,
    consultasDeGastos: new ConsultasDeGastosFalsas(gastos),
    documentos: new DocumentosDelLibroFalsos(),
    bancarizacion: new BancarizacionFalsa(),
    referenciasDelGasto: new ReferenciasDelGastoFalsas(),
    politicaDeGastos: new PoliticaDeGastosFija(),
  };
}

/** Todo lo de los casos de uso de los gastos en memoria, con el anticipo de las pruebas ya entregado por quien arme el caso. */
export function dependenciasDeGastosEnMemoria() {
  const base = dependenciasEnMemoria();
  const propias = piezasDeGastos();
  const { unidadDeTrabajo, anticipos, movimientos, auditoria, publicadorEventos, reloj } = base;
  const dependenciasDeGastos: DependenciasDeGastos = {
    unidadDeTrabajo,
    anticipos,
    movimientos,
    auditoria,
    publicadorEventos,
    reloj,
    gastos: propias.gastos,
    consultas: propias.consultasDeGastos,
    documentos: propias.documentos,
    bancarizacion: propias.bancarizacion,
    referencias: propias.referenciasDelGasto,
    politica: propias.politicaDeGastos,
  };
  return { ...base, ...propias, dependenciasDeGastos };
}
