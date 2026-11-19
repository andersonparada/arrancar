/**
 * La ventana de asignación de fondos (CC-2): quién ve y opera cada fondo. Todas las rutas exigen
 * `caja-chica.fondos.asignar`; asignar y quitar se audita; quien recibe el fondo lo ve y quien lo pierde, no.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import {
  conAccesoAlFondo,
  EscenarioDeCajaChica,
  RUTA_DE_ACCESOS,
  RUTA_DE_FONDOS,
} from './soporte/caja-chica-fondos.js';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';
import { auditoriaDe } from './soporte/ordenes-de-bancos.js';

const entorno = usarEntornoApi();
let e: EscenarioDeCajaChica;
let usuario: ClienteApi;
let usuarioId: string;
let sinAsignar: ClienteApi;

beforeAll(async () => {
  e = await EscenarioDeCajaChica.preparar(entorno, 'cajachicaaccesos');
  usuario = await crearUsuarioConPermisos(entorno, e.cuenta, {
    nombres: 'Cajero',
    apellidos: 'Uno',
    permisos: ['caja-chica.fondos.ver'],
  });
  sinAsignar = await crearUsuarioConPermisos(entorno, e.cuenta, {
    nombres: 'Sin',
    apellidos: 'Asignar',
    permisos: ['caja-chica.fondos.ver'],
  });
  const [fila] = await comoPropietario<{ id: string }>(
    `select u.id from core.usuarios u join core.empresa_usuarios eu on eu.usuario_id = u.id
      where u.nombres = 'Cajero' and eu.empresa_id = $1`,
    [e.cuenta.empresaId],
  );
  usuarioId = fila!.id;
});

describe('asignar fondos a un usuario', () => {
  it('quien se asigna lo ve y quien lo pierde deja de verlo; cada cambio se audita', async () => {
    const uno = await e.abrir(e.conCheque('Caja asignada uno'));
    const dos = await e.abrir(e.conCheque('Caja asignada dos'));
    expect((await usuario.get(`${RUTA_DE_FONDOS}/${uno.id}`)).estado).toBe(404);

    const asignado = await e.propietario().put(`${RUTA_DE_ACCESOS}/${usuarioId}`, { fondoIds: [uno.id, dos.id] });
    expect(asignado.estado, JSON.stringify(asignado.cuerpo)).toBe(200);
    expect((await usuario.get(`${RUTA_DE_FONDOS}/${uno.id}`)).estado).toBe(200);
    expect((await e.propietario().get(`${RUTA_DE_ACCESOS}/${usuarioId}`)).cuerpo.sort()).toEqual(
      [uno.id, dos.id].sort(),
    );

    await e.propietario().put(`${RUTA_DE_ACCESOS}/${usuarioId}`, { fondoIds: [dos.id] });

    expect((await usuario.get(`${RUTA_DE_FONDOS}/${uno.id}`)).estado).toBe(404);
    expect(await conAccesoAlFondo(uno.id)).toEqual(['cajachicaaccesos']);
    const auditoria = (await auditoriaDe(uno.id)).map(({ accion, recurso }) => [accion, recurso]);
    expect(auditoria).toEqual([
      ['asignar', 'caja-chica.accesos-a-fondos'],
      ['quitar', 'caja-chica.accesos-a-fondos'],
    ]);
  });

  it('la lista de fondos trae quiénes tienen acceso y la de usuarios, si ven todos', async () => {
    const fondo = await e.abrir(e.conCheque('Caja de la lista de accesos'));
    await e.propietario().put(`${RUTA_DE_ACCESOS}/${usuarioId}`, { fondoIds: [fondo.id] });

    const fondos = await e.propietario().get(`${RUTA_DE_ACCESOS}/fondos`);
    const usuarios = await e.propietario().get(`${RUTA_DE_ACCESOS}/usuarios`);

    const fila = fondos.cuerpo.find((f: { id: string }) => f.id === fondo.id);
    expect(fila).toMatchObject({ nombre: 'Caja de la lista de accesos', estado: 'abierto' });
    expect(fila.usuarioIds).toContain(usuarioId);
    const propietario = usuarios.cuerpo.find((u: { usuario: string }) => u.usuario === 'cajachicaaccesos');
    expect(propietario.veTodos).toBe(true);
    expect(usuarios.cuerpo.find((u: { usuarioId: string }) => u.usuarioId === usuarioId).veTodos).toBe(false);
  });

  it('un fondo o un usuario que no existen no escriben nada', async () => {
    const fondo = await e.abrir(e.conCheque('Caja intacta'));

    const fondoFalso = await e.propietario().put(`${RUTA_DE_ACCESOS}/${usuarioId}`, {
      fondoIds: [fondo.id, crypto.randomUUID()],
    });
    const usuarioFalso = await e
      .propietario()
      .put(`${RUTA_DE_ACCESOS}/${crypto.randomUUID()}`, { fondoIds: [fondo.id] });

    expect(fondoFalso.estado).toBe(404);
    expect(usuarioFalso.estado).toBe(404);
    expect(await conAccesoAlFondo(fondo.id)).toEqual(['cajachicaaccesos']);
  });
});

describe('quién puede asignar', () => {
  it('sin el permiso de asignar, todas las rutas dan 403', async () => {
    const rutas = [`${RUTA_DE_ACCESOS}/fondos`, `${RUTA_DE_ACCESOS}/usuarios`, `${RUTA_DE_ACCESOS}/${usuarioId}`];

    for (const ruta of rutas) expect((await sinAsignar.get(ruta)).estado, ruta).toBe(403);
    expect((await sinAsignar.put(`${RUTA_DE_ACCESOS}/${usuarioId}`, { fondoIds: [] })).estado).toBe(403);
  });
});
