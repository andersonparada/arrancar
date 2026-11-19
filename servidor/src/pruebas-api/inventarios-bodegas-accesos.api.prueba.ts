import { beforeAll, describe, expect, it } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const RUTA = '/api/inventarios/bodegas';
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
const ids: string[] = [];

const idDe = async (cliente: ClienteApi) => (await cliente.get('/api/sesion')).cuerpo.usuario.id as string;

const datos = (n: number) => ({
  codigo: `ACC-${n}`,
  nombre: `Bodega ${n}`,
  localidadId: null,
  responsable: null,
  responsableUsuarioId: null,
  activo: true,
});

/** Las entradas de auditoría de un usuario en una bodega (quien creó las bodegas también quedó asignado). */
const rastro = (accion: string, bodegaId: string, usuarioId: string) =>
  comoPropietario<{ anterior: { usuarioId: string; aSiMismo: boolean; codigo: string } }>(
    `select anterior from core.auditoria
      where recurso = 'inventarios.accesos-a-bodegas' and accion = $1 and registro_id = $2
        and anterior->>'usuarioId' = $3`,
    [accion, bodegaId, usuarioId],
  );

beforeAll(async () => {
  const modulos = ['terceros', 'libro-de-compras', 'inventarios'];
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Accesos', usuario: 'propietarioaccesosbod', modulos });
  otraCuenta = await darDeAltaCuenta(entorno, {
    nombre: 'Accesos ajena',
    usuario: 'propietarioaccesosbodajeno',
    modulos,
  });
  for (const n of [1, 2, 3]) ids.push((await cuenta.propietario.post(RUTA, datos(n))).cuerpo.id);
  asignador = await crearUsuarioConPermisos(entorno, cuenta, {
    nombres: 'Asigna',
    apellidos: 'Bodegas',
    permisos: ['inventarios.bodegas.ver', 'inventarios.bodegas.asignar'],
  });
  trabajador = await crearUsuarioConPermisos(entorno, cuenta, {
    nombres: 'Trabaja',
    apellidos: 'Bodegas',
    permisos: ['inventarios.bodegas.ver'],
  });
  [idDelAsignador, idDelTrabajador, idDelPropietario, idAjeno] = await Promise.all([
    idDe(asignador),
    idDe(trabajador),
    idDe(cuenta.propietario),
    idDe(otraCuenta.propietario),
  ]);
});

describe('ventana de accesos a bodegas', () => {
  it('sin el permiso de asignar todas las rutas responden 403', async () => {
    const respuestas = await Promise.all([
      trabajador.get(`${ACCESOS}/bodegas`),
      trabajador.get(`${ACCESOS}/usuarios`),
      trabajador.get(`${ACCESOS}/${idDelAsignador}`),
      trabajador.put(`${ACCESOS}/${idDelTrabajador}`, { bodegaIds: [ids[0]] }),
      trabajador.get(`${RUTA}/${ids[0]}/usuarios`),
    ]);

    expect(respuestas.map((r) => r.estado)).toEqual([403, 403, 403, 403, 403]);
  });

  it('con el permiso ve todas las bodegas y los usuarios, aunque no tenga acceso a ninguna', async () => {
    const bodegas = (await asignador.get(`${ACCESOS}/bodegas`)).cuerpo as Array<{ id: string }>;
    const usuarios = (await asignador.get(`${ACCESOS}/usuarios`)).cuerpo as Array<{
      usuarioId: string;
      veTodas: boolean;
    }>;

    expect(ids.every((id) => bodegas.some((b) => b.id === id))).toBe(true);
    expect(usuarios.map((u) => u.usuarioId)).toEqual(
      expect.arrayContaining([idDelAsignador, idDelTrabajador, idDelPropietario]),
    );
    expect(usuarios.find((u) => u.usuarioId === idDelPropietario)?.veTodas).toBe(true);
    expect(usuarios.find((u) => u.usuarioId === idDelTrabajador)?.veTodas).toBe(false);
    expect(usuarios.some((u) => u.usuarioId === idAjeno)).toBe(false);
  });

  it('fuera de la ventana sigue viendo solo lo suyo', async () => {
    expect((await asignador.get(RUTA)).cuerpo).toEqual([]);
    expect((await asignador.get(`${RUTA}/${ids[0]}`)).estado).toBe(404);
    expect((await asignador.get(`${RUTA}/${ids[0]}/usuarios`)).estado).toBe(404);
  });

  it('asigna y quita accesos a un usuario, con auditoría por cada cambio', async () => {
    await asignador.put(`${ACCESOS}/${idDelTrabajador}`, { bodegaIds: [ids[0], ids[1]] });
    const cambiado = await asignador.put(`${ACCESOS}/${idDelTrabajador}`, { bodegaIds: [ids[1], ids[2]] });

    expect(cambiado.estado).toBe(200);
    expect((await asignador.get(`${ACCESOS}/${idDelTrabajador}`)).cuerpo.sort()).toEqual([ids[1], ids[2]].sort());
    const propias = ((await trabajador.get(RUTA)).cuerpo as Array<{ id: string }>).map((b) => b.id);
    expect(propias.sort()).toEqual([ids[1], ids[2]].sort());
    expect(await rastro('asignar', ids[0]!, idDelTrabajador)).toHaveLength(1);
    expect((await rastro('quitar', ids[0]!, idDelTrabajador))[0]?.anterior).toMatchObject({
      codigo: 'ACC-1',
      aSiMismo: false,
    });
  });

  it('la ficha lista los usuarios con acceso a una bodega que se ve', async () => {
    const usuarios = await cuenta.propietario.get(`${RUTA}/${ids[1]}/usuarios`);

    expect(usuarios.cuerpo).toEqual(expect.arrayContaining([expect.objectContaining({ usuarioId: idDelTrabajador })]));
  });

  it('puede asignarse a sí mismo y queda marcado en la auditoría', async () => {
    const respuesta = await asignador.put(`${ACCESOS}/${idDelAsignador}`, { bodegaIds: [ids[2]] });

    expect(respuesta.estado).toBe(200);
    expect(((await asignador.get(RUTA)).cuerpo as Array<{ id: string }>).map((b) => b.id)).toEqual([ids[2]]);
    expect(await rastro('asignar', ids[2]!, idDelAsignador)).toEqual([
      { anterior: expect.objectContaining({ aSiMismo: true, codigo: 'ACC-3' }) },
    ]);
  });

  it('rechaza con 404 un usuario ajeno a la empresa o una bodega inexistente o de otra empresa, sin escribir', async () => {
    const ajena = (await otraCuenta.propietario.post(RUTA, datos(9))).cuerpo.id;
    const ajeno = await asignador.put(`${ACCESOS}/${idAjeno}`, { bodegaIds: [ids[0]] });
    const inexistente = await asignador.put(`${ACCESOS}/${idDelTrabajador}`, {
      bodegaIds: [ids[1], '00000000-0000-4000-8000-000000000000'],
    });
    const deOtraEmpresa = await asignador.put(`${ACCESOS}/${idDelTrabajador}`, { bodegaIds: [ajena] });

    expect([ajeno.estado, inexistente.estado, deOtraEmpresa.estado]).toEqual([404, 404, 404]);
    expect((await asignador.get(`${ACCESOS}/${idDelTrabajador}`)).cuerpo.sort()).toEqual([ids[1], ids[2]].sort());
  });

  it('dejar el conjunto vacío quita todos los accesos', async () => {
    await asignador.put(`${ACCESOS}/${idDelTrabajador}`, { bodegaIds: [] });

    expect((await trabajador.get(RUTA)).cuerpo).toEqual([]);
    expect((await rastro('quitar', ids[2]!, idDelTrabajador)).length).toBeGreaterThan(0);
  });
});
