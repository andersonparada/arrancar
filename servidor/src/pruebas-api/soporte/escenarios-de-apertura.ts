import type pg from 'pg';
import { comoPropietario } from './consultas-de-propietario.js';
import type { ClienteApi } from './cliente-api.js';

let secuencia = 0;

/** Un banco y una cuenta bancaria activa, sin saldo inicial. */
export async function crearCuentaSinSaldo(usuario: ClienteApi): Promise<string> {
  secuencia += 1;
  const banco = await usuario.post('/api/bancos/bancos', {
    nombre: `Banco apertura ${secuencia}`,
    observaciones: null,
    activo: true,
  });
  const creada = await usuario.post('/api/bancos/cuentas-bancarias', {
    nombre: `Cuenta apertura ${secuencia}`,
    bancoId: banco.cuerpo.id as string,
    numero: `apertura-${secuencia}`,
    tipo: 'monetaria',
    observaciones: null,
    activo: true,
  });
  return creada.cuerpo.id as string;
}

/** La restricción de la base que rechazó la consulta (como propietario, sin RLS), o `null` si pasó. */
export async function restriccionDe(sql: string, parametros: unknown[]): Promise<string | null> {
  try {
    await comoPropietario(sql, parametros);
    return null;
  } catch (error) {
    return (error as pg.DatabaseError).constraint ?? String(error);
  }
}

/** La cabecera de saldo inicial de la cuenta, creada directo en la base. */
export async function crearCabecera(empresaId: string, cuentaBancariaId: string): Promise<string> {
  const [fila] = await comoPropietario<{ id: string }>(
    'insert into bancos.saldos_iniciales (empresa_id, cuenta_bancaria_id) values ($1, $2) returning id',
    [empresaId, cuentaBancariaId],
  );
  return fila!.id;
}
