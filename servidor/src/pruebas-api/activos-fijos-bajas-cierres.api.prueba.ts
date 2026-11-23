/**
 * Bajas y cierre mensual (AF-9): el activo dado de baja se sigue depreciando en los meses abiertos anteriores a su baja,
 * lo congelado coincide con las cuotas que dejan los cierres, no se da de baja ni se anula en un mes cerrado, y las
 * subidas de documentos no se cruzan con una anulación en curso.
 */
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { configuracion } from '../configuracion.js';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';
import { claseDe, datosDeActivo } from './soporte/escenario-de-activos.js';
import { instalarDestinoFalso } from './soporte/escenario-de-documentos.js';
import { crearImagenPng } from './soporte/imagenes.js';

const ACTIVOS = '/api/activos-fijos/activos';
const BAJAS = '/api/activos-fijos/bajas';
const DEPRECIACION = '/api/activos-fijos/depreciacion';
const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let vehiculosId: string;

async function activoEnUso(monto: string, fechaDeUso: string): Promise<string> {
  const creado = await cuenta.propietario.post(
    ACTIVOS,
    datosDeActivo(vehiculosId, { fechaDeAdquisicion: '2026-09-01' }),
  );
  const id = creado.cuerpo.id as string;
  await cuenta.propietario.post(`${ACTIVOS}/${id}/costos`, {
    claseDeCosto: 'adquisicion',
    fecha: '2026-09-05',
    monto,
    documentoDeSoporte: 'Escritura 15',
  });
  const puesto = await cuenta.propietario.post(`${ACTIVOS}/${id}/poner-en-uso`, { fechaDeInicioDeUso: fechaDeUso });
  expect(puesto.estado, JSON.stringify(puesto.cuerpo)).toBe(200);
  return id;
}

const baja = (activoId: string, fecha: string, cambios: Record<string, unknown> = {}) => ({
  activoId,
  fecha,
  causa: 'destruccion',
  descripcion: 'Quedó inservible',
  autorizadaPor: 'Gerencia',
  ...cambios,
});

async function cerrar(periodo: string) {
  const { cuerpo: revision } = await cuenta.propietario.get(`${DEPRECIACION}/${periodo}/revision`);
  const cierre = await cuenta.propietario.post(`${DEPRECIACION}/${periodo}/cerrar`, { huella: revision.huella });
  expect(cierre.estado, JSON.stringify(cierre.cuerpo)).toBe(200);
}

const cuotasDe = (activoId: string, libro: string) =>
  comoPropietario<{ periodo: string; monto: string }>(
    'select periodo::text, monto from activos_fijos.cuotas where activo_id = $1 and libro = $2 and vigente order by periodo',
    [activoId, libro],
  );

beforeAll(async () => {
  instalarDestinoFalso();
  const modulos = ['terceros', 'libro-de-compras', 'activos-fijos'];
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Bajas y cierres', usuario: 'propietariobajascierres', modulos });
  vehiculosId = await claseDe(cuenta, 'Vehículos');
});

afterAll(() => vi.restoreAllMocks());

describe('dar de baja con meses abiertos antes', () => {
  let id: string;
  let otro: string;
  let creada: Record<string, string>;

  beforeAll(async () => {
    id = await activoEnUso('250000.00', '2026-09-10');
    otro = await activoEnUso('1000.00', '2026-11-05');
    creada = (await cuenta.propietario.post(BAJAS, baja(id, '2026-11-20'))).cuerpo;
  });

  it('cerrar septiembre y octubre sigue depreciando al activo dado de baja y suma lo que se congeló', async () => {
    await cerrar('2026-09-01');
    await cerrar('2026-10-01');

    const contables = await cuotasDe(id, 'contable');
    const fiscales = await cuotasDe(id, 'fiscal');

    expect(contables.map((cuota) => cuota.periodo)).toEqual(['2026-09-01', '2026-10-01']);
    const suma = (cuotas: { monto: string }[]) =>
      cuotas.reduce((total, cuota) => total + Math.round(Number(cuota.monto) * 100), 0) / 100;
    expect(suma(contables).toFixed(2)).toBe(creada.depreciacionAcumuladaContable);
    expect(suma(fiscales).toFixed(2)).toBe(creada.depreciacionAcumuladaFiscal);
  });

  it('el mes de la baja no se deprecia con «mes de inicio»: cerrar noviembre no le deja cuota', async () => {
    await cerrar('2026-11-01');

    expect((await cuotasDe(id, 'contable')).map((cuota) => cuota.periodo)).toEqual(['2026-09-01', '2026-10-01']);
  });

  it('con noviembre cerrado, la baja ya no se anula ni se da de baja otro activo en ese mes', async () => {
    const anulada = await cuenta.propietario.post(`${BAJAS}/${creada.id}/anular`, { motivo: 'Tarde' });
    const nueva = await cuenta.propietario.post(BAJAS, baja(otro, '2026-11-21'));

    expect([anulada.estado, anulada.cuerpo.error.codigo]).toEqual([422, 'mes_cerrado']);
    expect([nueva.estado, nueva.cuerpo.error.codigo]).toEqual([422, 'mes_cerrado']);
  });

  it('reabrir el último mes cerrado no toca lo congelado en la baja', async () => {
    const reabierto = await cuenta.propietario.post(`${DEPRECIACION}/2026-11-01/reabrir`, { motivo: 'Revisión' });

    expect(reabierto.estado, JSON.stringify(reabierto.cuerpo)).toBe(200);
    const leida = await cuenta.propietario.get(`${BAJAS}/${creada.id}`);
    expect(leida.cuerpo).toMatchObject({ depreciacionAcumuladaContable: creada.depreciacionAcumuladaContable });
  });
});

describe('concurrencia', () => {
  it('una subida de acta que llega después de una anulación en curso no deja acta en la baja anulada', async () => {
    const id = await activoEnUso('50000.00', '2026-11-05');
    const creada = (await cuenta.propietario.post(BAJAS, baja(id, '2026-11-22'))).cuerpo;
    const anulando = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
    await anulando.connect();
    try {
      await anulando.query('begin');
      await anulando.query(
        "update activos_fijos.bajas set estado = 'anulada', anulada_en = now(), anulada_por = creado_por, motivo_de_anulacion = 'Prueba' where id = $1",
        [creada.id],
      );
      const subida = cuenta.propietario.subirImagen(
        'POST',
        `${BAJAS}/${creada.id}/acta?tipoDeActa=administrativa`,
        await crearImagenPng(),
      );
      await new Promise((resolver) => setTimeout(resolver, 800));
      await anulando.query('commit');

      const respuesta = await subida;

      expect([respuesta.estado, respuesta.cuerpo.error.codigo]).toEqual([422, 'baja_anulada']);
    } finally {
      await anulando.end();
    }
    expect(
      await comoPropietario('select 1 from activos_fijos.bajas where id = $1 and acta_archivo_id is not null', [
        creada.id,
      ]),
    ).toHaveLength(0);
  });

  it('un usuario que solo ve no puede subir documentos', async () => {
    const id = await activoEnUso('50000.00', '2026-11-05');
    const creada = (await cuenta.propietario.post(BAJAS, baja(id, '2026-11-22'))).cuerpo;
    const ve = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Solo Ve Bajas',
      apellidos: 'Cierres',
      permisos: ['activos-fijos.activos.ver'],
    });

    const sube = await ve.subirImagen('POST', `${BAJAS}/${creada.id}/denuncia`, await crearImagenPng());

    expect(sube.estado).toBe(403);
  });
});
