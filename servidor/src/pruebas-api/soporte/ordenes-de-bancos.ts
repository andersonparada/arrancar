import { expect } from 'vitest';
import type { Operador } from '../../modulos/core/compartido/aplicacion/operador.js';
import '../../modulos/core/contratos/bancos.contratos.js';
import type { ClienteApi } from './cliente-api.js';
import { comoPropietario } from './consultas-de-propietario.js';
import { crearCuentaBancaria } from './escenarios-de-bancos.js';
import type { CuentaDePrueba } from './escenarios.js';

/** Los módulos de una cuenta con Bancos y Cuentas por pagar activos. */
export const MODULOS_CON_CUENTAS_POR_PAGAR = ['terceros', 'libro-de-compras', 'bancos', 'cuentas-por-pagar'];

/** El operador de la cuenta de prueba, para llamar las órdenes del mediador como lo haría otro módulo. */
export async function operadorDeLaCuenta(cuenta: CuentaDePrueba): Promise<Operador> {
  const [usuario] = await comoPropietario<{ id: string }>('select id from core.usuarios where usuario = $1', [
    cuenta.usuario,
  ]);
  return { usuarioId: usuario!.id, cuentaId: cuenta.cuentaId, empresaId: cuenta.empresaId, esSuperacceso: false };
}

/** Una cuenta bancaria con Q 1,000.00 de saldo inicial y una chequera del 1 al 50. */
export async function cuentaConChequera(
  usuario: ClienteApi,
  nombre: string,
): Promise<{ cuentaBancariaId: string; chequeraId: string }> {
  const cuentaBancariaId = await crearCuentaBancaria(usuario, nombre);
  const chequera = await usuario.post(`/api/bancos/cuentas-bancarias/${cuentaBancariaId}/chequeras`, {
    serie: null,
    desde: 1,
    hasta: 50,
  });
  expect(chequera.estado).toBe(201);
  return { cuentaBancariaId, chequeraId: chequera.cuerpo.id as string };
}

/** El movimiento tal como lo ve la pantalla de notas o de movimientos. */
export async function movimientoDe(usuario: ClienteApi, movimientoId: string) {
  return (await usuario.get(`/api/bancos/notas/${movimientoId}`)).cuerpo;
}

/** Las líneas del reparto por concepto de un movimiento, de la más chica a la más grande. */
export const desgloseDe = (movimientoId: string) =>
  comoPropietario<{ clave: string; monto: string }>(
    `select c.clave_de_sistema as clave, d.monto::text as monto
       from bancos.desglose_de_movimientos d join bancos.conceptos c on c.id = d.concepto_id
      where d.movimiento_id = $1 order by d.monto, c.clave_de_sistema`,
    [movimientoId],
  );

/** Las anotaciones de auditoría de un registro. */
export const auditoriaDe = (registroId: string) =>
  comoPropietario<{ accion: string; motivo: string | null; recurso: string }>(
    'select accion, motivo, recurso from core.auditoria where registro_id = $1 order by creado_en',
    [registroId],
  );
