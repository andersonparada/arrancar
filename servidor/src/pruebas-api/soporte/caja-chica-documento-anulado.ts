import { expect } from 'vitest';
import { comoPropietario } from './consultas-de-propietario.js';
import { RUTA_DE_CAJA_CHICA, type EscenarioDeComprobantes } from './caja-chica-comprobantes.js';
import { RUTA_DE_FONDOS } from './caja-chica-fondos.js';

const REPORTES = `${RUTA_DE_CAJA_CHICA}/reportes`;

/** La fila de un fondo en un reporte agrupado por fondo. */
export const filaDel = (reporte: any, fondoId: string) => reporte.fondos.find((f: any) => f.fondoId === fondoId);

/** Lo que repiten las pruebas del documento que su emisor anuló, sobre un escenario de comprobantes. */
export class AyudasDeDocumentoAnulado {
  constructor(private readonly e: EscenarioDeComprobantes) {}

  /** Un fondo con una factura de Q300.00 ya dentro. */
  async fondoConFactura(nombre: string, cambios: Record<string, unknown> = {}) {
    const fondo = await this.e.abrirFondo(nombre, { monto: '3000.00', ...cambios });
    const { documentoId } = await this.e.registrarEnElLibro({ referenciaDeDestino: fondo.id, total: '300.00' });
    const lista = (await this.e.delFondo(fondo.id)).elementos;
    const comprobante = lista.find((c: any) => c.documentoDeCompraId === documentoId);
    expect(comprobante, 'la factura debía quedar en el fondo').toBeDefined();
    return { fondo, documentoId, comprobanteId: comprobante.id as string };
  }

  /** El libro anula el documento porque el emisor anuló la FEL. */
  anularLaFel = (documentoId: string) =>
    this.e.propietario().post(`/api/libro-de-compras/documentos/${documentoId}/anular`, {
      causa: 'fel_anulada_por_el_emisor',
      motivo: 'El emisor anuló la FEL en la SAT',
    });

  /** Una factura de Q300.00 en un fondo, ya con la FEL anulada por el emisor. */
  async conFelAnulada(nombre: string) {
    const datos = await this.fondoConFactura(nombre);
    const anulada = await this.anularLaFel(datos.documentoId);
    expect(anulada.estado, JSON.stringify(anulada.cuerpo)).toBe(200);
    return datos;
  }

  /** Una acción sobre el documento anulado de un comprobante (`resolver`, `reemplazar`, `disputa`…). */
  accion = (comprobanteId: string, ruta: string, cuerpo: Record<string, unknown>) =>
    this.e.propietario().post(`${RUTA_DE_CAJA_CHICA}/comprobantes/${comprobanteId}/documento-anulado/${ruta}`, cuerpo);

  ficha = async (fondoId: string) => (await this.e.propietario().get(`${RUTA_DE_FONDOS}/${fondoId}`)).cuerpo;

  auditoriaDelComprobante = (comprobanteId: string) =>
    comoPropietario<{ accion: string; motivo: string | null; anterior: any }>(
      `select accion, motivo, anterior from core.auditoria
        where recurso = 'caja-chica.comprobantes' and registro_id = $1 order by creado_en, id`,
      [comprobanteId],
    );

  async verReporte(ruta: string) {
    const respuesta = await this.e.propietario().get(`${REPORTES}/${ruta}`);
    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    return respuesta.cuerpo;
  }
}
