import pg from 'pg';
import { beforeAll, describe, expect, it } from 'vitest';
import { configuracion } from '../configuracion.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { conceptoGeneral, crearCuentaBancaria } from './soporte/escenarios-de-bancos.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const RUTA_NOTAS = '/api/bancos/notas';
const RUTA_TRANSFERENCIAS = '/api/bancos/transferencias';
const RUTA_REPORTE = '/api/bancos/correlativos';
const CREDITOS = 'bancos.notas_de_credito';
const DEBITOS = 'bancos.notas_de_debito';
const TRANSFERENCIAS = 'bancos.transferencias';
const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let cuentaBancariaId: string;
let conceptoId = '';

interface Hueco {
  numero: number;
  estado: 'explicado' | 'alerta';
  explicaciones: Array<{ accion: string; motivo: string | null; usuarioNombre: string | null }>;
}

const nota = (cambios: Record<string, unknown> = {}) => ({
  cuentaBancariaId,
  tipo: 'credito',
  fecha: '2026-02-01',
  monto: '10.00',
  referencia: 'Boleta',
  beneficiario: null,
  observaciones: null,
  conceptoId,
  ...cambios,
});

/** El correlativo de una clave (y un año) en el reporte, de la sesión indicada. */
async function correlativoDe(clave: string, anio = 0, usuario = cuenta.propietario) {
  const reporte = await usuario.get(`${RUTA_REPORTE}?clave=${clave}`);
  expect(reporte.estado).toBe(200);
  return reporte.cuerpo.correlativos.find((c: { anio: number }) => c.anio === anio);
}

/** Ejecuta una instrucción como propietario de la base: la app no puede borrar filas de la auditoría ni saltarse las reglas. */
async function comoPropietario(instruccion: string, valores: unknown[]): Promise<void> {
  const conexion = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
  await conexion.connect();
  await conexion.query(instruccion, valores);
  await conexion.end();
}

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Numerada', usuario: 'propietarionumerado', modulos: ['bancos'] });
  cuentaBancariaId = await crearCuentaBancaria(cuenta.propietario, 'Numerada');
  conceptoId = await conceptoGeneral(cuenta.propietario);
});

describe('números de notas por API', () => {
  it('las notas de crédito y de débito llevan cada una su consecutivo; el saldo inicial no lleva número', async () => {
    const credito1 = await cuenta.propietario.post(RUTA_NOTAS, nota());
    const debito1 = await cuenta.propietario.post(RUTA_NOTAS, nota({ tipo: 'debito' }));
    const credito2 = await cuenta.propietario.post(RUTA_NOTAS, nota());

    expect([credito1.cuerpo.numero, debito1.cuerpo.numero, credito2.cuerpo.numero]).toEqual([1, 1, 2]);
    expect(credito1.cuerpo.anioDeNumero).toBe(0);
    const reporte = await cuenta.propietario.get(
      `/api/bancos/movimientos/reporte?cuentaBancariaId=${cuentaBancariaId}`,
    );
    const inicial = reporte.cuerpo.filas.find((m: { saldoInicial: boolean }) => m.saldoInicial);
    expect(inicial.numero).toBeNull();
  });

  it('una nota rechazada por saldo insuficiente no consume número', async () => {
    const rechazada = await cuenta.propietario.post(RUTA_NOTAS, nota({ tipo: 'debito', monto: '999999.00' }));
    expect(rechazada.estado).toBe(422);

    const siguiente = await cuenta.propietario.post(RUTA_NOTAS, nota({ tipo: 'debito' }));

    expect(siguiente.cuerpo.numero).toBe(2);
  });

  it('anular una nota crea un inverso con el siguiente número de su tipo', async () => {
    const credito = await cuenta.propietario.post(RUTA_NOTAS, nota({ monto: '5.00' }));
    const anulada = await cuenta.propietario.post(`${RUTA_NOTAS}/${credito.cuerpo.id}/anular`, { motivo: 'Error' });
    expect(anulada.estado).toBe(200);

    const reporte = await cuenta.propietario.get(
      `/api/bancos/movimientos/reporte?cuentaBancariaId=${cuentaBancariaId}`,
    );
    const inverso = reporte.cuerpo.filas.find(
      (m: { revierteAId: string | null }) => m.revierteAId === credito.cuerpo.id,
    );
    expect(inverso.tipo).toBe('debito');
    expect(inverso.numero).toBe(3);
  });

  it('la transferencia lleva su propio número; sus notas y sus inversos, ninguno', async () => {
    const destino = await crearCuentaBancaria(cuenta.propietario, 'Destino numerado');
    const datos = { cuentaOrigenId: cuentaBancariaId, cuentaDestinoId: destino, fecha: '2026-02-05', monto: '1.00' };
    const primera = await cuenta.propietario.post(RUTA_TRANSFERENCIAS, {
      ...datos,
      referencia: null,
      observaciones: null,
    });
    const segunda = await cuenta.propietario.post(RUTA_TRANSFERENCIAS, {
      ...datos,
      referencia: null,
      observaciones: null,
    });
    await cuenta.propietario.post(`${RUTA_TRANSFERENCIAS}/${segunda.cuerpo.id}/anular`, { motivo: 'Duplicada' });

    expect([primera.cuerpo.numero, segunda.cuerpo.numero]).toEqual([1, 2]);
    const reporte = await cuenta.propietario.get(`/api/bancos/movimientos/reporte?cuentaBancariaId=${destino}`);
    const deTransferencia = reporte.cuerpo.filas.filter((m: { saldoInicial: boolean }) => !m.saldoInicial);
    expect(deTransferencia).toHaveLength(3); // sus dos notas y el inverso de la anulada
    expect(deTransferencia.map((m: { numero: number | null }) => m.numero)).toEqual([null, null, null]);
  });

  it('al corregir una nota y cambiar su tipo toma el siguiente de su nuevo tipo', async () => {
    const credito = await cuenta.propietario.post(RUTA_NOTAS, nota({ monto: '2.00' }));

    const corregida = await cuenta.propietario.put(
      `${RUTA_NOTAS}/${credito.cuerpo.id}`,
      nota({ tipo: 'debito', monto: '2.00' }),
    );

    expect(corregida.estado).toBe(200);
    expect(corregida.cuerpo).toMatchObject({ tipo: 'debito', numero: 4 });
  });
});

describe('reporte de correlativos por API', () => {
  it('un correlativo sin huecos no lista nada', async () => {
    const transferencias = await correlativoDe(TRANSFERENCIAS);

    expect(transferencias).toMatchObject({ nombre: 'Transferencias', ultimo: 2, emitidos: 2, huecos: [] });
  });

  it('eliminar una nota deja un hueco que la auditoría explica con quién, cuándo y por qué', async () => {
    const creada = await cuenta.propietario.post(RUTA_NOTAS, nota({ monto: '1.00' }));
    await cuenta.propietario.delete(`${RUTA_NOTAS}/${creada.cuerpo.id}`, { motivo: 'Registrada por error' });

    const creditos = await correlativoDe(CREDITOS);

    const hueco: Hueco = creditos.huecos.find((h: Hueco) => h.numero === creada.cuerpo.numero);
    expect(hueco.estado).toBe('explicado');
    expect(hueco.explicaciones[0]).toMatchObject({
      accion: 'eliminar',
      motivo: 'Registrada por error',
      usuarioNombre: expect.stringContaining('Dueño'),
    });
  });

  it('el número que dejó una nota al cambiar de tipo también queda explicado', async () => {
    const debitos = await correlativoDe(DEBITOS);
    const creditos = await correlativoDe(CREDITOS);

    expect(debitos.huecos).toEqual([]);
    const huecoDelCambio: Hueco = creditos.huecos.find((h: Hueco) => h.explicaciones[0]?.accion === 'corregir');
    expect(huecoDelCambio.estado).toBe('explicado');
  });

  it('un hueco sin rastro en la auditoría se marca como alerta', async () => {
    const creada = await cuenta.propietario.post(RUTA_NOTAS, nota({ monto: '1.00' }));
    await comoPropietario('delete from bancos.movimientos where id = $1', [creada.cuerpo.id]);

    const creditos = await correlativoDe(CREDITOS);

    const hueco: Hueco = creditos.huecos.find((h: Hueco) => h.numero === creada.cuerpo.numero);
    expect(hueco).toMatchObject({ estado: 'alerta', explicaciones: [] });
  });

  it('el hueco de una transferencia eliminada queda explicado', async () => {
    const destino = await crearCuentaBancaria(cuenta.propietario, 'Destino borrado');
    const datos = { cuentaOrigenId: cuentaBancariaId, cuentaDestinoId: destino, fecha: '2026-02-06', monto: '1.00' };
    const creada = await cuenta.propietario.post(RUTA_TRANSFERENCIAS, {
      ...datos,
      referencia: null,
      observaciones: null,
    });
    const eliminada = await cuenta.propietario.delete(`${RUTA_TRANSFERENCIAS}/${creada.cuerpo.id}`, {
      motivo: 'Mal digitada',
    });
    expect(eliminada.estado).toBe(204);

    const transferencias = await correlativoDe(TRANSFERENCIAS);

    const hueco: Hueco = transferencias.huecos.find((h: Hueco) => h.numero === creada.cuerpo.numero);
    expect(hueco.explicaciones[0]).toMatchObject({ accion: 'eliminar', motivo: 'Mal digitada' });
  });

  it('pide el permiso de ver movimientos', async () => {
    const sinPermiso = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'SinReporte',
      apellidos: 'Prueba',
      permisos: ['bancos.notas.ver'],
    });
    const conPermiso = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'ConReporte',
      apellidos: 'Prueba',
      permisos: ['bancos.movimientos.ver'],
    });

    expect((await sinPermiso.get(RUTA_REPORTE)).estado).toBe(403);
    expect((await conPermiso.get(RUTA_REPORTE)).estado).toBe(200);
  });

  it('rechaza una clave que no es de Bancos', async () => {
    const respuesta = await cuenta.propietario.get(`${RUTA_REPORTE}?clave=otra.cosa`);

    expect(respuesta.estado).toBe(400);
  });
});

describe('correlativos por empresa', () => {
  it('otra empresa empieza en 1 y no ve los huecos de la primera', async () => {
    const otra = await darDeAltaCuenta(entorno, {
      nombre: 'Otra numerada',
      usuario: 'otronumerado',
      modulos: ['bancos'],
    });
    cuentaBancariaId = await crearCuentaBancaria(otra.propietario, 'Otra');
    conceptoId = await conceptoGeneral(otra.propietario);

    const primera = await otra.propietario.post(RUTA_NOTAS, nota());

    expect(primera.cuerpo.numero).toBe(1);
    expect(await correlativoDe(CREDITOS, 0, otra.propietario)).toMatchObject({ ultimo: 1, huecos: [] });
  });
});
