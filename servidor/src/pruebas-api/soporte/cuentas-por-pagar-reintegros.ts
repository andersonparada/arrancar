import { expect } from 'vitest';
import type { ClienteApi } from './cliente-api.js';
import type { ProveedorDePrueba } from './cuentas-por-pagar-contrasenas.js';
import type { EscenarioDePagos } from './cuentas-por-pagar-pagar.js';
import { consultar, haceDias } from './escenario-de-documentos.js';

export const RUTA_DE_REINTEGROS = '/api/cuentas-por-pagar/reintegros';
const RUTA_DE_DOCUMENTOS = '/api/cuentas-por-pagar/documentos';

/** Una nota de crédito de Q100.00 de saldo libre y la factura que corrige, por su id de Cuentas por pagar. */
export interface NotaDePrueba {
  proveedor: ProveedorDePrueba;
  notaPropia: string;
  facturaPropia: string;
}

/**
 * Una factura de Q1,120.00 con Q100.00 retenidos y una nota de crédito de Q1,120.00 que la rebaja entera: la nota aplica
 * Q1,020.00 y deja Q100.00 de saldo libre. Con `facturaDeActivo` la factura (no la nota) es de activo fijo; con
 * `completar: false` la nota sigue pendiente en la bandeja.
 */
export async function notaConSaldoLibre(
  e: EscenarioDePagos,
  proveedor: ProveedorDePrueba,
  { facturaDeActivo = false, completar = true }: { facturaDeActivo?: boolean; completar?: boolean } = {},
): Promise<NotaDePrueba> {
  const { documentos } = e.mundo;
  const comunes = { ...proveedor, fechaRecepcion: haceDias(3) };
  const lineas = facturaDeActivo ? { lineas: [{ conceptoId: e.conceptoDeActivo, total: '1120.00' }] } : {};
  const facturaId = await documentos.registrar({ ...comunes, ...lineas });
  await consultar('update cuentas_por_pagar.documentos set retenciones = 100 where documento_id = $1', [facturaId]);
  const notaId = await documentos.registrarNota('NCRE', facturaId, { total: '1120.00', ...comunes });
  const notaPropia = (await documentos.fila(notaId))!.id;
  if (completar) {
    const registrada = await e
      .propietario()
      .post(`${RUTA_DE_DOCUMENTOS}/registrar`, { documentos: [{ id: notaPropia }] });
    expect(registrada.estado, JSON.stringify(registrada.cuerpo)).toBe(200);
  }
  return { proveedor, notaPropia, facturaPropia: (await documentos.fila(facturaId))!.id };
}

/** El cuerpo de un reintegro por depósito en la cuenta del escenario, con las notas y montos dados. */
/* eslint-disable max-params -- ayuda de pruebas: lee igual que efectivoDe, con la cuenta del escenario delante */
export const depositoDe = (
  e: EscenarioDePagos,
  proveedorId: string,
  notas: Array<{ notaId: string; monto: string }>,
  cambios: Record<string, unknown> = {},
) => ({
  proveedorId,
  forma: 'deposito',
  cuentaBancariaId: e.cuentaBancariaId,
  referencia: 'BOL-77',
  notas,
  ...cambios,
});
/* eslint-enable max-params */

/** El cuerpo de un reintegro en efectivo con el recibo de caja dado. */
export const efectivoDe = (
  proveedorId: string,
  notas: Array<{ notaId: string; monto: string }>,
  cambios: Record<string, unknown> = {},
) => ({ proveedorId, forma: 'efectivo', referencia: 'RC-15', notas, ...cambios });

/** Registra un reintegro y comprueba que salió bien; devuelve el `ReintegroDto`. */
export async function registrarReintegro(cliente: ClienteApi, cuerpo: Record<string, unknown>) {
  const respuesta = await cliente.post(RUTA_DE_REINTEGROS, cuerpo);
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
  return respuesta.cuerpo;
}

/** El reintegro como quedó en la base: estado, fecha contable de la anulación y sus líneas vigentes. */
export async function reintegroEnBase(reintegroId: string) {
  const [fila] = await consultar<{
    estado: string;
    fecha: string;
    forma: string;
    monto: string;
    movimiento_id: string | null;
    referencia: string | null;
    numero: number;
    anio_de_numero: number;
    fecha_de_anulacion: string | null;
    vigentes: string;
  }>(
    `select r.estado, r.fecha::text, r.forma, r.monto::text, r.movimiento_id, r.referencia, r.numero, r.anio_de_numero,
            r.fecha_de_anulacion::text,
            (select count(*) from cuentas_por_pagar.aplicaciones_de_reintegros a where a.reintegro_id = r.id and a.vigente)::text as vigentes
       from cuentas_por_pagar.reintegros r where r.id = $1`,
    [reintegroId],
  );
  return fila!;
}

/** Pasa el reintegro y su nota de Bancos a otra fecha (la prueba la necesita en un mes ya conciliado); no pasa por los casos de uso. */
export async function moverFechaDelReintegro(reintegroId: string, fecha: string): Promise<void> {
  await consultar(
    'update bancos.movimientos set fecha = $2 where id = (select movimiento_id from cuentas_por_pagar.reintegros where id = $1)',
    [reintegroId, fecha],
  );
  await consultar('update cuentas_por_pagar.reintegros set fecha = $2 where id = $1', [reintegroId, fecha]);
}

export async function cuantosReintegros(): Promise<number> {
  const [fila] = await consultar<{ total: string }>('select count(*)::text as total from cuentas_por_pagar.reintegros');
  return Number(fila!.total);
}

/** La nota de crédito de Bancos de un depósito, tal como quedó en la base. */
export async function notaDelDeposito(movimientoId: string) {
  const [fila] = await consultar<{
    tipo: string;
    beneficiario: string | null;
    referencia: string | null;
    modulo: string | null;
    origen: string | null;
    monto: string;
    clave: string | null;
    anulada: boolean;
    inverso_fecha: string | null;
  }>(
    `select m.tipo, m.beneficiario, m.referencia, m.modulo_de_origen as modulo, m.documento_de_origen_id as origen,
            m.monto::text, c.clave_de_sistema as clave, (m.anulado_en is not null or m.revertido_en is not null) as anulada,
            (select i.fecha::text from bancos.movimientos i where i.revierte_a_id = m.id) as inverso_fecha
       from bancos.movimientos m left join bancos.conceptos c on c.id = m.concepto_id where m.id = $1`,
    [movimientoId],
  );
  return fila!;
}

/** El reparto por concepto de un movimiento con dos conceptos, por clave de sistema. */
export async function desgloseDe(movimientoId: string): Promise<Array<{ clave: string; monto: string }>> {
  return consultar<{ clave: string; monto: string }>(
    `select c.clave_de_sistema as clave, d.monto::text from bancos.desglose_de_movimientos d
       join bancos.conceptos c on c.id = d.concepto_id where d.movimiento_id = $1 order by d.monto`,
    [movimientoId],
  );
}

/** Cuántos movimientos tiene la cuenta (para comprobar que un rechazo o el efectivo no dejaron nada en Bancos). */
export async function cuantosMovimientosEn(cuentaBancariaId: string): Promise<number> {
  const [fila] = await consultar<{ total: string }>(
    'select count(*)::text as total from bancos.movimientos where cuenta_bancaria_id = $1',
    [cuentaBancariaId],
  );
  return Number(fila!.total);
}
