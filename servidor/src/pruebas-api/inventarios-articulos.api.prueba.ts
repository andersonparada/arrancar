import { beforeAll, describe, expect, it } from 'vitest';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';
import { crearReferencias, datosDeArticulo, type ReferenciasDeArticulo } from './inventarios.soporte.js';

const RUTA = '/api/inventarios/articulos';
const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let otraCuenta: CuentaDePrueba;

let referencias: ReferenciasDeArticulo;
let referenciasAjenas: ReferenciasDeArticulo;

const datos = (cambios: Record<string, unknown> = {}) => datosDeArticulo(referencias, cambios);

beforeAll(async () => {
  const modulos = ['terceros', 'libro-de-compras', 'inventarios'];
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Artículos', usuario: 'propietarioarticulos', modulos });
  otraCuenta = await darDeAltaCuenta(entorno, { nombre: 'Ajena', usuario: 'propietarioajeno', modulos });
  referencias = await crearReferencias(cuenta.propietario);
  referenciasAjenas = await crearReferencias(otraCuenta.propietario);
});

describe('artículos por API', () => {
  it('se registran, se listan con los nombres de lo elegido y se cambian', async () => {
    const creado = await cuenta.propietario.post(RUTA, datos());
    const id = creado.cuerpo.id;
    const cambiado = await cuenta.propietario.put(
      `${RUTA}/${id}`,
      datos({ codigo: 'ART-CAMBIADO', codigoDeBarras: '7401' }),
    );

    expect(creado.estado).toBe(201);
    expect(creado.cuerpo).toMatchObject({
      categoriaNombre: 'Alimentos',
      unidadBaseNombre: 'Libra',
      conceptoDeGastoNombre: 'Alimento para animales',
    });
    expect((await cuenta.propietario.get(`${RUTA}/${id}`)).cuerpo).toEqual(cambiado.cuerpo);
    expect(cambiado.cuerpo).toMatchObject({ codigo: 'ART-CAMBIADO', codigoDeBarras: '7401' });
  });

  it('se inactivan sin perder sus datos', async () => {
    const creado = await cuenta.propietario.post(RUTA, datos());
    const inactivo = await cuenta.propietario.put(
      `${RUTA}/${creado.cuerpo.id}`,
      datos({ ...creado.cuerpo, activo: false }),
    );

    expect(inactivo.cuerpo).toEqual({ ...creado.cuerpo, activo: false });
  });

  it('rechaza un código con espacios, vencimiento sin lotes y un código o nombre repetido', async () => {
    const original = await cuenta.propietario.post(RUTA, datos());

    const conEspacios = await cuenta.propietario.post(RUTA, datos({ codigo: 'A B' }));
    const sinLotes = await cuenta.propietario.post(RUTA, datos({ manejaVencimiento: true }));
    const codigoRepetido = await cuenta.propietario.post(RUTA, datos({ codigo: original.cuerpo.codigo.toLowerCase() }));
    const nombreRepetido = await cuenta.propietario.post(RUTA, datos({ nombre: original.cuerpo.nombre.toUpperCase() }));

    expect([conEspacios.estado, sinLotes.estado]).toEqual([400, 400]);
    expect([codigoRepetido.estado, nombreRepetido.estado]).toEqual([409, 409]);
  });

  it('no acepta una categoría, unidad o concepto de otra cuenta', async () => {
    const categoria = await cuenta.propietario.post(RUTA, datos({ categoriaId: referenciasAjenas.categoriaId }));
    const unidad = await cuenta.propietario.post(RUTA, datos({ unidadBaseId: referenciasAjenas.unidadBaseId }));
    const concepto = await cuenta.propietario.post(
      RUTA,
      datos({ conceptoDeGastoId: referenciasAjenas.conceptoDeGastoId }),
    );

    expect([categoria.estado, unidad.estado, concepto.estado]).toEqual([404, 404, 404]);
  });

  it('otra cuenta no los ve', async () => {
    const ajeno = await otraCuenta.propietario.post(RUTA, { ...datos(), ...referenciasAjenas });

    expect((await cuenta.propietario.get(`${RUTA}/${ajeno.cuerpo.id}`)).estado).toBe(404);
    expect((await otraCuenta.propietario.get(RUTA)).cuerpo).toEqual([ajeno.cuerpo]);
  });

  it('se eliminan con sus conversiones y lotes, y queda en la auditoría', async () => {
    const articulo = (await cuenta.propietario.post(RUTA, datos({ manejaLotes: true }))).cuerpo.id;
    await cuenta.propietario.put(`${RUTA}/${articulo}/conversiones`, {
      conversiones: [{ unidadId: referencias.unidadDeCajaId, factor: '24', paraCompras: true }],
    });
    await cuenta.propietario.post(`${RUTA}/${articulo}/lotes`, { codigo: 'L-1' });

    const eliminado = await cuenta.propietario.delete(`${RUTA}/${articulo}`);

    expect(eliminado.estado).toBe(204);
    expect((await cuenta.propietario.get(`${RUTA}/${articulo}`)).estado).toBe(404);
    const huerfanos = await comoPropietario(
      'select 1 from inventarios.conversiones where articulo_id = $1 union all select 1 from inventarios.lotes where articulo_id = $1',
      [articulo],
    );
    const rastro = await comoPropietario(
      "select 1 from core.auditoria where recurso = 'inventarios.articulos' and accion = 'eliminar' and registro_id = $1",
      [articulo],
    );
    expect([huerfanos.length, rastro.length]).toEqual([0, 1]);
  });

  it('propone el código con el prefijo y el correlativo, sin repetir uno que ya existe', async () => {
    const nueva = await darDeAltaCuenta(entorno, {
      nombre: 'Códigos',
      usuario: 'propietariocodigos',
      modulos: ['terceros', 'libro-de-compras', 'inventarios'],
    });
    await nueva.propietario.post(RUTA, {
      ...datos({ codigo: 'ART-0001' }),
      ...(await crearReferencias(nueva.propietario)),
    });

    const propuesto = await nueva.propietario.get(`${RUTA}/codigo-propuesto`);

    expect(propuesto.cuerpo).toEqual({ codigo: 'ART-0002' });
  });
});

describe('conversiones por API', () => {
  it('se fijan, se leen por nombre de unidad y la lista nueva reemplaza a la anterior, con auditoría de lo que se quita', async () => {
    const articulo = (await cuenta.propietario.post(RUTA, datos())).cuerpo.id;
    const saco = (await cuenta.propietario.get('/api/inventarios/unidades')).cuerpo.find(
      (unidad: { nombre: string }) => unidad.nombre === 'Saco',
    ).id;
    await cuenta.propietario.put(`${RUTA}/${articulo}/conversiones`, {
      conversiones: [
        { unidadId: referencias.unidadDeCajaId, factor: '24', paraCompras: true },
        { unidadId: saco, factor: '50', paraCompras: false },
      ],
    });

    const reemplazadas = await cuenta.propietario.put(`${RUTA}/${articulo}/conversiones`, {
      conversiones: [{ unidadId: referencias.unidadDeCajaId, factor: '12', paraCompras: true }],
    });

    expect(reemplazadas.cuerpo).toEqual([
      { unidadId: referencias.unidadDeCajaId, unidadNombre: 'Caja', factor: '12.00000000', paraCompras: true },
    ]);
    expect((await cuenta.propietario.get(`${RUTA}/${articulo}/conversiones`)).cuerpo).toEqual(reemplazadas.cuerpo);
    const rastro = await comoPropietario(
      "select 1 from core.auditoria where recurso = 'inventarios.conversiones' and accion = 'quitar' and registro_id = $1",
      [articulo],
    );
    expect(rastro).toHaveLength(1);
  });

  it('rechaza convertir la unidad base, repetir una unidad o una unidad ajena', async () => {
    const articulo = (await cuenta.propietario.post(RUTA, datos())).cuerpo.id;
    const conversion = (unidadId: string) => ({ unidadId, factor: '2', paraCompras: false });
    const poner = (conversiones: unknown[]) =>
      cuenta.propietario.put(`${RUTA}/${articulo}/conversiones`, { conversiones });

    const base = await poner([conversion(referencias.unidadBaseId)]);
    const repetida = await poner([conversion(referencias.unidadDeCajaId), conversion(referencias.unidadDeCajaId)]);
    const ajena = await poner([conversion(referenciasAjenas.unidadDeCajaId)]);

    expect([base.estado, repetida.estado, ajena.estado]).toEqual([400, 400, 404]);
    expect(base.cuerpo.error.codigo).toBe('conversion_invalida');
  });

  it('una unidad que está en una conversión no se elimina', async () => {
    const articulo = (await cuenta.propietario.post(RUTA, datos())).cuerpo.id;
    await cuenta.propietario.put(`${RUTA}/${articulo}/conversiones`, {
      conversiones: [{ unidadId: referencias.unidadDeCajaId, factor: '6', paraCompras: false }],
    });

    const eliminada = await cuenta.propietario.delete(`/api/inventarios/unidades/${referencias.unidadDeCajaId}`);

    expect(eliminada.estado).toBe(422);
    expect(eliminada.cuerpo.error.codigo).toBe('unidad_en_uso');
  });
});
