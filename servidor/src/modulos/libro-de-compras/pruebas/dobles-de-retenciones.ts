import type {
  ConsultasDeEnteros,
  RetencionPracticada,
  RetencionesDeUnDocumento,
} from '../aplicacion/puertos/puertos-de-retenciones.js';
import type { EnteroGuardado } from '../dominio/retenciones/retencion-del-reporte.js';

/** Las retenciones de cada documento, en memoria: las pruebas las siembran y leen qué se hizo con ellas. */
export class RetencionesDeUnDocumentoEnMemoria implements RetencionesDeUnDocumento {
  readonly porDocumento = new Map<string, RetencionPracticada[]>();
  readonly dejadasPorResolver: string[] = [];

  async practicadas(documentoId: string): Promise<RetencionPracticada[]> {
    return this.porDocumento.get(documentoId) ?? [];
  }

  async dejarPorResolver(documentoId: string): Promise<number> {
    const cantidad = (this.porDocumento.get(documentoId) ?? []).length;
    if (cantidad > 0) this.dejadasPorResolver.push(documentoId);
    return cantidad;
  }
}

/** Los pagos, en memoria; solo leen (los de las pruebas de baja y de avisos). */
export class ConsultasDeEnterosEnMemoria implements Pick<ConsultasDeEnteros, 'delRango'> {
  readonly pagos: EnteroGuardado[] = [];

  async delRango(desde: string, hasta: string): Promise<EnteroGuardado[]> {
    return this.pagos.filter((pago) => pago.mes >= desde && pago.mes <= hasta);
  }

  /** Un pago vigente de un mes y grupo, con lo mínimo. */
  agregarVigente(mes: string, grupo: EnteroGuardado['grupo'], monto = 1000): void {
    this.pagos.push({
      id: crypto.randomUUID(),
      mes,
      grupo,
      fechaDePago: mes,
      documentoDePago: 'F-1',
      monto,
      retenidoAlMarcar: monto,
      observaciones: null,
      estado: 'vigente',
      anuladoEn: null,
      motivoDeAnulacion: null,
      registradoPor: null,
    });
  }
}
