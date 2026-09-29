import { beforeAll, describe, expect, it } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const RUTA = '/api/empresas/localidades';
const ACCESOS = `${RUTA}/accesos`;
const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let otraCuenta: CuentaDePrueba;
let asignador: ClienteApi;
let idDelAsignador: string;
let trabajador: ClienteApi;
let idDelTrabajador: string;
let idDelPropietario: string;
let idAjeno: string;
let tipoId: string;
const ids: string[] = [];

const idDe = async (cliente: ClienteApi) => (await cliente.get('/api/sesion')).cuerpo.usuario.id as string;

const datos = (n: number) => ({
  codigo: `ACC-${n}`,
  nombre: `Localidad ${n}`,
  tipoId,
  codigoEstablecimientoSat: null,
  nombreComercialSat: null,
  departamentoCodigo: null,
  municipioCodigo: null,
  direccion: null,
  activo: true,
});

const primerTipo = async (quien: CuentaDePrueba) =>
  ((await quien.propietario.get('/api/empresas/tipos-de-localidad')).cuerpo as Array<{ id: string }>)[0]!.id;

/** Las entradas de auditoría de un usuario en una localidad (quien creó las localidades también quedó asignado). */
const rastro = (accion: string, localidadId: string, usuarioId: string) =>
  comoPropietario<{ anterior: { usuarioId: string; aSiMismo: boolean; codigo: string } }>(
    `select anterior from core.auditoria
      where recurso = 'empresas.accesos-a-localidades' and accion = $1 and registro_id = $2
        and anterior->>'usuarioId' = $3`,
    [accion, localidadId, usuarioId],
  );

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Accesos', usuario: 'propietarioaccesos' });
  otraCuenta = await darDeAltaCuenta(entorno, { nombre: 'Accesos ajena', usuario: 'propietarioaccesosajeno' });
  tipoId = await primerTipo(cuenta);
  for (const n of [1, 2, 3]) ids.push((await cuenta.propietario.post(RUTA, datos(n))).cuerpo.id);
  asignador = await crearUsuarioConPermisos(entorno, cuenta, {
    nombres: 'Asigna',
    apellidos: 'Accesos',
    permisos: ['empresas.localidades.ver', 'empresas.localidades.asignar'],
  });
  trabajador = await crearUsuarioConPermisos(entorno, cuenta, {
    nombres: 'Trabaja',
    apellidos: 'Accesos',
    permisos: ['empresas.localidades.ver'],
  });
  [idDelAsignador, idDelTrabajador, idDelPropietario, idAjeno] = await Promise.all([
    idDe(asignador),
    idDe(trabajador),
    idDe(cuenta.propietario),
    idDe(otraCuenta.propietario),
  ]);
});

describe('ventana de accesos a localidades', () => {
  it('sin el permiso de asignar todas las rutas responden 403', async () => {
    const respuestas = await Promise.all([
      trabajador.get(`${ACCESOS}/localidades`),
      trabajador.get(`${ACCESOS}/usuarios`),
      trabajador.get(`${ACCESOS}/${idDelAsignador}`),
      trabajador.put(`${ACCESOS}/${idDelTrabajador}`, { localidadIds: [ids[0]] }),
      trabajador.get(`${RUTA}/${ids[0]}/usuarios`),
    ]);

    expect(respuestas.map((r) => r.estado)).toEqual([403, 403, 403, 403, 403]);
  });

  it('con el permiso ve todas las localidades y los usuarios, aunque no tenga acceso a ninguna', async () => {
    const localidades = (await asignador.get(`${ACCESOS}/localidades`)).cuerpo as Array<{ id: string }>;
    const usuarios = (await asignador.get(`${ACCESOS}/usuarios`)).cuerpo as Array<{
      usuarioId: string;
      veTodas: boolean;
      roles: string[];
    }>;

    expect(ids.every((id) => localidades.some((l) => l.id === id))).toBe(true);
    expect(usuarios.map((u) => u.usuarioId)).toEqual(
      expect.arrayContaining([idDelAsignador, idDelTrabajador, idDelPropietario]),
    );
    expect(usuarios.find((u) => u.usuarioId === idDelPropietario)?.veTodas).toBe(true);
    expect(usuarios.find((u) => u.usuarioId === idDelTrabajador)).toMatchObject({
      veTodas: false,
      roles: [expect.any(String)],
    });
    expect(usuarios.some((u) => u.usuarioId === idAjeno)).toBe(false);
  });

  it('fuera de la ventana sigue viendo solo lo suyo', async () => {
    const propias = (await asignador.get(RUTA)).cuerpo as unknown[];

    expect(propias).toEqual([]);
    expect((await asignador.get(`${RUTA}/${ids[0]}`)).estado).toBe(404);
    expect((await asignador.get(`${RUTA}/${ids[0]}/usuarios`)).estado).toBe(404);
  });

  it('asigna y quita accesos a un usuario, con auditoría por cada cambio', async () => {
    const asignado = await asignador.put(`${ACCESOS}/${idDelTrabajador}`, { localidadIds: [ids[0], ids[1]] });
    const cambiado = await asignador.put(`${ACCESOS}/${idDelTrabajador}`, { localidadIds: [ids[1], ids[2]] });

    expect(asignado.cuerpo.localidadIds.sort()).toEqual([ids[0], ids[1]].sort());
    expect(cambiado.estado).toBe(200);
    expect((await asignador.get(`${ACCESOS}/${idDelTrabajador}`)).cuerpo.sort()).toEqual([ids[1], ids[2]].sort());
    const propias = ((await trabajador.get(RUTA)).cuerpo as Array<{ id: string }>).map((l) => l.id);
    expect(propias.sort()).toEqual([ids[1], ids[2]].sort());
    expect(await rastro('asignar', ids[0]!, idDelTrabajador)).toHaveLength(1);
    expect((await rastro('quitar', ids[0]!, idDelTrabajador))[0]?.anterior).toMatchObject({
      codigo: 'ACC-1',
      aSiMismo: false,
    });
    expect(await rastro('asignar', ids[1]!, idDelTrabajador)).toHaveLength(1);
  });

  it('la ficha lista los usuarios con acceso a una localidad que se ve', async () => {
    const localidades = (await asignador.get(`${ACCESOS}/localidades`)).cuerpo as Array<{
      id: string;
      usuarioIds: string[];
    }>;
    const usuarios = await cuenta.propietario.get(`${RUTA}/${ids[1]}/usuarios`);

    expect(localidades.find((l) => l.id === ids[1])?.usuarioIds).toEqual(expect.arrayContaining([idDelTrabajador]));
    expect(usuarios.cuerpo).toEqual(expect.arrayContaining([expect.objectContaining({ usuarioId: idDelTrabajador })]));
  });

  it('puede asignarse a sí mismo y queda marcado en la auditoría', async () => {
    const respuesta = await asignador.put(`${ACCESOS}/${idDelAsignador}`, { localidadIds: [ids[2]] });

    expect(respuesta.estado).toBe(200);
    expect(((await asignador.get(RUTA)).cuerpo as Array<{ id: string }>).map((l) => l.id)).toEqual([ids[2]]);
    expect(await rastro('asignar', ids[2]!, idDelAsignador)).toEqual([
      { anterior: expect.objectContaining({ aSiMismo: true, codigo: 'ACC-3' }) },
    ]);
  });

  it('rechaza con 404 un usuario ajeno a la empresa o una localidad inexistente, sin escribir nada', async () => {
    const ajeno = await asignador.put(`${ACCESOS}/${idAjeno}`, { localidadIds: [ids[0]] });
    const inexistente = await asignador.put(`${ACCESOS}/${idDelTrabajador}`, {
      localidadIds: [ids[1], '00000000-0000-4000-8000-000000000000'],
    });

    expect([ajeno.estado, inexistente.estado]).toEqual([404, 404]);
    expect((await asignador.get(`${ACCESOS}/${idAjeno}`)).estado).toBe(404);
    expect((await asignador.get(`${ACCESOS}/${idDelTrabajador}`)).cuerpo.sort()).toEqual([ids[1], ids[2]].sort());
  });

  it('una localidad de otra empresa no se puede asignar', async () => {
    const ajena = (await otraCuenta.propietario.post(RUTA, { ...datos(9), tipoId: await primerTipo(otraCuenta) }))
      .cuerpo.id;

    const respuesta = await asignador.put(`${ACCESOS}/${idDelTrabajador}`, { localidadIds: [ajena] });

    expect(respuesta.estado).toBe(404);
  });

  it('dejar el conjunto vacío quita todos los accesos', async () => {
    await asignador.put(`${ACCESOS}/${idDelTrabajador}`, { localidadIds: [] });

    expect((await trabajador.get(RUTA)).cuerpo).toEqual([]);
    expect((await rastro('quitar', ids[2]!, idDelTrabajador)).length).toBeGreaterThan(0);
  });
});
