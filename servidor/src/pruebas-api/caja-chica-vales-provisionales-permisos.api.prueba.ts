/**
 * Vales provisionales (CC-6): los permisos por acción, el fondo a la vista y el aviso «vale viejo» en la lista, la ficha del
 * fondo y la propuesta de arqueo.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import { RUTA_DE_ACCESOS, RUTA_DE_FONDOS } from './soporte/caja-chica-fondos.js';
import { EscenarioDeComprobantes, usuarioIdDe } from './soporte/caja-chica-comprobantes.js';
import { AyudasDeVales, RUTA_DE_VALES } from './soporte/caja-chica-vales-provisionales.js';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
let e: EscenarioDeComprobantes;
let v: AyudasDeVales;
let soloVer: ClienteApi;
let almacenero: ClienteApi;

beforeAll(async () => {
  e = await EscenarioDeComprobantes.preparar(entorno, 'cajachicavalespermisos');
  v = new AyudasDeVales(e);
  const cuenta = e.caja.cuenta;
  soloVer = await crearUsuarioConPermisos(entorno, cuenta, {
    nombres: 'Solo',
    apellidos: 'Mira',
    permisos: ['caja-chica.fondos.ver'],
  });
  almacenero = await crearUsuarioConPermisos(entorno, cuenta, {
    nombres: 'Alma',
    apellidos: 'Cenero',
    permisos: [
      'caja-chica.fondos.ver',
      'caja-chica.vales.crear',
      'caja-chica.vales.liquidar',
      'caja-chica.vales.anular',
    ],
  });
});

describe('permisos y fondo a la vista', () => {
  it('cada acción pide su permiso (403) y el fondo asignado (404); ver pide solo fondos.ver', async () => {
    const fondo = await v.fondoDe('Caja de los permisos de los vales');
    const vale = await v.entregarBien(fondo.id);
    const id = await usuarioIdDe(e.caja.cuenta.empresaId, 'Alma');
    await e.propietario().put(`${RUTA_DE_ACCESOS}/${id}`, { fondoIds: [fondo.id] });
    const soloViendoId = await usuarioIdDe(e.caja.cuenta.empresaId, 'Solo');
    await e.propietario().put(`${RUTA_DE_ACCESOS}/${soloViendoId}`, { fondoIds: [fondo.id] });

    expect((await v.entregar(fondo.id, {}, soloVer)).estado).toBe(403);
    expect((await v.liquidar(vale.id, {}, soloVer)).estado).toBe(403);
    expect((await soloVer.post(`${RUTA_DE_VALES}/${vale.id}/anular`, { motivo: 'x' })).estado).toBe(403);
    expect((await soloVer.get(`${RUTA_DE_VALES}/${vale.id}`)).estado).toBe(200);
    expect((await soloVer.get(`${RUTA_DE_FONDOS}/${fondo.id}/vales-provisionales`)).estado).toBe(200);
    expect((await v.entregar(fondo.id, { monto: '10.00' }, almacenero)).estado).toBe(201);
  });

  it('un fondo que el usuario no tiene asignado no se ve ni se toca', async () => {
    const fondo = await v.fondoDe('Caja ajena de los vales');
    const vale = await v.entregarBien(fondo.id);

    expect((await v.entregar(fondo.id, {}, almacenero)).estado).toBe(404);
    expect((await v.liquidar(vale.id, {}, almacenero)).estado).toBe(404);
    expect((await almacenero.post(`${RUTA_DE_VALES}/${vale.id}/anular`, { motivo: 'x' })).estado).toBe(404);
    expect((await almacenero.get(`${RUTA_DE_VALES}/${vale.id}`)).estado).toBe(404);
    expect((await almacenero.get(`${RUTA_DE_FONDOS}/${fondo.id}/vales-provisionales`)).estado).toBe(404);
  });
});

describe('el aviso de vale viejo', () => {
  it('avisa en la lista, la ficha del fondo y la propuesta de arqueo; liquidar lo quita', async () => {
    const fondo = await v.fondoDe('Caja del vale viejo');
    const vale = await v.entregarBien(fondo.id);
    await comoPropietario('update caja_chica.vales_provisionales set fecha = current_date - 10 where id = $1', [
      vale.id,
    ]);

    const lista = await e.propietario().get(`${RUTA_DE_FONDOS}/${fondo.id}/vales-provisionales`);
    const propuesta = await e.propietario().get(`${RUTA_DE_FONDOS}/${fondo.id}/arqueos/propuesta`);
    const antes = await v.ficha(fondo.id);
    await v.liquidar(vale.id);
    const despues = await v.ficha(fondo.id);

    expect(lista.cuerpo[0].avisos).toEqual([expect.stringContaining('días abierto')]);
    expect(propuesta.cuerpo.avisos).toEqual([expect.stringContaining('vale provisional abierto')]);
    expect(antes.avisos).toEqual([expect.stringContaining('vale provisional abierto')]);
    expect(despues.avisos).toEqual([]);
  });
});
