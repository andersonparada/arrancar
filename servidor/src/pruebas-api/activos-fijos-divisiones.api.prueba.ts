/**
 * Dividir un activo con cantidad (AFI-5): el ejemplo de §7.6 (50 sillas, 20 se separan), la ficha, las cuotas del cierre
 * después de dividir, la baja de uno de los dos activos, lo que se rechaza, los permisos y el aislamiento entre cuentas.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { claseDe } from './soporte/escenario-de-activos.js';
import {
  ACTIVOS,
  auditoriaDe,
  cerrarMes,
  cuotasDe,
  dividir,
  ficha,
  grupoEnUso,
  tramosDe,
} from './soporte/escenario-de-divisiones.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let ajena: CuentaDePrueba;
let sillas: string;
let lote: string;
let claseId: string;
let division: Record<string, any>;

const BAJAS = '/api/activos-fijos/bajas';
const baja = (activoId: string, fecha: string) => ({
  activoId,
  fecha,
  causa: 'destruccion',
  descripcion: 'Quedó inservible',
  autorizadaPor: 'Gerencia',
});

beforeAll(async () => {
  const modulos = ['terceros', 'libro-de-compras', 'activos-fijos'];
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Divisiones', usuario: 'propietariodivisiones', modulos });
  ajena = await darDeAltaCuenta(entorno, { nombre: 'Divisiones ajena', usuario: 'propietariodivajena', modulos });
  claseId = await claseDe(cuenta, 'Instalaciones y mobiliario');
  sillas = await grupoEnUso(cuenta, claseId, { cantidad: 50, monto: '15000.00' });
  lote = await grupoEnUso(cuenta, claseId, { cantidad: 30, monto: '9000.00' });
  await cerrarMes(cuenta, '2026-09-01');
  await cerrarMes(cuenta, '2026-10-01');
});

describe('dividir 20 de 50 sillas en noviembre, con septiembre y octubre cerrados', () => {
  it('reparte costo, acumulada y cuotas como el ejemplo de §7.6 y deja la auditoría con cómo estaba', async () => {
    const respuesta = await dividir(cuenta, sillas);

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
    division = respuesta.cuerpo;
    expect(division).toMatchObject({
      cantidadOriginal: 50,
      cantidadSeparada: 20,
      causa: 'manual',
      estado: 'vigente',
      periodo: '2026-11-01',
      costoSeparado: '6000.00',
      costoFiscalSeparado: '6000.00',
      acumuladaContableSeparada: '200.00',
      acumuladaFiscalSeparada: '200.00',
    });
    const [filaDeAuditoria] = await auditoriaDe(division.id, 'ajustar');
    expect(filaDeAuditoria).toMatchObject({ motivo: 'Entrega parcial' });
    expect(filaDeAuditoria!.anterior).toMatchObject({ cantidad: 50, costo: '15000.00' });
  });

  it('el origen queda con 30 piezas, 9,000.00 y cuotas de 150.00; el nuevo, con 20, 6,000.00 y cuotas de 100.00', async () => {
    const origen = await ficha(cuenta, sillas);
    const nuevo = await ficha(cuenta, division.activoNuevoId);

    expect(origen).toMatchObject({ cantidad: 30, costo: '9000.00', valorResidual: '0.00' });
    expect(nuevo).toMatchObject({ cantidad: 20, costo: '6000.00', enBodega: false, estado: 'en_uso' });
    expect(nuevo.codigo).toBe(division.codigoDelActivoNuevo);
    expect(nuevo.traslados).toHaveLength(1);
    expect(nuevo.traslados[0].esAlta).toBe(true);
    for (const libro of ['contable', 'fiscal'] as const) {
      expect((await tramosDe(cuenta, sillas, libro)).at(-1)).toMatchObject({
        causa: 'division',
        cuotaMensual: '150.00',
      });
      expect(await tramosDe(cuenta, division.activoNuevoId, libro)).toMatchObject([
        { causa: 'division', desdePeriodo: '2026-11-01', cuotaMensual: '100.00', porDepreciar: '5800.00' },
      ]);
    }
  });

  it('la ficha de los dos activos muestra la división', async () => {
    const origen = await ficha(cuenta, sillas);
    const nuevo = await ficha(cuenta, division.activoNuevoId);

    expect(origen.divisiones.map((d: { id: string }) => d.id)).toEqual([division.id]);
    expect(nuevo.divisiones.map((d: { id: string }) => d.id)).toEqual([division.id]);
  });

  it('no se divide con la fecha en un mes cerrado, en el futuro, antes del uso ni con una cantidad que no cabe', async () => {
    const cerrado = await dividir(cuenta, lote, { fecha: '2026-10-20' });
    const futura = await dividir(cuenta, lote, { fecha: '2999-01-01' });
    const antes = await dividir(cuenta, lote, { fecha: '2026-09-05' });
    const todo = await dividir(cuenta, lote, { cantidad: 30 });

    expect(cerrado.cuerpo.error.codigo).toBe('mes_cerrado');
    expect(futura.cuerpo.error.codigo).toBe('division_invalida');
    expect(antes.cuerpo.error.codigo).toBe('division_invalida');
    expect(todo.cuerpo.error.codigo).toBe('cantidad_a_separar_invalida');
  });

  it('el activo con una división posterior no admite otra con fecha anterior', async () => {
    const respuesta = await dividir(cuenta, sillas, { cantidad: 5, fecha: '2026-11-05' });

    expect(respuesta.estado).toBe(422);
    expect(respuesta.cuerpo.error.codigo).toBe('division_con_movimientos_posteriores');
  });

  it('el código escrito se respeta y uno repetido se rechaza', async () => {
    const buena = await dividir(cuenta, lote, { cantidad: 10, codigo: 'SILLA-NUEVA' });
    const repetida = await dividir(cuenta, lote, { cantidad: 5, codigo: 'SILLA-NUEVA' });

    expect(buena.cuerpo.codigoDelActivoNuevo).toBe('SILLA-NUEVA');
    expect(repetida.estado).toBe(409);
  });
});

describe('baja después de dividir', () => {
  it('dar de baja el activo nuevo congela su parte: 6,000.00 con 200.00 depreciados', async () => {
    const creada = await cuenta.propietario.post(BAJAS, baja(division.activoNuevoId, '2026-11-20'));

    expect(creada.estado, JSON.stringify(creada.cuerpo)).toBe(201);
    expect(creada.cuerpo).toMatchObject({
      costo: '6000.00',
      depreciacionAcumuladaContable: '200.00',
      depreciacionAcumuladaFiscal: '200.00',
      valorEnLibros: '5800.00',
    });
  });

  it('el origen se da de baja con lo que le quedó: 9,000.00 con 300.00; antes de la división no', async () => {
    const antes = await cuenta.propietario.post(BAJAS, baja(sillas, '2026-11-05'));
    const despues = await cuenta.propietario.post(BAJAS, baja(sillas, '2026-11-20'));

    expect(antes.cuerpo.error.codigo).toBe('baja_anterior_a_una_division');
    expect(despues.estado, JSON.stringify(despues.cuerpo)).toBe(201);
    expect(despues.cuerpo).toMatchObject({ costo: '9000.00', depreciacionAcumuladaContable: '300.00' });
  });

  it('un activo dado de baja no se divide', async () => {
    const respuesta = await dividir(cuenta, sillas, { cantidad: 5, fecha: '2026-11-22' });

    expect(respuesta.estado).toBe(422);
    expect(respuesta.cuerpo.error).toMatchObject({
      codigo: 'division_no_permitida',
      detalles: { causa: 'dado_de_baja' },
    });
  });
});

describe('reglas, permisos y aislamiento', () => {
  it('los edificios no se dividen', async () => {
    const edificios = await claseDe(cuenta, 'Edificios');
    const creado = await cuenta.propietario.post(ACTIVOS, {
      codigo: null,
      descripcion: 'Bodegas',
      claseId: edificios,
      tipoDeRegistro: 'activo',
      origen: 'compra',
      fechaDeAdquisicion: '2026-11-01',
      cantidad: 2,
    });

    const respuesta = await dividir(cuenta, creado.cuerpo.id, { cantidad: 1, fecha: '2026-11-12' });

    expect(respuesta.cuerpo.error).toMatchObject({
      codigo: 'division_no_permitida',
      detalles: { causa: 'clase_no_divisible' },
    });
  });

  it('un activo en construcción reparte solo el costo y no abre tramos', async () => {
    const creado = await cuenta.propietario.post(ACTIVOS, {
      codigo: null,
      descripcion: 'Estantes',
      claseId,
      tipoDeRegistro: 'activo',
      origen: 'compra',
      fechaDeAdquisicion: '2026-11-01',
      cantidad: 4,
    });
    const id = creado.cuerpo.id as string;
    await cuenta.propietario.post(`${ACTIVOS}/${id}/costos`, {
      claseDeCosto: 'adquisicion',
      fecha: '2026-11-02',
      monto: '4000.00',
      documentoDeSoporte: 'Factura 7',
    });

    const respuesta = await dividir(cuenta, id, { cantidad: 1, fecha: '2026-11-12' });

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
    expect(await ficha(cuenta, id)).toMatchObject({ cantidad: 3, costo: '3000.00', tramos: [] });
    expect(await ficha(cuenta, respuesta.cuerpo.activoNuevoId)).toMatchObject({ cantidad: 1, costo: '1000.00' });
  });

  it('un usuario que solo ve no divide, y quien divide no anula sin el permiso de anular', async () => {
    const ve = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Solo Ve',
      apellidos: 'Divisiones',
      permisos: ['activos-fijos.activos.ver'],
    });
    const divide = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Solo Divide',
      apellidos: 'Divisiones',
      permisos: ['activos-fijos.activos.ver', 'activos-fijos.divisiones.crear'],
    });

    const sinPermiso = await ve.post(`${ACTIVOS}/${lote}/dividir`, { cantidad: 1, fecha: '2026-11-12', motivo: 'x' });
    const anula = await divide.post(`/api/activos-fijos/divisiones/${division.id}/anular`, { motivo: 'x' });

    expect(sinPermiso.estado).toBe(403);
    expect(anula.estado).toBe(403);
  });

  it('otra cuenta no ve ni divide el activo', async () => {
    const respuesta = await dividir(ajena, lote, { cantidad: 1, fecha: '2026-11-12' });

    expect(respuesta.estado).toBe(404);
  });
});

describe('cierre de noviembre después de dividir', () => {
  it('el lote dividido deja las mismas cuotas por mes: 100.00 el origen y 50.00 el nuevo, sumando los 150.00 de antes', async () => {
    const hijo = (await ficha(cuenta, lote)).divisiones[0].activoNuevoId as string;
    await cerrarMes(cuenta, '2026-11-01');

    const [deOrigen, deNuevo] = [await cuotasDe(lote, 'contable'), await cuotasDe(hijo, 'contable')];

    expect(deOrigen.map((c) => [c.periodo, c.monto])).toEqual([
      ['2026-09-01', '150.00'],
      ['2026-10-01', '150.00'],
      ['2026-11-01', '100.00'],
    ]);
    expect(deNuevo.map((c) => [c.periodo, c.monto])).toEqual([['2026-11-01', '50.00']]);
    expect((await cuotasDe(hijo, 'fiscal')).map((c) => c.monto)).toEqual(['50.00']);
  });

  it('con noviembre cerrado ya no se divide en noviembre', async () => {
    const respuesta = await dividir(cuenta, lote, { cantidad: 1, fecha: '2026-11-12' });

    expect(respuesta.cuerpo.error.codigo).toBe('mes_cerrado');
  });
});
