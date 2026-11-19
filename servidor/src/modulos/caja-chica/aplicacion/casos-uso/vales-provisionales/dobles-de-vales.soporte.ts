import { operadorDePrueba } from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import type { DocumentoParaDestino } from '../../../../core/contratos/libro-de-compras.contratos.js';
import type { Comprobante } from '../../../dominio/comprobantes.js';
import type { ValeProvisional } from '../../../dominio/vales-provisionales.js';
import type {
  AnulacionDelVale,
  ConsultasDeVales,
  LiquidacionDelVale,
  RepositorioDeVales,
  ValeNuevo,
} from '../../puertos/puertos-de-vales.js';
import {
  armarEscenario,
  FONDO_ID,
  HOY,
  type EscenarioEnMemoria,
} from '../comprobantes/dobles-de-comprobantes.soporte.js';
import { RecibirDocumento } from '../comprobantes/recibir-documento.js';
import { efectivoEsperadoDelFondo } from '../comprobantes/utilidades-de-comprobantes.js';
import type { DependenciasDeVales } from './dependencias-de-vales.js';
import { EntregarVale, type PeticionDeEntregarVale } from './entregar-vale.js';
import { LiquidarVale, type GastoSinDocumento, type PeticionDeLiquidarVale } from './liquidar-vale.js';

/** Un repositorio de vales en memoria con lo justo para estos casos de uso. */
export class ValesEnMemoria implements RepositorioDeVales, ConsultasDeVales {
  readonly filas = new Map<string, ValeProvisional>();
  private secuencia = 0;

  constructor(private readonly comprobantes: Map<string, Comprobante>) {}

  async agregar(nuevo: ValeNuevo): Promise<string> {
    const id = `vale-provisional-${++this.secuencia}`;
    this.filas.set(id, {
      id,
      ...nuevo,
      estado: 'abierto',
      fechaDeLiquidacion: null,
      devueltoCentavos: 0,
      fechaDeAnulacion: null,
      motivoDeAnulacion: null,
    });
    return id;
  }

  async buscar(id: string) {
    return this.filas.get(id) ?? null;
  }

  bloquear(id: string) {
    return this.buscar(id);
  }

  async liquidar(id: string, { devueltoCentavos, fechaDeLiquidacion }: LiquidacionDelVale): Promise<void> {
    this.filas.set(id, { ...this.filas.get(id)!, estado: 'liquidado', devueltoCentavos, fechaDeLiquidacion });
  }

  async anular(id: string, { motivo, fechaDeAnulacion }: AnulacionDelVale): Promise<void> {
    this.filas.set(id, {
      ...this.filas.get(id)!,
      estado: 'anulado',
      motivoDeAnulacion: motivo,
      fechaDeAnulacion,
    });
  }

  async delFondo(fondoId: string): Promise<ValeProvisional[]> {
    return [...this.filas.values()].filter((vale) => vale.fondoId === fondoId).reverse();
  }

  async comprobantesDelVale(valeId: string): Promise<Comprobante[]> {
    return [...this.comprobantes.values()].filter((c) => c.valeProvisionalId === valeId);
  }

  /** Lo entregado en vales que siguen abiertos, como lo sumaría la base. */
  abiertosDe(fondoId: string): { centavos: number; masViejo: string | null } {
    const abiertos = [...this.filas.values()].filter((v) => v.fondoId === fondoId && v.estado === 'abierto');
    const fechas = abiertos.map(({ fecha }) => fecha).sort();
    return { centavos: abiertos.reduce((suma, v) => suma + v.montoCentavos, 0), masViejo: fechas[0] ?? null };
  }
}

export interface EscenarioDeVales extends EscenarioEnMemoria {
  vales: ValesEnMemoria;
  dependenciasDeVales: DependenciasDeVales;
  /** Los días de aviso del vale viejo. */
  valores: { diasParaAvisar: number };
}

/** Un fondo abierto con Q10,000 (por omisión) y los vales en memoria, que cuentan en el efectivo esperado. */
export async function armarEscenarioDeVales(montoDelFondoCentavos = 1_000_000): Promise<EscenarioDeVales> {
  const base = await armarEscenario(montoDelFondoCentavos);
  const vales = new ValesEnMemoria(base.comprobantes.filas);
  const valores = { diasParaAvisar: 5 };
  const consultasDeFondos = {
    ...base.dependencias.consultasDeFondos,
    datosDeLectura: async (ids: readonly string[]) => {
      const lecturas = await base.dependencias.consultasDeFondos.datosDeLectura(ids);
      return new Map(
        [...lecturas].map(([id, lectura]) => {
          const { centavos, masViejo } = vales.abiertosDe(id);
          return [id, { ...lectura, valesCentavos: centavos, valeMasViejo: masViejo }];
        }),
      );
    },
  };
  const dependenciasDeVales: DependenciasDeVales = {
    ...base.dependencias,
    consultasDeFondos,
    vales,
    consultasDeVales: vales,
    configuracionDeVales: { diasParaAvisar: async () => valores.diasParaAvisar },
    usuarios: { nombreDelUsuario: async (id) => (id === 'usuario-1' ? 'Ana Pérez' : null) },
  };
  return { ...base, vales, dependenciasDeVales, valores };
}

export const SIN_EXCEPCIONES = { sobreElTope: false, conRetencion: false };

/** Lo que repiten las pruebas de los vales: entregar, liquidar, un gasto, un documento en la bandeja y el efectivo. */
export class AyudasDeVales {
  readonly operador = operadorDePrueba();

  constructor(private readonly m: EscenarioDeVales) {}

  efectivo = () => efectivoEsperadoDelFondo(this.m.dependenciasDeVales.consultasDeFondos, FONDO_ID);

  entregar = (cambios: Partial<PeticionDeEntregarVale> = {}) =>
    new EntregarVale(this.m.dependenciasDeVales).ejecutar(this.operador, {
      fondoId: FONDO_ID,
      monto: '500.00',
      entregadoA: 'Pedro Compras',
      motivo: 'Compra de repuestos',
      ...cambios,
    });

  liquidar = (valeId: string, cambios: Partial<PeticionDeLiquidarVale> = {}) =>
    new LiquidarVale(this.m.dependenciasDeVales).ejecutar(this.operador, {
      valeId,
      documentos: [],
      valesDeGasto: [],
      permisos: SIN_EXCEPCIONES,
      ...cambios,
    });

  gasto = (cambios: Partial<GastoSinDocumento> = {}): GastoSinDocumento => ({
    monto: '50.00',
    descripcion: 'Peaje',
    pagadoA: 'Pedro',
    conceptoDeGastoId: 'concepto-1',
    motivoSinDocumento: 'No da factura',
    ...cambios,
  });

  /** Un documento que llega a la bandeja de Caja chica; devuelve el id de su comprobante. */
  async enLaBandeja(totalCentavos: number, cambios: Partial<DocumentoParaDestino> = {}): Promise<string> {
    const documento: DocumentoParaDestino = {
      documentoId: crypto.randomUUID(),
      tipo: 'factura',
      proveedorId: 'proveedor-1',
      documentoAfectadoId: null,
      fechaEmision: HOY,
      totalCentavos,
      retencionesCentavos: 0,
      tieneActivoFijo: false,
      ...cambios,
    };
    await new RecibirDocumento(this.m.dependencias).ejecutar(this.operador, documento);
    return [...this.m.comprobantes.filas.values()].find((c) => c.documentoDeCompraId === documento.documentoId)!.id;
  }
}

export { HOY };
