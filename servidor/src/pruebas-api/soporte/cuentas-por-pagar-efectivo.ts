import { expect } from 'vitest';
import type { ClienteApi } from './cliente-api.js';
import type { LineaDePrueba } from './cuentas-por-pagar-pagar.js';
import { registrarRetiro, retiroConCheque, RUTA_DE_RETIROS } from './cuentas-por-pagar-retiros.js';
import type { EscenarioDePagos } from './cuentas-por-pagar-pagar.js';
import { consultar } from './escenario-de-documentos.js';

/** Un pago del reparto: el proveedor y los cargos que se le pagan; `cambios` suma recibo, fecha, motivo, etc. */
export const pagoEnEfectivo = (proveedorId: string, aplicaciones: LineaDePrueba[], cambios = {}) => ({
  proveedorId,
  aplicaciones,
  ...cambios,
});

/** Reparte el efectivo del retiro entre los pagos dados (una sola operación). */
export const repartir = (cliente: ClienteApi, retiroId: string, pagos: Array<Record<string, unknown>>) =>
  cliente.post(`${RUTA_DE_RETIROS}/${retiroId}/pagos`, { pagos });

/** Registra un retiro con cheque (a nombre de «Juan Pérez») y comprueba que salió bien; devuelve el `RetiroDto`. */
export const unRetiro = (e: EscenarioDePagos, monto: string, cambios: Record<string, unknown> = {}) =>
  registrarRetiro(e.propietario(), retiroConCheque(e, monto, cambios));

/** Reparte y comprueba que salió bien (201); devuelve la respuesta (`retiro`, `pagos`, `avisos`). */
export async function repartirBien(cliente: ClienteApi, retiroId: string, pagos: Array<Record<string, unknown>>) {
  const respuesta = await repartir(cliente, retiroId, pagos);
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
  return respuesta.cuerpo;
}

/** Reparte y comprueba que se rechazó con ese estado y código; devuelve el error. */
export async function repartirMal(
  cliente: ClienteApi,
  retiroId: string,
  { pagos, estado, codigo }: { pagos: Array<Record<string, unknown>>; estado: number; codigo: string },
) {
  const respuesta = await repartir(cliente, retiroId, pagos);
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(estado);
  expect(respuesta.cuerpo.error.codigo).toBe(codigo);
  return respuesta.cuerpo.error;
}

/** Los pagos en efectivo de la base (de todo un retiro o de uno solo), con lo que guardan de efectivo y su estado. */
export const pagosEnEfectivoDeLaBase = (retiroId: string) =>
  consultar<{
    id: string;
    numero: number;
    forma: string;
    estado: string;
    monto: string;
    movimiento_id: string | null;
    recibido_por: string | null;
    motivo_sin_bancarizar: string | null;
    referencia: string | null;
    fecha_de_anulacion: string | null;
  }>(
    `select id, numero, forma, estado, monto::text, movimiento_id, recibido_por, motivo_sin_bancarizar, referencia,
            fecha_de_anulacion::text
       from cuentas_por_pagar.pagos where retiro_id = $1 order by numero`,
    [retiroId],
  );

/** Cuántos pagos hay en toda la base (para comprobar que un reparto rechazado no dejó nada). */
export async function cuantosPagos(): Promise<number> {
  const [fila] = await consultar<{ n: string }>('select count(*)::text as n from cuentas_por_pagar.pagos');
  return Number(fila!.n);
}
