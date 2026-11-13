import type { ContextoEmpresa } from '../../core/compartido/aplicacion/contexto-empresa.js';
import type { FechasDeEntrada, UmbralDeBancarizacion } from '../aplicacion/puertos/puertos-de-documentos.js';
import type { CargaInicial, EstadoDeLaCarga } from '../aplicacion/puertos/puertos-de-saldos-iniciales.js';
import type { DocumentoPorPagar } from '../dominio/documento-por-pagar.js';

/** La carga inicial de la empresa, fija. */
export class CargaInicialFija implements CargaInicial {
  constructor(public estado: EstadoDeLaCarga = { fechaDeInicio: '2026-01-01', cerrada: false }) {}

  async obtener(): Promise<EstadoDeLaCarga> {
    return this.estado;
  }
}

/** La recepción de cada documento por su id; el que no está se trata como saldo inicial (sin recepción). */
export class FechasDeEntradaFijas implements FechasDeEntrada {
  readonly recepciones = new Map<string, string | null>();

  async deDocumentos(ids: readonly string[]): Promise<Map<string, string | null>> {
    return new Map(ids.map((id) => [id, this.recepciones.get(id) ?? null]));
  }
}

export class UmbralFijo implements UmbralDeBancarizacion {
  constructor(private readonly umbralCentavos = 3000000) {}

  async centavos(_contexto: ContextoEmpresa): Promise<number> {
    return this.umbralCentavos;
  }
}

let secuencia = 0;

/** Lo que un documento aún no tiene al sembrarse: ni completado ni autorizado ni retenciones. */
const SIN_SEGUIMIENTO = {
  saldoAlInicioCentavos: null,
  retencionesPorPracticarCentavos: null,
  referencia: null,
  ingresadoPor: null,
  registradoEn: null,
  registradoPor: null,
  autorizadoEn: null,
  autorizadoPor: null,
  autorizacionPropia: false,
  tieneActivoFijo: false,
  retencionesCentavos: 0,
  documentoAfectadoId: null,
} satisfies Partial<DocumentoPorPagar>;

/** Un documento listo para sembrar en memoria; `cambios` sobrescribe lo que haga falta. */
export function documentoSembrado(cambios: Partial<DocumentoPorPagar> = {}): DocumentoPorPagar {
  const numero = ++secuencia;
  return {
    ...SIN_SEGUIMIENTO,
    id: `documento-${numero}`,
    origen: 'libro_de_compras',
    documentoId: `libro-${numero}`,
    serie: 'A',
    numero: String(numero),
    tipo: 'factura',
    proveedorId: 'proveedor-1',
    fechaEmision: '2026-03-10',
    totalCentavos: 10000,
    vencimiento: '2026-04-10',
    estado: 'registrado',
    ...cambios,
  };
}
