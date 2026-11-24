import { expect } from 'vitest';
import { guardarSaldo } from './apertura-por-api.js';
import type { ProveedorDePrueba } from './cuentas-por-pagar-contrasenas.js';
import { RUTA_DE_PAGOS, type EscenarioDePagos } from './cuentas-por-pagar-pagar.js';
import { consultar, haceDias } from './escenario-de-documentos.js';
import { crearCuentaSinSaldo } from './escenarios-de-apertura.js';
import { crearPosfechadoDeApertura } from './posfechados-de-apertura.js';

/** La fecha de inicio de la carga inicial de estas pruebas: el corte es el día anterior. */
export const INICIO = haceDias(30);

let secuencia = 0;

/** Un saldo inicial autorizado y dentro de una contraseña del proveedor (por omisión Q700.00 por pagar al corte). */
export async function saldoEnContrasena(
  e: EscenarioDePagos,
  proveedor: ProveedorDePrueba,
  saldoPendiente = '700.00',
): Promise<string> {
  const creado = await e.propietario().post('/api/cuentas-por-pagar/saldos-iniciales', {
    proveedorId: proveedor.proveedorId,
    tipo: 'factura',
    serie: 'A',
    numero: `CA-${++secuencia}-${Math.random().toString(36).slice(2, 7)}`,
    fechaEmision: haceDias(90),
    vencimiento: haceDias(50),
    total: '1120.00',
    retenciones: '120.00',
    retencionesPorPracticar: '0.00',
    saldoPendiente,
    referencia: 'CXP-0045',
    tieneActivoFijo: false,
  });
  expect(creado.estado, JSON.stringify(creado.cuerpo)).toBe(201);
  const id = creado.cuerpo.id as string;
  await e.autorizar(id, { yaCompletado: true });
  await e.contrasena(proveedor, [id]);
  return id;
}

/** Un cheque posfechado de la carga inicial, en una cuenta nueva del banco; devuelve su movimiento y su cuenta. */
export async function posfechado(
  e: EscenarioDePagos,
  datos: { monto: string; beneficiario: string; fecha: string },
): Promise<{ movimientoId: string; cuentaId: string }> {
  const usuario = e.propietario();
  const cuentaId = await crearCuentaSinSaldo(usuario);
  expect((await guardarSaldo(usuario, cuentaId, '1000.00')).estado).toBe(200);
  const movimientoId = await crearPosfechadoDeApertura(usuario, cuentaId, datos);
  return { movimientoId, cuentaId };
}

/** Pagar `monto` del cargo con el cheque de apertura. */
export const ligarCheque = (
  e: EscenarioDePagos,
  datos: { proveedor: ProveedorDePrueba; movimientoId: string; cargoId: string; monto: string },
  cambios: Record<string, unknown> = {},
) =>
  e.propietario().post(`${RUTA_DE_PAGOS}/cheque-de-apertura`, {
    forma: 'cheque_de_apertura',
    movimientoId: datos.movimientoId,
    proveedorId: datos.proveedor.proveedorId,
    aplicaciones: [{ cargoId: datos.cargoId, monto: datos.monto }],
    ...cambios,
  });

/** El movimiento de Bancos como quedó: su origen, concepto y si sigue vigente. */
export async function movimientoEnBase(movimientoId: string) {
  const [fila] = await consultar<{
    modulo_de_origen: string | null;
    documento_de_origen_id: string | null;
    concepto: string;
    anulado_en: string | null;
    fecha: string;
  }>(
    `select m.modulo_de_origen, m.documento_de_origen_id::text, c.clave_de_sistema as concepto,
            m.anulado_en::text, m.fecha::text
       from bancos.movimientos m join bancos.conceptos c on c.id = m.concepto_id where m.id = $1`,
    [movimientoId],
  );
  return fila!;
}

export const fichaDelCargo = async (e: EscenarioDePagos, id: string) =>
  (await e.propietario().get(`/api/cuentas-por-pagar/documentos/${id}`)).cuerpo;
