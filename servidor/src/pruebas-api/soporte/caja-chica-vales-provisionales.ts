import { expect } from 'vitest';
import type { ClienteApi } from './cliente-api.js';
import { RUTA_DE_FONDOS } from './caja-chica-fondos.js';
import { RUTA_DE_CAJA_CHICA, type EscenarioDeComprobantes } from './caja-chica-comprobantes.js';
import { comoPropietario } from './consultas-de-propietario.js';

export const RUTA_DE_VALES = `${RUTA_DE_CAJA_CHICA}/vales-provisionales`;

/** Lo que repiten las pruebas de los vales provisionales sobre un escenario de comprobantes. */
export class AyudasDeVales {
  constructor(private readonly e: EscenarioDeComprobantes) {}

  fondoDe = (nombre: string) => this.e.abrirFondo(nombre, { monto: '3000.00' });

  fondoGrande = (nombre: string) => this.e.abrirFondo(nombre, { monto: '8000.00', topePorComprobante: '8000.00' });

  ficha = async (fondoId: string) => (await this.e.propietario().get(`${RUTA_DE_FONDOS}/${fondoId}`)).cuerpo;

  entregar = (fondoId: string, cambios: Record<string, unknown> = {}, cliente: ClienteApi = this.e.propietario()) =>
    cliente.post(`${RUTA_DE_FONDOS}/${fondoId}/vales-provisionales`, {
      monto: '500.00',
      entregadoA: 'Pedro Compras',
      motivo: 'Compra de repuestos',
      ...cambios,
    });

  entregarBien = async (fondoId: string, cambios: Record<string, unknown> = {}) => {
    const respuesta = await this.entregar(fondoId, cambios);
    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
    return respuesta.cuerpo;
  };

  liquidar = (valeId: string, cuerpo: Record<string, unknown> = {}, cliente: ClienteApi = this.e.propietario()) =>
    cliente.post(`${RUTA_DE_VALES}/${valeId}/liquidar`, cuerpo);

  anular = (valeId: string, cuerpo: Record<string, unknown> = { motivo: 'x' }, cliente = this.e.propietario()) =>
    cliente.post(`${RUTA_DE_VALES}/${valeId}/anular`, cuerpo);

  /** El gasto sin factura que justifica un vale: Q50.00 por omisión. */
  gasto = (cambios: Record<string, unknown> = {}) => {
    const { monto, descripcion, pagadoA, conceptoDeGastoId, motivoSinDocumento } = this.e.cuerpoDeVale();
    return { monto, descripcion, pagadoA, conceptoDeGastoId, motivoSinDocumento, ...cambios };
  };
}

export const valeEnBase = async (valeId: string) =>
  (
    await comoPropietario<{ estado: string; devuelto: string; fecha_de_liquidacion: string | null }>(
      'select estado, devuelto::text, fecha_de_liquidacion::text from caja_chica.vales_provisionales where id = $1',
      [valeId],
    )
  )[0]!;

export const comprobantesDelVale = (valeId: string) =>
  comoPropietario<{ clase: string; monto: string; fondo_id: string }>(
    'select clase, monto::text, fondo_id from caja_chica.comprobantes where vale_provisional_id = $1 order by clase',
    [valeId],
  );
