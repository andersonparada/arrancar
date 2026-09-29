import pg from 'pg';
import { beforeAll, describe, expect, it } from 'vitest';
import { configuracion } from '../configuracion.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';
import { conceptoGeneral } from './soporte/escenarios-de-bancos.js';

const RUTA_NOTAS = '/api/bancos/notas';
const RUTA_SALDOS_INICIALES = '/api/bancos/saldos-iniciales';
const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let cuentaBancariaId: string;
let conceptoId = '';

interface Correccion {
  recurso: string;
  registro_id: string;
  anterior: { monto: string; fecha: string };
}

/** Las correcciones auditadas de la cuenta, leídas como propietario de la base (la app solo puede agregar). */
async function correccionesAuditadas(): Promise<Correccion[]> {
  const conexion = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
  await conexion.connect();
  const { rows } = await conexion.query<Correccion>(
    "select recurso, registro_id, anterior from core.auditoria where cuenta_id = $1 and accion = 'corregir' order by creado_en",
    [cuenta.cuentaId],
  );
  await conexion.end();
  return rows;
}

const datos = (cambios: Record<string, unknown> = {}) => ({
  tipo: 'credito',
  fecha: '2026-01-15',
  monto: '12.50',
  referencia: 'Boleta',
  beneficiario: null,
  observaciones: null,
  cuentaBancariaId,
  conceptoId,
  ...cambios,
});

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, {
    nombre: 'Corregida',
    usuario: 'propietariocorregido',
    modulos: ['bancos'],
  });
  const banco = await cuenta.propietario.post('/api/bancos/bancos', {
    nombre: 'BI',
    observaciones: null,
    activo: true,
  });
  const cuentaBancaria = await cuenta.propietario.post('/api/bancos/cuentas-bancarias', {
    nombre: 'Principal',
    bancoId: banco.cuerpo.id as string,
    numero: 'Principal',
    tipo: 'monetaria',
    observaciones: null,
    activo: true,
  });
  cuentaBancariaId = cuentaBancaria.cuerpo.id as string;
  conceptoId = await conceptoGeneral(cuenta.propietario);
});

describe('auditoría de correcciones de Bancos', () => {
  it('corregir una nota guarda cómo estaba', async () => {
    const creada = await cuenta.propietario.post(RUTA_NOTAS, datos());

    const corregida = await cuenta.propietario.put(
      `${RUTA_NOTAS}/${creada.cuerpo.id}`,
      datos({ monto: '99.00', fecha: '2026-01-20' }),
    );

    expect(corregida.estado).toBe(200);
    expect((await correccionesAuditadas()).at(-1)).toMatchObject({
      recurso: 'bancos.movimientos',
      registro_id: creada.cuerpo.id,
      anterior: { monto: '12.50', fecha: '2026-01-15' },
    });
  });

  it('corregir el saldo inicial guarda cómo estaba', async () => {
    const ruta = RUTA_SALDOS_INICIALES;
    const inicial = await cuenta.propietario.post(ruta, datos({ fecha: '2025-01-01', monto: '1000.00' }));

    await cuenta.propietario.put(`${ruta}/${inicial.cuerpo.id}`, datos({ fecha: '2025-01-01', monto: '1500.00' }));

    expect((await correccionesAuditadas()).at(-1)).toMatchObject({
      registro_id: inicial.cuerpo.id,
      anterior: { monto: '1000.00', fecha: '2025-01-01' },
    });
  });

  it('una corrección rechazada no deja rastro', async () => {
    const antes = (await correccionesAuditadas()).length;
    const iniciales = await cuenta.propietario.get(RUTA_SALDOS_INICIALES);
    const inicial = { cuerpo: iniciales.cuerpo[0] as { id: string } };

    const rechazada = await cuenta.propietario.put(
      `${RUTA_NOTAS}/${inicial.cuerpo.id}`,
      datos({ beneficiario: 'Prueba', observaciones: 'Prueba' }),
    );

    expect(rechazada.cuerpo.error.codigo).toBe('no_es_una_nota');
    expect(await correccionesAuditadas()).toHaveLength(antes);
  });
});
