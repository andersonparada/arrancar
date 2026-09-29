import { expect } from 'vitest';
import type { ClienteApi } from './cliente-api.js';
import { comoPropietario } from './consultas-de-propietario.js';
import { conceptoDeSistema, crearCuentaBancaria } from './escenarios-de-bancos.js';
import type { CuentaDePrueba } from './escenarios.js';

const RUTA_NOTAS = '/api/bancos/notas';
const RUTA_CHEQUES = '/api/bancos/cheques';

/** Un concepto propio de la empresa del usuario; falla si la API no lo crea. */
export async function crearConcepto(usuario: ClienteApi, nombre: string, aplicaA = 'ambos'): Promise<string> {
  const creado = await usuario.post('/api/bancos/conceptos', {
    nombre,
    aplicaA,
    actividadDeFlujo: 'operacion',
    grupoDeFlujo: null,
    esCargoBancario: false,
    pideDatosDeIntereses: false,
    admiteFactura: false,
    activo: true,
  });
  expect(creado.estado).toBe(201);
  return creado.cuerpo.id as string;
}

/**
 * Lo que necesitan las pruebas de sugerencias de concepto (P7): una cuenta bancaria con chequera y conceptos de
 * ejemplo, más funciones para dejar notas y cheques clasificados o pendientes («Sin clasificar»). Los montos son
 * pequeños para no chocar con el saldo inicial de Q 1,000.00 (no se permite el sobregiro).
 */
export async function crearEscenarioDeSugerencias(cuenta: CuentaDePrueba, nombreDeLaCuenta: string) {
  const usuario = cuenta.propietario;
  const cuentaBancariaId = await crearCuentaBancaria(usuario, nombreDeLaCuenta);
  await usuario.post(`/api/bancos/cuentas-bancarias/${cuentaBancariaId}/chequeras`, {
    serie: null,
    desde: 1,
    hasta: 60,
  });
  const sinClasificar = (await conceptoDeSistema(usuario, 'sin_clasificar')).id;
  const pagoAProveedores = (await conceptoDeSistema(usuario, 'pago_a_proveedor')).id;
  const mantenimiento = await crearConcepto(usuario, 'Mantenimiento');
  const comisiones = await crearConcepto(usuario, 'Comisiones', 'debito');
  const deposito = await crearConcepto(usuario, 'Depósito', 'credito');

  const nota = (cambios: Record<string, unknown> = {}) => ({
    cuentaBancariaId,
    tipo: 'debito',
    fecha: '2026-02-01',
    monto: '10.00',
    referencia: null,
    beneficiario: null,
    observaciones: null,
    conceptoId: mantenimiento,
    ...cambios,
  });
  const dejarSinClasificar = (id: string) =>
    comoPropietario('update bancos.movimientos set concepto_id = $1 where id = $2', [sinClasificar, id]);
  const notaClasificada = async (cambios: Record<string, unknown> = {}): Promise<string> => {
    const creada = await usuario.post(RUTA_NOTAS, nota(cambios));
    expect(creada.estado).toBe(201);
    return creada.cuerpo.id as string;
  };
  const notaPendiente = async (cambios: Record<string, unknown> = {}): Promise<string> => {
    const id = await notaClasificada(cambios);
    await dejarSinClasificar(id);
    return id;
  };
  /** Emite el siguiente cheque de la cuenta (por omisión «Pago a proveedores»); devuelve su movimiento. */
  const emitirCheque = async (cambios: Record<string, unknown> = {}) => {
    const siguiente = await usuario.get(`/api/bancos/cuentas-bancarias/${cuentaBancariaId}/siguiente-cheque`);
    const emitido = await usuario.post(`${RUTA_CHEQUES}/${siguiente.cuerpo.id}/emitir`, {
      fecha: '2026-02-05',
      monto: '5.00',
      beneficiario: 'Proveedor de cheques',
      noNegociable: true,
      referencia: null,
      observaciones: null,
      conceptoId: pagoAProveedores,
      ...cambios,
    });
    expect(emitido.estado).toBe(200);
    return { chequeId: siguiente.cuerpo.id as string, movimientoId: emitido.cuerpo.id as string };
  };
  const conceptoDe = async (id: string) => (await usuario.get(`${RUTA_NOTAS}/${id}`)).cuerpo.conceptoId as string;

  return {
    cuentaBancariaId,
    sinClasificar,
    pagoAProveedores,
    mantenimiento,
    comisiones,
    deposito,
    nota,
    dejarSinClasificar,
    notaClasificada,
    notaPendiente,
    emitirCheque,
    conceptoDe,
  };
}

export type EscenarioDeSugerencias = Awaited<ReturnType<typeof crearEscenarioDeSugerencias>>;
