/**
 * Anular un arqueo (CC-5, §5.7): se anula también su faltante o sobrante, queda auditado «anular», no se anula dos veces
 * ni con el ajuste ya repuesto (primero se anula la reposición), un sobrante no puede dejar el efectivo negativo, exige
 * arqueos.anular y el fondo a la vista.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import { RUTA_DE_FONDOS } from './soporte/caja-chica-fondos.js';
import {
  ajusteDelArqueoEnBase,
  anularArqueo,
  arquear,
  arqueoEnBase,
  auditoriaDelArqueo,
  ducientos,
  PERMISOS_PARA_ARQUEAR,
} from './soporte/caja-chica-arqueos.js';
import { EscenarioDeComprobantes } from './soporte/caja-chica-comprobantes.js';
import { anularReposicion, reponerBien } from './soporte/caja-chica-reposiciones.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
let e: EscenarioDeComprobantes;

const fondoDe = (nombre: string) => e.abrirFondo(nombre, { monto: '3000.00' });
const ficha = async (fondoId: string) => (await e.propietario().get(`${RUTA_DE_FONDOS}/${fondoId}`)).cuerpo;
const faltante = { conteo: ducientos(14), motivoDeDiferencia: 'Se perdió un billete', destinoDelFaltante: 'perdida' };

/** Un fondo con un arqueo con faltante de Q200.00. */
async function fondoConFaltante(nombre: string) {
  const fondo = await fondoDe(nombre);
  const arqueo = (await arquear(fondo.id, e.propietario(), faltante)).cuerpo;
  return { fondo, arqueo };
}

beforeAll(async () => {
  e = await EscenarioDeComprobantes.preparar(entorno, 'cajachicaarqueoanula');
});

describe('anular un arqueo', () => {
  it('anula el arqueo y su faltante, el efectivo esperado vuelve a lo que era y queda auditado «anular»', async () => {
    const { fondo, arqueo } = await fondoConFaltante('Caja del arqueo anulado');
    expect((await ficha(fondo.id)).efectivoEsperado).toBe('2800.00');

    const anulado = await anularArqueo(arqueo.id, e.propietario());

    expect(anulado.estado, JSON.stringify(anulado.cuerpo)).toBe(200);
    expect(anulado.cuerpo).toMatchObject({ estado: 'anulado', motivoDeAnulacion: 'Se contó mal' });
    expect(anulado.cuerpo.comprobante).toMatchObject({ estado: 'anulado' });
    expect(await arqueoEnBase(arqueo.id)).toMatchObject({ estado: 'anulado' });
    expect((await arqueoEnBase(arqueo.id)).fecha_de_anulacion).not.toBeNull();
    expect(await ajusteDelArqueoEnBase(arqueo.id)).toMatchObject({ estado: 'anulado' });
    expect((await ficha(fondo.id)).efectivoEsperado).toBe('3000.00');
    const entradas = await auditoriaDelArqueo(arqueo.id);
    expect(entradas.map(({ accion }) => accion)).toEqual(['ajustar', 'anular']);
    expect(entradas[1]).toMatchObject({ motivo: 'Se contó mal' });
    expect(entradas[1]!.anterior).toMatchObject({ numero: arqueo.numero, estado: 'vigente', diferencia: '-200.00' });
  });

  it('un arqueo cuadrado también se anula, y ya no cuenta como el último arqueo del fondo', async () => {
    const fondo = await fondoDe('Caja del arqueo cuadrado anulado');
    const arqueo = (await arquear(fondo.id, e.propietario())).cuerpo;
    expect((await ficha(fondo.id)).ultimoArqueo).not.toBeNull();

    const anulado = await anularArqueo(arqueo.id, e.propietario());

    expect(anulado.cuerpo).toMatchObject({ estado: 'anulado', comprobante: null });
    expect((await ficha(fondo.id)).ultimoArqueo).toBeNull();
    expect((await auditoriaDelArqueo(arqueo.id)).map(({ accion }) => accion)).toEqual(['anular']);
  });

  it('no se anula dos veces (422) y pide el motivo (400)', async () => {
    const { arqueo } = await fondoConFaltante('Caja de la doble anulación');

    const sinMotivo = await anularArqueo(arqueo.id, e.propietario(), { motivo: ' ' });
    await anularArqueo(arqueo.id, e.propietario());
    const otraVez = await anularArqueo(arqueo.id, e.propietario());

    expect(sinMotivo.estado).toBe(400);
    expect(otraVez.estado).toBe(422);
    expect(otraVez.cuerpo.error.codigo).toBe('arqueo_ya_anulado');
  });

  it('con el faltante ya repuesto no se anula hasta anular la reposición', async () => {
    const { fondo, arqueo } = await fondoConFaltante('Caja del faltante repuesto y anulado');
    const reposicion = await reponerBien(e, { fondoId: fondo.id, ids: [arqueo.comprobante.id] });

    const rechazo = await anularArqueo(arqueo.id, e.propietario());
    await anularReposicion(reposicion.id, e.propietario());
    const despues = await anularArqueo(arqueo.id, e.propietario());

    expect(rechazo.estado).toBe(422);
    expect(rechazo.cuerpo.error.codigo).toBe('arqueo_con_comprobante_repuesto');
    expect((await arqueoEnBase(arqueo.id)).estado).toBe('anulado');
    expect(despues.estado, JSON.stringify(despues.cuerpo)).toBe(200);
  });

  it('anular un sobrante no puede dejar el efectivo esperado negativo (422)', async () => {
    const fondo = await e.abrirFondo('Caja del sobrante que no se anula', { monto: '500.00' });
    const conteo = [...ducientos(3), { denominacionCentavos: 10_000, cantidad: 1 }];
    const arqueo = (
      await arquear(fondo.id, e.propietario(), { conteo, motivoDeDiferencia: 'Sobró un billete de Q200' })
    ).cuerpo;
    for (const _ of [1, 2, 3]) await e.registrarVale(fondo.id, { monto: '200.00' });
    expect((await ficha(fondo.id)).efectivoEsperado).toBe('100.00');

    const rechazo = await anularArqueo(arqueo.id, e.propietario());

    expect(rechazo.estado).toBe(422);
    expect(rechazo.cuerpo.error.codigo).toBe('comprobantes_mayores_que_el_efectivo');
    expect((await arqueoEnBase(arqueo.id)).estado).toBe('vigente');
  });
});

describe('permisos y fondo a la vista', () => {
  it('exige arqueos.anular (403) y el fondo asignado (404)', async () => {
    const { arqueo } = await fondoConFaltante('Caja de los permisos de anular arqueo');
    const sinPermiso: ClienteApi = await crearUsuarioConPermisos(entorno, e.caja.cuenta, {
      nombres: 'Sin',
      apellidos: 'Anular',
      permisos: PERMISOS_PARA_ARQUEAR,
    });
    const sinElFondo = await crearUsuarioConPermisos(entorno, e.caja.cuenta, {
      nombres: 'Anula',
      apellidos: 'Ajeno',
      permisos: [...PERMISOS_PARA_ARQUEAR, 'caja-chica.arqueos.anular'],
    });

    const respuestaSinPermiso = await anularArqueo(arqueo.id, sinPermiso);
    const respuestaSinElFondo = await anularArqueo(arqueo.id, sinElFondo);
    const inexistente = await anularArqueo('00000000-0000-4000-8000-000000000000', e.propietario());

    expect(respuestaSinPermiso.estado).toBe(403);
    expect(respuestaSinElFondo.estado).toBe(404);
    expect(inexistente.estado).toBe(404);
    expect((await arqueoEnBase(arqueo.id)).estado).toBe('vigente');
  });
});
