import { beforeAll, describe, expect, it } from 'vitest';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const RUTA = '/api/empresas/inmuebles';
const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let otraCuenta: CuentaDePrueba;

/** Un inmueble inscrito en el Registro General, sin copropiedad. */
const datos = (cambios: Record<string, unknown> = {}) => ({
  nombre: 'Finca El Carmen',
  situacionRegistral: 'inscrito',
  registro: 'general',
  numeroDeFinca: '1234',
  folio: '56',
  libro: '345E',
  departamentoRegistral: '01',
  titularidad: 'propia',
  ...cambios,
});

const posesorio = (cambios: Record<string, unknown> = {}) =>
  datos({
    situacionRegistral: 'posesorio',
    registro: null,
    numeroDeFinca: null,
    folio: null,
    libro: null,
    departamentoRegistral: null,
    documentoPosesorio: 'Escritura 12, notario Pérez, 2019',
    ...cambios,
  });

const rastro = (accion: string, id: string) =>
  comoPropietario<{ anterior: { nombre: string } }>(
    "select anterior from core.auditoria where recurso = 'empresas.inmuebles' and accion = $1 and registro_id = $2",
    [accion, id],
  );

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Generada', usuario: 'propietariogenerado' });
  otraCuenta = await darDeAltaCuenta(entorno, { nombre: 'Ajena', usuario: 'propietarioajeno' });
});

describe('inmuebles por API', () => {
  it('se registran, se listan y se cambian', async () => {
    const creado = await cuenta.propietario.post(RUTA, datos({ nombre: 'Finca uno', numeroDeFinca: '1' }));
    const id = creado.cuerpo.id;
    const cambiado = await cuenta.propietario.put(
      `${RUTA}/${id}`,
      datos({ nombre: 'Finca uno cambiada', numeroDeFinca: '1', matriculaFiscal: 'M-77' }),
    );

    expect(creado.estado).toBe(201);
    expect(creado.cuerpo).toMatchObject({ activo: true, localidadId: null, localidadNombre: null, libro: '345E' });
    expect((await cuenta.propietario.get(`${RUTA}/${id}`)).cuerpo).toEqual(cambiado.cuerpo);
    expect(cambiado.cuerpo).toMatchObject({ nombre: 'Finca uno cambiada', matriculaFiscal: 'M-77' });
  });

  it('un inmueble posesorio se registra con su documento y sin datos del libro', async () => {
    const creado = await cuenta.propietario.post(RUTA, posesorio({ nombre: 'Terreno posesorio' }));

    expect(creado.estado).toBe(201);
    expect(creado.cuerpo).toMatchObject({ situacionRegistral: 'posesorio', registro: null, folio: null });
  });

  it('un inscrito sin los datos de su libro responde su error propio', async () => {
    const sinFolio = await cuenta.propietario.post(RUTA, datos({ nombre: 'Sin folio', folio: null }));
    const posesorioSinDocumento = await cuenta.propietario.post(
      RUTA,
      posesorio({ nombre: 'Sin documento', documentoPosesorio: null }),
    );

    expect(sinFolio.estado).toBe(400);
    expect(sinFolio.cuerpo.error.codigo).toBe('inmueble_registro_incompleto');
    expect(posesorioSinDocumento.cuerpo.error.codigo).toBe('inmueble_registro_incompleto');
  });

  it('la copropiedad lleva su porcentaje y la base lo respalda', async () => {
    const sin = await cuenta.propietario.post(RUTA, datos({ nombre: 'Copropiedad sola', titularidad: 'copropiedad' }));
    const con = await cuenta.propietario.post(
      RUTA,
      datos({
        nombre: 'Copropiedad con porcentaje',
        numeroDeFinca: '2',
        titularidad: 'copropiedad',
        porcentajeDeCopropiedad: '33.33',
      }),
    );

    expect(sin.estado).toBe(400);
    expect(con.cuerpo.porcentajeDeCopropiedad).toBe('33.33');
  });

  it('el nombre y la finca inscrita no se repiten en la empresa', async () => {
    await cuenta.propietario.post(RUTA, datos({ nombre: 'Repetida', numeroDeFinca: '900', libro: '10a' }));
    const porNombre = await cuenta.propietario.post(RUTA, datos({ nombre: ' REPETIDA ', numeroDeFinca: '901' }));
    const porRegistro = await cuenta.propietario.post(
      RUTA,
      datos({ nombre: 'Otro nombre', numeroDeFinca: '900', libro: '10A' }),
    );

    expect([porNombre.estado, porRegistro.estado]).toEqual([409, 409]);
    expect(porNombre.cuerpo.error.mensaje).toContain('Ya existe un inmueble con ese nombre');
    expect(porRegistro.cuerpo.error.mensaje).toContain('ya está registrado');
  });

  it('otra cuenta no los ve ni puede repetir su finca', async () => {
    const ajeno = await otraCuenta.propietario.post(RUTA, datos({ nombre: 'Ajeno', numeroDeFinca: '777' }));
    const igual = await cuenta.propietario.post(RUTA, datos({ nombre: 'Ajeno', numeroDeFinca: '777' }));

    expect((await cuenta.propietario.get(`${RUTA}/${ajeno.cuerpo.id}`)).estado).toBe(404);
    expect(igual.estado).toBe(201);
  });

  it('para cada acción hace falta su permiso', async () => {
    const lector = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Solo',
      apellidos: 'Lectura',
      permisos: ['empresas.inmuebles.ver'],
    });
    const propio = await cuenta.propietario.post(RUTA, datos({ nombre: 'Permisos', numeroDeFinca: '5' }));
    const url = `${RUTA}/${propio.cuerpo.id}`;

    expect((await lector.get(RUTA)).estado).toBe(200);
    expect((await lector.post(RUTA, datos())).estado).toBe(403);
    expect((await lector.post(`${url}/inactivar`, {})).estado).toBe(403);
    expect((await lector.delete(url)).estado).toBe(403);
    expect((await lector.get(`${RUTA}/exportar`)).estado).toBe(403);
    expect((await lector.get(`${RUTA}/plantilla`)).estado).toBe(403);
  });
});

describe('baja de inmuebles', () => {
  it('al eliminarlo queda en la auditoría con cómo estaba', async () => {
    const creado = await cuenta.propietario.post(RUTA, datos({ nombre: 'Para eliminar', numeroDeFinca: '31' }));

    const baja = await cuenta.propietario.delete(`${RUTA}/${creado.cuerpo.id}`);

    expect(baja.estado).toBe(204);
    expect((await cuenta.propietario.get(`${RUTA}/${creado.cuerpo.id}`)).estado).toBe(404);
    expect((await rastro('eliminar', creado.cuerpo.id)).map((fila) => fila.anterior.nombre)).toEqual(['Para eliminar']);
  });

  it('inactivar y reactivar quedan en la auditoría y no pierden los datos', async () => {
    const creado = await cuenta.propietario.post(RUTA, datos({ nombre: 'Cambia de estado', numeroDeFinca: '32' }));
    const url = `${RUTA}/${creado.cuerpo.id}`;

    const inactivo = await cuenta.propietario.post(`${url}/inactivar`, {});
    const otraVez = await cuenta.propietario.post(`${url}/inactivar`, {});
    const reactivado = await cuenta.propietario.post(`${url}/reactivar`, {});

    expect(inactivo.cuerpo).toEqual({ ...creado.cuerpo, activo: false });
    expect(otraVez.estado).toBe(200);
    expect(reactivado.cuerpo).toEqual(creado.cuerpo);
    expect(await rastro('inactivar', creado.cuerpo.id)).toHaveLength(1);
    expect(await rastro('reactivar', creado.cuerpo.id)).toHaveLength(1);
  });

  it('con algo apuntándole no se elimina: 409 inmueble_en_uso y el inmueble sigue', async () => {
    const creado = await cuenta.propietario.post(RUTA, datos({ nombre: 'En uso', numeroDeFinca: '33' }));
    const id = creado.cuerpo.id as string;
    // Hace de Parcelas o Activos fijos: una tabla con llave compuesta al inmueble, como las de esos módulos.
    await comoPropietario('create table empresas.zz_usa_inmueble (inmueble_id uuid, empresa_id uuid)', []);
    await comoPropietario(
      'alter table empresas.zz_usa_inmueble add foreign key (inmueble_id, empresa_id) references empresas.inmuebles (id, empresa_id)',
      [],
    );
    await comoPropietario(
      'insert into empresas.zz_usa_inmueble select id, empresa_id from empresas.inmuebles where id = $1',
      [id],
    );

    const baja = await cuenta.propietario.delete(`${RUTA}/${id}`);
    await comoPropietario('drop table empresas.zz_usa_inmueble', []);

    expect(baja.estado).toBe(409);
    expect(baja.cuerpo.error.codigo).toBe('inmueble_en_uso');
    expect((await cuenta.propietario.get(`${RUTA}/${id}`)).estado).toBe(200);
    expect(await rastro('eliminar', id)).toEqual([]);
  });

  it('su auditoría no se depura: está en el catálogo de auditoría permanente', async () => {
    const catalogo = await comoPropietario<{ motivo: string }>(
      "select motivo from core.recursos_de_auditoria_permanente where recurso = 'empresas.inmuebles'",
      [],
    );

    expect(catalogo).toHaveLength(1);
    expect(catalogo[0]!.motivo).toContain('Código de Comercio art. 382');
  });
});
