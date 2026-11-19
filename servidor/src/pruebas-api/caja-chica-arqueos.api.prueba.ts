/**
 * Arqueos (CC-5, §5.7): la propuesta de lo esperado, registrar sin diferencia, con faltante (pérdida o cobro al custodio) y
 * con sobrante, el motivo y el destino obligatorios, la auditoría «ajustar», el faltante que se repone en Bancos, los
 * permisos y el fondo a la vista, el aviso «sin arqueo» y la separación de funciones.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import { RUTA_DE_FONDOS } from './soporte/caja-chica-fondos.js';
import {
  ajusteDelArqueoEnBase,
  arquear,
  arqueoEnBase,
  auditoriaDelArqueo,
  ducientos,
  PERMISOS_PARA_ARQUEAR,
} from './soporte/caja-chica-arqueos.js';
import { EscenarioDeComprobantes, usuarioIdDe } from './soporte/caja-chica-comprobantes.js';
import { conceptosEnBancos, reponerBien } from './soporte/caja-chica-reposiciones.js';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
let e: EscenarioDeComprobantes;
let sinPermiso: ClienteApi;

const fondoDe = async (nombre: string) => e.abrirFondo(nombre, { monto: '3000.00' });
const ficha = async (fondoId: string) => (await e.propietario().get(`${RUTA_DE_FONDOS}/${fondoId}`)).cuerpo;
const faltante = { motivoDeDiferencia: 'Se perdió un billete', destinoDelFaltante: 'perdida' };

beforeAll(async () => {
  e = await EscenarioDeComprobantes.preparar(entorno, 'cajachicaarqueos');
  sinPermiso = await crearUsuarioConPermisos(entorno, e.caja.cuenta, {
    nombres: 'Sin',
    apellidos: 'Arqueo',
    permisos: ['caja-chica.fondos.ver'],
  });
});

describe('la propuesta y el arqueo sin diferencia', () => {
  it('la propuesta dice lo esperado; el arqueo cuadrado no crea comprobante ni deja auditoría', async () => {
    const fondo = await fondoDe('Caja del arqueo cuadrado');
    await e.registrarVale(fondo.id);

    const propuesta = await e.propietario().get(`${RUTA_DE_FONDOS}/${fondo.id}/arqueos/propuesta`);
    const respuesta = await arquear(fondo.id, e.propietario(), {
      conteo: [...ducientos(14), { denominacionCentavos: 5_000, cantidad: 3 }],
    });

    expect(propuesta.cuerpo).toMatchObject({
      monto: '3000.00',
      pendienteDeReponer: '50.00',
      efectivoEsperado: '2950.00',
      avisos: [],
    });
    expect(propuesta.cuerpo.denominaciones[0]).toBe('200.00');
    expect(propuesta.cuerpo.pendientes).toHaveLength(1);
    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
    expect(respuesta.cuerpo).toMatchObject({
      numero: 1,
      diferencia: '0.00',
      efectivoContado: '2950.00',
      comprobante: null,
    });
    expect(await arqueoEnBase(respuesta.cuerpo.id)).toMatchObject({ estado: 'vigente', diferencia: '0.00' });
    expect(await ajusteDelArqueoEnBase(respuesta.cuerpo.id)).toBeUndefined();
    expect(await auditoriaDelArqueo(respuesta.cuerpo.id)).toEqual([]);
  });

  it('numera por empresa y la lista del fondo trae el más reciente primero; el acta se abre por su id', async () => {
    const fondo = await fondoDe('Caja de dos arqueos');
    const primero = (await arquear(fondo.id, e.propietario())).cuerpo;
    const segundo = (await arquear(fondo.id, e.propietario())).cuerpo;

    const lista = await e.propietario().get(`${RUTA_DE_FONDOS}/${fondo.id}/arqueos`);
    const acta = await e.propietario().get(`/api/caja-chica/arqueos/${segundo.id}`);

    expect(segundo.numero).toBe(primero.numero + 1);
    expect(lista.cuerpo.map((a: any) => a.id)).toEqual([segundo.id, primero.id]);
    expect(acta.cuerpo).toMatchObject({
      id: segundo.id,
      conteo: [{ denominacion: '200.00', cantidad: 15, subtotal: '3000.00' }],
    });
    expect((await ficha(fondo.id)).ultimoArqueo).not.toBeNull();
  });
});

describe('con diferencia', () => {
  it('un faltante crea el comprobante, sube lo pendiente y audita «ajustar» con el fondo como estaba', async () => {
    const fondo = await fondoDe('Caja del faltante');

    const respuesta = await arquear(fondo.id, e.propietario(), { conteo: ducientos(14), ...faltante });

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
    expect(respuesta.cuerpo).toMatchObject({ diferencia: '-200.00', destinoDelFaltante: 'perdida' });
    expect(await ajusteDelArqueoEnBase(respuesta.cuerpo.id)).toMatchObject({
      clase: 'faltante',
      monto: '200.00',
      resta: false,
      destino_del_faltante: 'perdida',
      fondo_id: fondo.id,
    });
    expect((await ficha(fondo.id)).efectivoEsperado).toBe('2800.00');
    const [entrada, ...otras] = await auditoriaDelArqueo(respuesta.cuerpo.id);
    expect(otras).toEqual([]);
    expect(entrada).toMatchObject({ accion: 'ajustar', motivo: 'Se perdió un billete' });
    expect(entrada!.anterior).toMatchObject({ id: fondo.id, efectivoEsperado: '3000.00', pendienteDeReponer: '0.00' });
  });

  it('un sobrante crea el comprobante que resta, sin destino', async () => {
    const fondo = await fondoDe('Caja del sobrante');

    const respuesta = await arquear(fondo.id, e.propietario(), {
      conteo: ducientos(16),
      motivoDeDiferencia: 'Sobró un billete',
    });

    expect(respuesta.cuerpo).toMatchObject({ diferencia: '200.00', destinoDelFaltante: null });
    expect(await ajusteDelArqueoEnBase(respuesta.cuerpo.id)).toMatchObject({
      clase: 'sobrante',
      resta: true,
      monto: '200.00',
    });
    expect((await ficha(fondo.id)).efectivoEsperado).toBe('3200.00');
  });

  it('los cheques de reposición sin cambiar compensan lo contado', async () => {
    const fondo = await fondoDe('Caja del cheque por cambiar');

    const respuesta = await arquear(fondo.id, e.propietario(), { conteo: ducientos(14), valoresPorCambiar: '200.00' });

    expect(respuesta.cuerpo).toMatchObject({ diferencia: '0.00', valoresPorCambiar: '200.00' });
  });

  it('exige el motivo y el destino del faltante y no guarda lo que no aplica', async () => {
    const fondo = await fondoDe('Caja de las explicaciones');
    const conteo = ducientos(14);

    const sinMotivo = await arquear(fondo.id, e.propietario(), { conteo });
    const sinDestino = await arquear(fondo.id, e.propietario(), { conteo, motivoDeDiferencia: 'Faltó' });
    const motivoSobrante = await arquear(fondo.id, e.propietario(), { motivoDeDiferencia: 'No hay diferencia' });
    const destinoSobrante = await arquear(fondo.id, e.propietario(), {
      conteo: ducientos(16),
      motivoDeDiferencia: 'x',
      destinoDelFaltante: 'perdida',
    });

    expect(sinMotivo.cuerpo.error.codigo).toBe('motivo_de_diferencia_obligatorio');
    expect(sinDestino.cuerpo.error.codigo).toBe('destino_del_faltante_obligatorio');
    expect(motivoSobrante.cuerpo.error.codigo).toBe('dato_de_diferencia_que_no_aplica');
    expect(destinoSobrante.cuerpo.error.codigo).toBe('dato_de_diferencia_que_no_aplica');
    expect(sinMotivo.estado).toBe(400);
    expect((await e.propietario().get(`${RUTA_DE_FONDOS}/${fondo.id}/arqueos`)).cuerpo).toEqual([]);
  });

  it('el faltante entra a la reposición con el concepto «faltante de efectivo» en Bancos', async () => {
    const fondo = await fondoDe('Caja del faltante repuesto');
    const arqueo = (await arquear(fondo.id, e.propietario(), { conteo: ducientos(14), ...faltante })).cuerpo;

    const reposicion = await reponerBien(e, { fondoId: fondo.id, ids: [arqueo.comprobante.id] });

    expect(reposicion.monto).toBe('200.00');
    expect(await conceptosEnBancos(reposicion.movimientoId)).toEqual([
      { clave: 'faltante_de_efectivo', monto: '200.00' },
    ]);
  });
});

describe('validaciones, permisos y fondo a la vista', () => {
  it('rechaza un conteo con denominación inexistente, repetida o futura (400)', async () => {
    const fondo = await fondoDe('Caja de los datos malos');
    const rara = await arquear(fondo.id, e.propietario(), { conteo: [{ denominacionCentavos: 3_000, cantidad: 1 }] });
    const repetida = await arquear(fondo.id, e.propietario(), { conteo: [...ducientos(1), ...ducientos(2)] });
    const futura = await arquear(fondo.id, e.propietario(), { realizadoEn: '2999-01-01T10:00:00-06:00' });
    const sinCompletos = await e.propietario().post(`${RUTA_DE_FONDOS}/${fondo.id}/arqueos`, { conteo: ducientos(1) });

    expect(rara.cuerpo.error.codigo).toBe('conteo_invalido');
    expect(repetida.cuerpo.error.codigo).toBe('conteo_invalido');
    expect(futura.cuerpo.error.codigo).toBe('fecha_del_arqueo_invalida');
    expect(sinCompletos.estado).toBe(400);
  });

  it('exige arqueos.crear (403) y el fondo asignado (404)', async () => {
    const fondo = await fondoDe('Caja de los permisos de arquear');
    const arqueador = await crearUsuarioConPermisos(entorno, e.caja.cuenta, {
      nombres: 'Arqueador',
      apellidos: 'Ajeno',
      permisos: PERMISOS_PARA_ARQUEAR,
    });

    const sinElPermiso = await arquear(fondo.id, sinPermiso);
    const sinElFondo = await arquear(fondo.id, arqueador);
    const propuestaSinPermiso = await sinPermiso.get(`${RUTA_DE_FONDOS}/${fondo.id}/arqueos/propuesta`);

    expect(sinElPermiso.estado).toBe(403);
    expect(sinElFondo.estado).toBe(404);
    expect(propuestaSinPermiso.estado).toBe(403);
  });
});

describe('avisos y separación de funciones', () => {
  it('un fondo viejo sin arquear avisa en la ficha y la propuesta; arquear quita el aviso', async () => {
    const fondo = await fondoDe('Caja que lleva meses sin arqueo');
    await comoPropietario('update caja_chica.fondos set fecha_de_apertura = $2 where id = $1', [
      fondo.id,
      '2025-01-01',
    ]);

    const antes = await ficha(fondo.id);
    const propuesta = await e.propietario().get(`${RUTA_DE_FONDOS}/${fondo.id}/arqueos/propuesta`);
    await arquear(fondo.id, e.propietario());
    const despues = await ficha(fondo.id);

    expect(antes.avisos).toEqual([expect.stringContaining('sin arquearse')]);
    expect(propuesta.cuerpo.avisos).toHaveLength(1);
    expect(despues.avisos).toEqual([]);
  });

  it('el custodio que arquea su fondo deja constancia y recibe el aviso', async () => {
    const custodio = await crearUsuarioConPermisos(entorno, e.caja.cuenta, {
      nombres: 'Custodio',
      apellidos: 'Arquea',
      permisos: PERMISOS_PARA_ARQUEAR,
    });
    const fondo = await e.abrirFondo('Caja del custodio que arquea', {
      monto: '3000.00',
      custodio: null,
      custodioUsuarioId: await usuarioIdDe(e.caja.cuenta.empresaId, 'Custodio'),
    });

    const respuesta = await arquear(fondo.id, custodio);

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
    expect(respuesta.cuerpo.loHizoElCustodio).toBe(true);
    expect(respuesta.cuerpo.avisos).toEqual([expect.stringContaining('custodio')]);
    expect(await arqueoEnBase(respuesta.cuerpo.id)).toMatchObject({ lo_hizo_el_custodio: true });
  });
});
