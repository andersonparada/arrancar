import { beforeAll, describe, expect, it } from 'vitest';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';
import {
  RUTA_DE_PARCELAS as RUTA,
  crearLocalidadDePrueba,
  cuerpoDeMedicion,
  cuerpoDeParcela,
  tipoDeParcelaDePrueba,
} from './soporte/escenario-de-parcelas.js';

const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let otraCuenta: CuentaDePrueba;
let base: { localidadId: string; tipoId: string };
let otraLocalidadId: string;
let contador = 0;

/** Un código y un nombre nuevos en cada llamada, para que las pruebas no choquen entre sí. */
const unico = () => {
  contador += 1;
  return { codigo: `PA-${contador}`, nombre: `Parcela ${contador}` };
};

const crear = (cambios: Record<string, unknown> = {}) =>
  cuenta.propietario.post(RUTA, cuerpoDeParcela(base, { ...unico(), ...cambios }));

beforeAll(async () => {
  const modulos = ['terceros', 'parcelas'];
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Con parcelas', usuario: 'propietarioparcelas', modulos });
  otraCuenta = await darDeAltaCuenta(entorno, { nombre: 'Sin parcelas', usuario: 'propietariootra', modulos });
  base = {
    localidadId: await crearLocalidadDePrueba(cuenta.propietario, 'FIN-1'),
    tipoId: await tipoDeParcelaDePrueba(cuenta.propietario),
  };
  otraLocalidadId = await crearLocalidadDePrueba(cuenta.propietario, 'FIN-2');
});

describe('parcelas por API', () => {
  it('se crea con su medición inicial, se ve en la ficha y en la lista', async () => {
    const creada = await crear({ medicion: cuerpoDeMedicion({ cantidadUtil: '1.5', documento: 'Plano 2019' }) });

    expect(creada.estado).toBe(201);
    expect(creada.cuerpo).toMatchObject({
      nivel: 1,
      activo: true,
      superficieTotalM2: '13974.74',
      superficieUtilM2: '10481.06',
      localidadNombre: 'Finca FIN-1',
      tipoNombre: 'Potrero',
    });
    expect(creada.cuerpo.mediciones).toMatchObject([{ cantidadOriginal: '2.0000', unidadOriginal: 'manzana' }]);
    const lista = (await cuenta.propietario.get(RUTA)).cuerpo as Array<{ id: string }>;
    expect(lista.map(({ id }) => id)).toContain(creada.cuerpo.id);
    expect((await cuenta.propietario.get(`${RUTA}/${creada.cuerpo.id}`)).cuerpo.id).toBe(creada.cuerpo.id);
  });

  it('el código y el nombre no se repiten; el nombre sí en otra localidad', async () => {
    const primera = await crear({ codigo: 'REP-1', nombre: 'Repetida' });

    const mismoCodigo = await crear({ codigo: 'REP-1', nombre: 'Otro nombre' });
    const mismoNombre = await crear({ codigo: 'REP-2', nombre: 'repetida' });
    const otraFinca = await crear({ codigo: 'REP-3', nombre: 'Repetida', localidadId: otraLocalidadId });

    expect(primera.estado).toBe(201);
    expect([mismoCodigo.estado, mismoNombre.estado, otraFinca.estado]).toEqual([409, 409, 201]);
    expect(mismoCodigo.cuerpo.error.detalles).toEqual({ campo: 'codigo' });
  });

  it('las subparcelas cuelgan de su madre en la misma localidad y hasta el tope de niveles', async () => {
    const madre = await crear();
    const hija = await crear({ parcelaMadreId: madre.cuerpo.id });
    const nieta = await crear({ parcelaMadreId: hija.cuerpo.id });
    const bisnieta = await crear({ parcelaMadreId: nieta.cuerpo.id });
    const deOtraLocalidad = await crear({ parcelaMadreId: madre.cuerpo.id, localidadId: otraLocalidadId });

    expect([hija.cuerpo.nivel, nieta.cuerpo.nivel]).toEqual([2, 3]);
    expect(hija.cuerpo.parcelaMadreCodigo).toBe(madre.cuerpo.codigo);
    expect(bisnieta.estado).toBe(422);
    expect(bisnieta.cuerpo.error.codigo).toBe('nivel_maximo_de_parcelas');
    expect(deOtraLocalidad.cuerpo.error.codigo).toBe('parcela_de_otra_localidad');
  });

  it('la lista se arma como árbol y se filtra por texto y por estado', async () => {
    const madre = await crear({ nombre: 'Arbolito Raiz' });
    const hija = await crear({ nombre: 'Arbolito Hija', parcelaMadreId: madre.cuerpo.id });

    const arbol = (await cuenta.propietario.get(`${RUTA}?arbol=true&texto=arbolito`)).cuerpo as Array<{
      id: string;
      hijas: Array<{ id: string }>;
    }>;
    const porTexto = (await cuenta.propietario.get(`${RUTA}?texto=ARBOLITO%20HIJA`)).cuerpo as Array<{ id: string }>;
    await cuenta.propietario.post(`${RUTA}/${hija.cuerpo.id}/inactivar`, {});
    const activas = (await cuenta.propietario.get(`${RUTA}?soloActivas=true&texto=arbolito`)).cuerpo as unknown[];

    expect(arbol).toHaveLength(1);
    expect(arbol[0]!.hijas.map(({ id }) => id)).toEqual([hija.cuerpo.id]);
    expect(porTexto.map(({ id }) => id)).toEqual([hija.cuerpo.id]);
    expect(activas).toHaveLength(1);
  });

  it('cambia sus datos y los inmuebles que abarca; quitar uno deja rastro', async () => {
    const finca = await cuenta.propietario.post('/api/empresas/inmuebles', {
      nombre: 'Finca registral',
      situacionRegistral: 'posesorio',
      documentoPosesorio: 'Derechos posesorios',
      titularidad: 'propia',
    });
    const parcela = await crear();
    const cambio = { ...cuerpoDeParcela(base), nombre: 'Potrero Norte', formaDeTenencia: 'arrendada' };

    const ligada = await cuenta.propietario.put(`${RUTA}/${parcela.cuerpo.id}`, {
      ...cambio,
      inmuebles: [{ inmuebleId: finca.cuerpo.id, superficieM2: '500.00' }],
    });
    const suelta = await cuenta.propietario.put(`${RUTA}/${parcela.cuerpo.id}`, { ...cambio, inmuebles: [] });

    expect(ligada.cuerpo).toMatchObject({ nombre: 'Potrero Norte', formaDeTenencia: 'arrendada' });
    expect(ligada.cuerpo.inmuebles).toEqual([
      { inmuebleId: finca.cuerpo.id, inmuebleNombre: 'Finca registral', superficieM2: '500.00' },
    ]);
    expect(suelta.cuerpo.inmuebles).toEqual([]);
    const rastro = await comoPropietario<{ accion: string }>(
      "select accion from core.auditoria where recurso = 'parcelas.parcelas' and registro_id = $1",
      [parcela.cuerpo.id],
    );
    expect(rastro.map(({ accion }) => accion)).toEqual(['quitar']);
  });

  it('no inactiva una con subparcelas activas; sí después, y la reactiva solo con la madre activa', async () => {
    const madre = await crear();
    const hija = await crear({ parcelaMadreId: madre.cuerpo.id });

    const bloqueada = await cuenta.propietario.post(`${RUTA}/${madre.cuerpo.id}/inactivar`, {});
    await cuenta.propietario.post(`${RUTA}/${hija.cuerpo.id}/inactivar`, {});
    const inactiva = await cuenta.propietario.post(`${RUTA}/${madre.cuerpo.id}/inactivar`, { fecha: '2026-12-01' });
    const huerfana = await cuenta.propietario.post(`${RUTA}/${hija.cuerpo.id}/reactivar`);
    await cuenta.propietario.post(`${RUTA}/${madre.cuerpo.id}/reactivar`);
    const reactivada = await cuenta.propietario.post(`${RUTA}/${hija.cuerpo.id}/reactivar`);

    expect(bloqueada.cuerpo.error.codigo).toBe('parcela_con_hijas_activas');
    expect(inactiva.cuerpo.activo).toBe(false);
    expect(huerfana.cuerpo.error.codigo).toBe('madre_inactiva');
    expect(reactivada.cuerpo.activo).toBe(true);
    const acciones = await comoPropietario<{ accion: string }>(
      "select accion from core.auditoria where recurso = 'parcelas.parcelas' and registro_id = $1 order by creado_en",
      [madre.cuerpo.id],
    );
    expect(acciones.map(({ accion }) => accion)).toEqual(['inactivar', 'reactivar']);
  });

  it('se elimina solo si no tiene subparcelas ni mediciones vigentes, y queda en la auditoría', async () => {
    const madre = await crear();
    await crear({ parcelaMadreId: madre.cuerpo.id });
    const medida = await crear({ medicion: cuerpoDeMedicion() });
    const vacia = await crear();

    const conHijas = await cuenta.propietario.delete(`${RUTA}/${madre.cuerpo.id}`);
    const conMedicion = await cuenta.propietario.delete(`${RUTA}/${medida.cuerpo.id}`);
    const eliminada = await cuenta.propietario.delete(`${RUTA}/${vacia.cuerpo.id}`);

    expect([conHijas.estado, conMedicion.estado, eliminada.estado]).toEqual([422, 422, 204]);
    expect(conHijas.cuerpo.error.codigo).toBe('parcela_con_registros');
    expect((await cuenta.propietario.get(`${RUTA}/${vacia.cuerpo.id}`)).estado).toBe(404);
    const rastro = await comoPropietario<{ anterior: { codigo: string } }>(
      "select anterior from core.auditoria where recurso = 'parcelas.parcelas' and registro_id = $1 and accion = 'eliminar'",
      [vacia.cuerpo.id],
    );
    expect(rastro[0]!.anterior.codigo).toBe(vacia.cuerpo.codigo);
  });

  it('otra cuenta no ve sus parcelas', async () => {
    const parcela = await crear();

    expect((await otraCuenta.propietario.get(`${RUTA}/${parcela.cuerpo.id}`)).estado).toBe(404);
    expect((await otraCuenta.propietario.get(RUTA)).cuerpo).toEqual([]);
  });
});
