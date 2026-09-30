import pg from 'pg';
import { beforeAll, describe, expect, it } from 'vitest';
import { configuracion } from '../configuracion.js';
import type { ClienteApi } from './soporte/cliente-api.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const RUTA = '/api/libro-de-compras/vigencias-de-combustible';
const RUTA_COMBUSTIBLES = '/api/libro-de-compras/combustibles';
const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let otraCuenta: CuentaDePrueba;

/** Un combustible nuevo en la cuenta del usuario. */
async function crearCombustible(usuario: ClienteApi, nombre: string): Promise<string> {
  const combustible = await usuario.post(RUTA_COMBUSTIBLES, { nombre, activo: true });
  return combustible.cuerpo.id as string;
}

let gasolina: string;
let diesel: string;
let combustibleAjeno: string;

const datos = (combustibleId: string, cambios: Record<string, unknown> = {}) => ({
  combustibleId,
  idpPorGalon: '4.70',
  porcentajeDeEtanol: '10.00',
  vigenteDesde: '2026-01-01',
  vigenteHasta: null,
  ...cambios,
});

async function auditoria(accion: string, registroId: string) {
  const conexion = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
  await conexion.connect();
  const { rows } = await conexion.query<{ anterior: { idpPorGalon: string } }>(
    "select anterior from core.auditoria where recurso = 'libro-de-compras.vigencias-de-combustible' and accion = $1 and registro_id = $2",
    [accion, registroId],
  );
  await conexion.end();
  return rows;
}

beforeAll(async () => {
  const modulos = ['terceros', 'libro-de-compras'];
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Generada', usuario: 'propietariogenerado', modulos });
  otraCuenta = await darDeAltaCuenta(entorno, { nombre: 'Ajena', usuario: 'propietarioajeno', modulos });
  gasolina = await crearCombustible(cuenta.propietario, 'Gasolina');
  diesel = await crearCombustible(cuenta.propietario, 'Diésel');
  combustibleAjeno = await crearCombustible(otraCuenta.propietario, 'Gasolina');
});

describe('vigencias de combustible por API', () => {
  it('se registran, se listan y se leen con el nombre del combustible', async () => {
    const creado = await cuenta.propietario.post(RUTA, datos(gasolina));

    expect(creado.estado).toBe(201);
    expect(creado.cuerpo).toMatchObject({
      combustibleId: gasolina,
      combustibleNombre: 'Gasolina',
      idpPorGalon: '4.70',
      porcentajeDeEtanol: '10.00',
      vigenteDesde: '2026-01-01',
      vigenteHasta: null,
    });
    expect((await cuenta.propietario.get(`${RUTA}/${creado.cuerpo.id}`)).cuerpo).toEqual(creado.cuerpo);
    expect((await cuenta.propietario.get(RUTA)).cuerpo).toEqual([creado.cuerpo]);
  });

  it('una tasa nueva cierra la anterior el día antes', async () => {
    const anterior = (await cuenta.propietario.get(RUTA)).cuerpo[0];

    const nueva = await cuenta.propietario.post(
      RUTA,
      datos(gasolina, { idpPorGalon: '5.10', vigenteDesde: '2026-03-01' }),
    );

    expect(nueva.estado).toBe(201);
    expect((await cuenta.propietario.get(`${RUTA}/${anterior.id}`)).cuerpo.vigenteHasta).toBe('2026-02-28');
  });

  it('una vigencia que se traslapa con otra cerrada se rechaza sin cambiar nada', async () => {
    const antes = (await cuenta.propietario.get(RUTA)).cuerpo;

    const traslapada = await cuenta.propietario.post(
      RUTA,
      datos(gasolina, { vigenteDesde: '2025-06-01', vigenteHasta: '2026-01-15' }),
    );

    expect(traslapada.estado).toBe(422);
    expect(traslapada.cuerpo.error).toMatchObject({
      codigo: 'traslape',
      mensaje: 'Esa vigencia se traslapa con otra del mismo combustible.',
    });
    expect((await cuenta.propietario.get(RUTA)).cuerpo).toEqual(antes);
  });

  it('cada combustible lleva su propia historia', async () => {
    const delDiesel = await cuenta.propietario.post(RUTA, datos(diesel, { idpPorGalon: '1.30' }));

    expect(delDiesel.estado).toBe(201);
    expect(delDiesel.cuerpo.vigenteHasta).toBeNull();
  });

  it('cambiar la tasa de una vigencia queda en la auditoría como corrección, con la tasa de antes', async () => {
    const vigencia = (
      await cuenta.propietario.post(RUTA, datos(diesel, { vigenteDesde: '2025-01-01', vigenteHasta: '2025-12-31' }))
    ).cuerpo;

    const cambiada = await cuenta.propietario.put(
      `${RUTA}/${vigencia.id}`,
      datos(diesel, { idpPorGalon: '1.35', vigenteDesde: '2025-01-01', vigenteHasta: '2025-12-31' }),
    );

    expect(cambiada.cuerpo.idpPorGalon).toBe('1.35');
    expect(await auditoria('corregir', vigencia.id)).toEqual([
      expect.objectContaining({ anterior: expect.objectContaining({ idpPorGalon: '4.70' }) }),
    ]);
  });

  it('dos tasas nuevas al mismo tiempo se ordenan por el bloqueo del combustible: nunca hay error inesperado', async () => {
    const gas = await crearCombustible(cuenta.propietario, 'Gas simultáneo');
    await cuenta.propietario.post(RUTA, datos(gas, { vigenteDesde: '2027-01-01' }));

    const respuestas = await Promise.all([
      cuenta.propietario.post(RUTA, datos(gas, { idpPorGalon: '5.00', vigenteDesde: '2028-01-01' })),
      cuenta.propietario.post(RUTA, datos(gas, { idpPorGalon: '6.00', vigenteDesde: '2028-06-01' })),
    ]);
    const delGas = (await cuenta.propietario.get(RUTA)).cuerpo.filter(
      (v: { combustibleId: string }) => v.combustibleId === gas,
    );

    expect(respuestas.every((r) => r.estado === 201 || r.estado === 422)).toBe(true);
    expect(respuestas.some((r) => r.estado === 201)).toBe(true);
    expect(delGas.filter((v: { vigenteHasta: string | null }) => v.vigenteHasta === null)).toHaveLength(1);
  });

  it('no cambia de combustible', async () => {
    const delDiesel = (await cuenta.propietario.get(RUTA)).cuerpo.find(
      (v: { combustibleId: string }) => v.combustibleId === diesel,
    );

    const cambio = await cuenta.propietario.put(
      `${RUTA}/${delDiesel.id}`,
      datos(gasolina, { vigenteDesde: delDiesel.vigenteDesde, vigenteHasta: delDiesel.vigenteHasta }),
    );

    expect(cambio.estado).toBe(400);
  });

  it('se eliminan y queda en la auditoría', async () => {
    const creado = await cuenta.propietario.post(
      RUTA,
      datos(diesel, { vigenteDesde: '2024-01-01', vigenteHasta: '2024-12-31' }),
    );
    const eliminado = await cuenta.propietario.delete(`${RUTA}/${creado.cuerpo.id}`);

    expect(eliminado.estado).toBe(204);
    expect((await cuenta.propietario.get(`${RUTA}/${creado.cuerpo.id}`)).estado).toBe(404);
    expect(await auditoria('eliminar', creado.cuerpo.id)).toHaveLength(1);
  });

  it('un combustible no se elimina (no hay ruta); se inactiva y su historia queda', async () => {
    const eliminar = await cuenta.propietario.delete(`${RUTA_COMBUSTIBLES}/${gasolina}`);
    const inactivado = await cuenta.propietario.put(`${RUTA_COMBUSTIBLES}/${gasolina}`, {
      nombre: 'Gasolina',
      activo: false,
    });

    expect(eliminar.estado).toBe(404);
    expect(inactivado.cuerpo.activo).toBe(false);
    expect(
      (await cuenta.propietario.get(RUTA)).cuerpo.some((v: { combustibleId: string }) => v.combustibleId === gasolina),
    ).toBe(true);
    await cuenta.propietario.put(`${RUTA_COMBUSTIBLES}/${gasolina}`, { nombre: 'Gasolina', activo: true });
  });

  it('no acepta un combustible de otra cuenta', async () => {
    const conAjeno = await cuenta.propietario.post(RUTA, datos(combustibleAjeno));

    expect(conAjeno.estado).toBe(404);
  });

  it('otra cuenta no las ve', async () => {
    const ajeno = await otraCuenta.propietario.post(RUTA, datos(combustibleAjeno));

    expect((await cuenta.propietario.get(`${RUTA}/${ajeno.cuerpo.id}`)).estado).toBe(404);
    expect((await otraCuenta.propietario.get(RUTA)).cuerpo).toEqual([ajeno.cuerpo]);
  });

  it('lo exportado se puede revisar para importarlo de nuevo', async () => {
    const exportado = await cuenta.propietario.get(`${RUTA}/exportar`);

    const revision = await cuenta.propietario.subirImagen('POST', `${RUTA}/importar?ensayo=true`, {
      nombreArchivo: 'vigencias-de-combustible.xlsx',
      tipoMime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      contenido: exportado.cuerpo,
    });

    expect(exportado.estado).toBe(200);
    expect(revision.cuerpo).toMatchObject({ guardado: false, filas: expect.any(Number) });
  });

  it('cada acción exige su permiso', async () => {
    const lector = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Solo',
      apellidos: 'Lectura',
      permisos: ['libro-de-compras.vigencias-de-combustible.ver'],
    });
    const vigencia = (await cuenta.propietario.get(RUTA)).cuerpo[0];

    expect((await lector.get(RUTA)).estado).toBe(200);
    expect((await lector.post(RUTA, datos(gasolina))).estado).toBe(403);
    expect((await lector.put(`${RUTA}/${vigencia.id}`, datos(gasolina, vigencia))).estado).toBe(403);
    expect((await lector.delete(`${RUTA}/${vigencia.id}`)).estado).toBe(403);
    expect((await lector.get(`${RUTA}/exportar`)).estado).toBe(403);
    expect((await lector.get(`${RUTA}/plantilla`)).estado).toBe(403);
  });
});
