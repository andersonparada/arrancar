/**
 * BS-1: chequera de apertura, foto de cheques cobrados antes de su fecha, permisos y concepto de la migración 0034.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearCuentaSinSaldo, restriccionDe } from './soporte/escenarios-de-apertura.js';
import { darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
const crearCuenta = () => crearCuentaSinSaldo(cuenta.propietario);

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, {
    nombre: 'Chequeras apertura',
    usuario: 'propietariochequerasapertura',
    modulos: ['bancos'],
  });
});

describe('bancos.chequeras: chequera de apertura', () => {
  interface Chequera {
    serie: string | null;
    activa: boolean;
    deApertura: boolean;
  }
  const insertar = (cuentaBancariaId: string, { serie, activa, deApertura }: Chequera) =>
    restriccionDe(
      `insert into bancos.chequeras (empresa_id, cuenta_bancaria_id, serie, desde, hasta, activa, de_apertura)
       values ($1, $2, $3, 1, 1, $4, $5)`,
      [cuenta.empresaId, cuentaBancariaId, serie, activa, deApertura],
    );

  it('nunca está activa', async () => {
    const cuentaId = await crearCuenta();
    expect(await insertar(cuentaId, { serie: null, activa: true, deApertura: true })).toBe(
      'chequeras_apertura_inactiva',
    );
    expect(await insertar(cuentaId, { serie: null, activa: false, deApertura: true })).toBeNull();
  });

  it('una por cuenta y serie (la serie vacía y la nula son la misma); las normales no se ven afectadas', async () => {
    const cuentaId = await crearCuenta();
    expect(await insertar(cuentaId, { serie: null, activa: false, deApertura: true })).toBeNull();
    expect(await insertar(cuentaId, { serie: null, activa: false, deApertura: true })).toBe(
      'chequeras_de_apertura_unica',
    );
    expect(await insertar(cuentaId, { serie: '', activa: false, deApertura: true })).toBe(
      'chequeras_de_apertura_unica',
    );
    expect(await insertar(cuentaId, { serie: 'A', activa: false, deApertura: true })).toBeNull();
    expect(await insertar(cuentaId, { serie: 'A', activa: false, deApertura: true })).toBe(
      'chequeras_de_apertura_unica',
    );
    expect(await insertar(cuentaId, { serie: 'A', activa: true, deApertura: false })).toBeNull();
    expect(await insertar(cuentaId, { serie: 'A', activa: true, deApertura: false })).toBeNull();
    expect(await insertar(await crearCuenta(), { serie: 'A', activa: false, deApertura: true })).toBeNull();
  });
});

describe('bancos.conciliaciones: foto de cheques cobrados antes de su fecha', () => {
  it('la columna existe, es nula en lo que ya había y admite dos decimales', async () => {
    const columna = await comoPropietario<{ is_nullable: string; numeric_precision: number; numeric_scale: number }>(
      `select is_nullable, numeric_precision, numeric_scale from information_schema.columns
       where table_schema = 'bancos' and table_name = 'conciliaciones' and column_name = 'foto_total_cobrados_antes_de_su_fecha'`,
      [],
    );
    expect(columna).toEqual([{ is_nullable: 'YES', numeric_precision: 14, numeric_scale: 2 }]);
  });
});

describe('permisos y concepto de la 0034', () => {
  it('los permisos nuevos están declarados y el concepto de sistema nace con el catálogo', async () => {
    const rol = await cuenta.propietario.post('/api/roles', {
      nombre: 'Saldos iniciales',
      permisos: ['bancos.saldos-iniciales.ver', 'bancos.saldos-iniciales.anular'],
    });
    expect(rol.estado).toBe(201);
    const lista = await cuenta.propietario.get('/api/bancos/conceptos');
    const apertura = (
      lista.cuerpo as Array<{ claveDeSistema: string | null; aplicaA: string; actividadDeFlujo: string }>
    ).find((concepto) => concepto.claveDeSistema === 'anulacion_de_apertura');
    expect(apertura).toMatchObject({ aplicaA: 'ambos', actividadDeFlujo: 'ninguna' });
  });
});
