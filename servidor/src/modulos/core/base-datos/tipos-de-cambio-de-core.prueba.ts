/**
 * Prueba de integración contra PostgreSQL: `core.tipos_de_cambio` y `core.consultas_al_banguat`, tablas de toda la
 * instalación que solo crecen (`docs/modulos/diseno-multimoneda.md` §6.1 y adenda A.5).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { codigoDeError, EscenarioDeMultimoneda, restriccionDeError } from './multimoneda-de-core.soporte.js';

const escenario = new EscenarioDeMultimoneda();

beforeAll(() => escenario.preparar());
afterAll(() => escenario.cerrar());

const dia = '2026-11-04';

describe('core.tipos_de_cambio', () => {
  it('el quetzal no tiene tipo, ni la referencia puede ser cero o negativa', async () => {
    const quetzal = escenario.tipoManual({ moneda: 'GTQ', fecha: dia, referencia: '1' });
    const cero = escenario.tipoManual({ moneda: 'EUR', fecha: dia, referencia: '0' });
    const negativa = escenario.tipoManual({ moneda: 'EUR', fecha: dia, referencia: '-1' });

    expect(await restriccionDeError(quetzal)).toBe('tipos_de_cambio_no_gtq');
    expect(await restriccionDeError(cero)).toBe('tipos_de_cambio_referencia_positiva');
    expect(await restriccionDeError(negativa)).toBe('tipos_de_cambio_referencia_positiva');
  });

  it('compra y venta, si vienen, son positivas', async () => {
    const insertar = escenario.propietario.query(
      `insert into core.tipos_de_cambio (moneda, fecha, referencia, compra, origen, motivo, registrado_por)
       values ('EUR', '2026-11-04', 8.8, 0, 'manual', 'x', $1)`,
      [escenario.usuarioId],
    );

    expect(await restriccionDeError(insertar)).toBe('tipos_de_cambio_compra_venta_positivas');
  });

  it('el origen es banguat o manual', async () => {
    const insertar = escenario.propietario.query(
      `insert into core.tipos_de_cambio (moneda, fecha, referencia, origen) values ('EUR', '2026-11-04', 8.8, 'otro')`,
    );

    expect(await restriccionDeError(insertar)).toBe('tipos_de_cambio_origen_valido');
  });

  it('uno manual lleva motivo y usuario', async () => {
    const sinMotivo = escenario.tipoManual({ moneda: 'EUR', fecha: dia }, null);
    const sinUsuario = escenario.propietario.query(
      `insert into core.tipos_de_cambio (moneda, fecha, referencia, origen, motivo) values ('EUR', '2026-11-04', 8.8, 'manual', 'x')`,
    );

    expect(await restriccionDeError(sinMotivo)).toBe('tipos_de_cambio_manual_completo');
    expect(await restriccionDeError(sinUsuario)).toBe('tipos_de_cambio_manual_completo');
  });

  it('uno del Banguat lleva consulta y código', async () => {
    const sinConsulta = escenario.propietario.query(
      `insert into core.tipos_de_cambio (moneda, fecha, referencia, origen, codigo_banguat) values ('EUR', '2026-11-04', 8.8, 'banguat', 24)`,
    );
    const sinCodigo = escenario.propietario.query(
      `insert into core.tipos_de_cambio (moneda, fecha, referencia, origen, consulta_id) values ('EUR', '2026-11-04', 8.8, 'banguat', $1)`,
      [escenario.consultaId],
    );

    expect(await restriccionDeError(sinConsulta)).toBe('tipos_de_cambio_banguat_con_consulta');
    expect(await restriccionDeError(sinCodigo)).toBe('tipos_de_cambio_banguat_con_codigo');
  });

  it('el motivo no pasa de 300 caracteres ni lleva espacios en los extremos', async () => {
    const conEspacios = escenario.tipoManual({ moneda: 'EUR', fecha: dia }, ' con espacio ');
    const largo = escenario.tipoManual({ moneda: 'EUR', fecha: dia }, 'x'.repeat(301));

    expect(await restriccionDeError(conEspacios)).toBe('tipos_de_cambio_motivo_valido');
    expect(await restriccionDeError(largo)).toBe('tipos_de_cambio_motivo_valido');
    expect(await codigoDeError(escenario.tipoManual({ moneda: 'EUR', fecha: dia }, 'x'.repeat(300)))).toBeUndefined();
  });

  it('solo una fila del Banguat por moneda y fecha, pero varias versiones manuales', async () => {
    const fecha = '2026-11-05';
    await escenario.tipoDelBanguat({ moneda: 'GBP', fecha, referencia: '10.2' }, 9);

    const repetida = escenario.tipoDelBanguat({ moneda: 'GBP', fecha, referencia: '10.3' }, 9);
    expect(await restriccionDeError(repetida)).toBe('tipos_de_cambio_banguat_unico');
    expect(await codigoDeError(escenario.tipoManual({ moneda: 'GBP', fecha, referencia: '10.25' }))).toBeUndefined();
    expect(await codigoDeError(escenario.tipoManual({ moneda: 'GBP', fecha, referencia: '10.26' }))).toBeUndefined();
  });

  it('guarda ocho decimales y la última versión por registrado_en es la vigente', async () => {
    await escenario.tipoManual({ moneda: 'EUR', fecha: '2026-11-09', referencia: '8.12345678' });
    const { rows } = await escenario.propietario.query(
      `select referencia from core.tipos_de_cambio where moneda = 'EUR' and fecha = '2026-11-09'
       order by registrado_en desc limit 1`,
    );

    expect(rows[0].referencia).toBe('8.12345678');
  });

  it('la aplicación agrega y lee, pero no cambia ni borra', async () => {
    const { aplicacion } = escenario;
    const agregar = aplicacion.query(
      `insert into core.tipos_de_cambio (moneda, fecha, referencia, origen, motivo, registrado_por)
       values ('EUR', '2026-11-10', 8.9, 'manual', 'Soporte', $1)`,
      [escenario.usuarioId],
    );
    expect(await codigoDeError(agregar)).toBeUndefined();

    const leidas = await aplicacion.query(`select id from core.tipos_de_cambio where fecha = '2026-11-10'`);
    expect(leidas.rows).toHaveLength(1);
    expect(await codigoDeError(aplicacion.query(`update core.tipos_de_cambio set referencia = 1`))).toBe('42501');
    expect(await codigoDeError(aplicacion.query(`delete from core.tipos_de_cambio`))).toBe('42501');
  });

  it('solo tiene políticas de insertar y leer: la RLS rechazaría cambiar o borrar aunque hubiera privilegio', async () => {
    const { rows } = await escenario.propietario.query(
      `select tablename, cmd from pg_policies where schemaname = 'core'
       and tablename in ('tipos_de_cambio', 'consultas_al_banguat') order by 1, 2`,
    );

    expect(rows).toEqual([
      { tablename: 'consultas_al_banguat', cmd: 'INSERT' },
      { tablename: 'consultas_al_banguat', cmd: 'SELECT' },
      { tablename: 'tipos_de_cambio', cmd: 'INSERT' },
      { tablename: 'tipos_de_cambio', cmd: 'SELECT' },
    ]);
  });
});

describe('core.consultas_al_banguat', () => {
  const insertar = (cliente: typeof escenario.aplicacion, tipo: [string, string, string], detalle = 'x') =>
    cliente.query(
      `insert into core.consultas_al_banguat (iniciada_en, terminada_en, operacion, vuelta, resultado, detalle)
       values (now(), now(), $1, $2, $3, $4)`,
      [...tipo, detalle],
    );

  it('admite las operaciones, vueltas y resultados de la adenda y rechaza otros', async () => {
    const { aplicacion } = escenario;

    expect(
      await codigoDeError(insertar(aplicacion, ['VariablesDisponibles', 'lista', 'valor_ambiguo'])),
    ).toBeUndefined();
    expect(await restriccionDeError(insertar(aplicacion, ['Otra', 'lista', 'exito']))).toBe(
      'consultas_al_banguat_operacion_valida',
    );
    expect(await restriccionDeError(insertar(aplicacion, ['TipoCambioDia', 'tarde', 'exito']))).toBe(
      'consultas_al_banguat_vuelta_valida',
    );
    expect(await restriccionDeError(insertar(aplicacion, ['TipoCambioDia', 'noche', 'fallo']))).toBe(
      'consultas_al_banguat_resultado_valido',
    );
  });

  it('el detalle no pasa de 500 caracteres', async () => {
    const largo = insertar(escenario.propietario, ['TipoCambioDia', 'noche', 'error'], 'x'.repeat(501));

    expect(await restriccionDeError(largo)).toBe('consultas_al_banguat_detalle_corto');
  });

  it('la aplicación solo agrega y lee', async () => {
    const { aplicacion } = escenario;

    expect(await codigoDeError(aplicacion.query(`select count(*) from core.consultas_al_banguat`))).toBeUndefined();
    const cambiar = aplicacion.query(`update core.consultas_al_banguat set resultado = 'exito'`);
    expect(await codigoDeError(cambiar)).toBe('42501');
    expect(await codigoDeError(aplicacion.query(`delete from core.consultas_al_banguat`))).toBe('42501');
  });
});
