import type { ClienteApi } from './cliente-api.js';

/** Un banco y una cuenta bancaria activa, con saldo inicial de Q 1,000.00 el 2026-01-01. */
export async function crearCuentaBancaria(usuario: ClienteApi, nombre: string): Promise<string> {
  const banco = await usuario.post('/api/bancos/bancos', { nombre, observaciones: null, activo: true });
  const cuentaBancaria = await usuario.post('/api/bancos/cuentas-bancarias', {
    nombre,
    bancoId: banco.cuerpo.id as string,
    numero: nombre,
    tipo: 'monetaria',
    observaciones: null,
    activo: true,
  });
  await usuario.post('/api/bancos/saldos-iniciales', {
    cuentaBancariaId: cuentaBancaria.cuerpo.id,
    tipo: 'credito',
    fecha: '2026-01-01',
    monto: '1000.00',
    referencia: null,
    observaciones: null,
  });
  return cuentaBancaria.cuerpo.id as string;
}

/** El saldo de la cuenta bancaria, como texto con dos decimales. */
export async function saldoDe(usuario: ClienteApi, cuentaBancariaId: string): Promise<string> {
  return (await usuario.get(`/api/bancos/cuentas-bancarias/${cuentaBancariaId}`)).cuerpo.saldo;
}

/** Los movimientos de la cuenta que son el inverso de otro. */
export async function inversosDe(
  usuario: ClienteApi,
  cuentaBancariaId: string,
): Promise<Array<Record<string, unknown>>> {
  const reporte = await usuario.get(`/api/bancos/movimientos/reporte?cuentaBancariaId=${cuentaBancariaId}`);
  return reporte.cuerpo.filas.filter((m: { revierteAId: string | null }) => m.revierteAId !== null);
}

const NOMBRE_DEL_CONCEPTO_GENERAL = 'General de prueba';

/**
 * Un concepto propio de la empresa del usuario que sirve para créditos, débitos y cheques (H3b): lo busca por
 * nombre y, si no está, lo crea. Sembrar el catálogo ocurre solo al listar.
 */
export async function conceptoGeneral(usuario: ClienteApi): Promise<string> {
  const lista = await usuario.get('/api/bancos/conceptos');
  const existente = (lista.cuerpo as Array<{ id: string; nombre: string }>).find(
    (concepto) => concepto.nombre === NOMBRE_DEL_CONCEPTO_GENERAL,
  );
  if (existente) return existente.id;
  const creado = await usuario.post('/api/bancos/conceptos', {
    nombre: NOMBRE_DEL_CONCEPTO_GENERAL,
    aplicaA: 'ambos',
    actividadDeFlujo: 'operacion',
    grupoDeFlujo: null,
    esCargoBancario: false,
    pideDatosDeIntereses: false,
    admiteFactura: false,
    activo: true,
  });
  return creado.cuerpo.id as string;
}

/** El id del concepto de sistema con esa clave (`sin_clasificar`, `transferencia`, `saldo_inicial`…). */
export async function conceptoDeSistema(usuario: ClienteApi, clave: string): Promise<{ id: string; nombre: string }> {
  const lista = await usuario.get('/api/bancos/conceptos');
  return (lista.cuerpo as Array<{ id: string; nombre: string; claveDeSistema: string | null }>).find(
    (concepto) => concepto.claveDeSistema === clave,
  )!;
}
