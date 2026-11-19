/** IC-5: vista previa, primera impresión (uno y lote), reimpresión, historia y bloqueo del blanqueo. */
import { beforeAll, describe, expect, it } from 'vitest';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { EscenarioDeCheques } from './soporte/escenario-de-impresion-de-cheques.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';
import { auditoriaDe } from './soporte/ordenes-de-bancos.js';

const entorno = usarEntornoApi();
const IMPRESION = '/api/bancos/cheques/impresion';
let e: EscenarioDeCheques;
let sinFormato: EscenarioDeCheques;

const asignarPlantilla = (escenario: EscenarioDeCheques, chequeraId = escenario.chequeraId) =>
  escenario.propietario.patch(`/api/bancos/chequeras/${chequeraId}/formato`, {
    formatoDeChequeId: null,
    plantillaDeCheque: 'cheque_suelto',
  });
const imprimir = (ids: string[], escenario = e) =>
  escenario.propietario.post('/api/bancos/cheques/impresiones', { ids });
const reimprimir = (id: string, cuerpo: Record<string, unknown>) =>
  e.propietario.post(`/api/bancos/cheques/${id}/reimpresiones`, cuerpo);
const campo = (cheque: { cheque: { campos: Array<{ clave: string; texto: string }> } }, clave: string) =>
  cheque.cheque.campos.find((c) => c.clave === clave)!;

beforeAll(async () => {
  e = await EscenarioDeCheques.preparar(entorno, 'icimprimir');
  await asignarPlantilla(e);
  sinFormato = await EscenarioDeCheques.preparar(entorno, 'icsinformato');
});

describe('la vista previa', () => {
  it('arma el cheque y el comprobante sin marcar nada', async () => {
    const { chequeId } = await e.emitir(1, { paraAbonoEnCuenta: true, monto: '150.00' });

    const vista = await e.propietario.get(`${IMPRESION}?ids=${chequeId}`);

    expect(vista.estado, JSON.stringify(vista.cuerpo)).toBe(200);
    const [cheque] = vista.cuerpo.cheques;
    expect(cheque).toMatchObject({ chequeId, numero: 1, impreso: false });
    expect(campo(cheque, 'beneficiario').texto).toMatch(/^Juan Pérez López\*+$/i);
    expect(campo(cheque, 'montoEnNumeros').texto).toMatch(/^Q\*+150\.00$/);
    expect(campo(cheque, 'montoEnLetras').texto).toMatch(/^CIENTO CINCUENTA QUETZALES CON 00\/100\*+$/);
    expect(campo(cheque, 'noNegociable').texto).toBe('NO NEGOCIABLE');
    expect(campo(cheque, 'paraAbonoEnCuenta').texto).toBe('PARA ABONO EN CUENTA');
    expect(cheque.comprobante).toMatchObject({
      titulo: 'Comprobante de egreso',
      esReimpresion: false,
      origen: null,
      aplicacionContable: { renglonesEnBlanco: 5 },
      leyenda: 'Documento interno de control; no es un documento tributario.',
    });
    expect(cheque.comprobante.firmas.map((f: { rotulo: string }) => f.rotulo)).toEqual([
      'Elaboró',
      'Revisó',
      'Autorizó',
      'Recibí conforme',
    ]);
    expect(cheque.comprobante.firmas[0].nombre).toBeTruthy();
    expect(cheque.avisos.join(' ')).toContain('prueba de alineación');
    const [fila] = await comoPropietario<{ impreso_en: Date | null }>(
      'select impreso_en from bancos.cheques where id = $1',
      [chequeId],
    );
    expect(fila!.impreso_en).toBeNull();
  });

  it('un cheque disponible, anulado o de otra empresa no se puede ver para imprimir', async () => {
    const disponible = await e.chequeDe(30);
    const anulado = (await e.emitir(31)).chequeId;
    await e.propietario.post(`/api/bancos/cheques/${anulado}/anular`, { motivo: 'Error' });

    const respuestaDisponible = await e.propietario.get(`${IMPRESION}?ids=${disponible}`);
    const respuestaAnulado = await e.propietario.get(`${IMPRESION}?ids=${anulado}`);
    const ajeno = await sinFormato.propietario.get(`${IMPRESION}?ids=${disponible}`);

    expect([respuestaDisponible.estado, respuestaAnulado.estado]).toEqual([422, 422]);
    expect(respuestaDisponible.cuerpo.error.codigo).toBe('cheque_no_imprimible');
    expect(ajeno.estado).toBe(404);
  });

  it('una chequera sin formato avisa que no se puede imprimir', async () => {
    const { chequeId } = await sinFormato.emitir(1);

    const vista = await sinFormato.propietario.get(`${IMPRESION}?ids=${chequeId}`);

    expect(vista.estado).toBe(422);
    expect(vista.cuerpo.error.codigo).toBe('chequera_sin_formato_de_impresion');
  });
});

describe('la primera impresión', () => {
  it('marca el cheque, guarda la impresión original con el formato y bloquea el blanqueo', async () => {
    const { chequeId, movimientoId } = await e.emitir(2);
    const antes = (await e.propietario.get('/api/bancos/cheques')).cuerpo.find(
      (c: { id: string }) => c.id === chequeId,
    );
    expect(antes).toMatchObject({ chequeraId: e.chequeraId, puedeImprimir: true, puedeReimprimir: false });

    const impresa = await imprimir([chequeId]);

    expect(impresa.estado, JSON.stringify(impresa.cuerpo)).toBe(200);
    expect(impresa.cuerpo.cheques[0]).toMatchObject({ impreso: true, comprobante: { esReimpresion: false } });
    const historial = await e.propietario.get(`/api/bancos/cheques/${chequeId}/impresiones`);
    expect(historial.cuerpo).toHaveLength(1);
    expect(historial.cuerpo[0]).toMatchObject({ tipo: 'original', conCheque: true, motivo: null });
    expect(historial.cuerpo[0].impresoPorNombre).toBeTruthy();
    const [guardada] = await comoPropietario<{ formato: { papel: { anchoMm: number } }; movimiento_id: string }>(
      'select formato, movimiento_id from bancos.impresiones_de_cheques where cheque_id = $1',
      [chequeId],
    );
    expect(guardada).toMatchObject({ movimiento_id: movimientoId, formato: { papel: { anchoMm: 175 } } });

    const cheque = (await e.propietario.get(`/api/bancos/chequeras/${e.chequeraId}/cheques`)).cuerpo.find(
      (c: { id: string }) => c.id === chequeId,
    );
    expect(cheque).toMatchObject({
      puedeBlanquear: false,
      puedeImprimir: false,
      puedeReimprimir: true,
      puedePasarAOtroFormulario: true,
    });
    expect(cheque.impresoEn).not.toBeNull();
    const blanqueo = await e.propietario.post(`/api/bancos/cheques/${chequeId}/blanquear`, { motivo: 'Error' });
    expect(blanqueo.estado).toBe(422);
    expect(blanqueo.cuerpo.error.codigo).toBe('cheque_impreso_no_se_blanquea');
  });

  it('un cheque impreso no se imprime otra vez: se reimprime', async () => {
    const { chequeId } = await e.emitir(3);
    await imprimir([chequeId]);

    const otra = await imprimir([chequeId]);

    expect(otra.estado).toBe(422);
    expect(otra.cuerpo.error.codigo).toBe('cheque_ya_impreso');
  });

  it('un cheque de la carga inicial no se imprime', async () => {
    const chequeraId = await e.crearChequera(901, 905, 'AP');
    const { chequeId } = await e.emitir(901, {}, chequeraId);
    await comoPropietario(
      'update bancos.chequeras set de_apertura = true, activa = false, plantilla_de_cheque = null where id = $1',
      [chequeraId],
    );

    const respuesta = await imprimir([chequeId]);

    expect(respuesta.estado).toBe(422);
    expect(respuesta.cuerpo.error.codigo).toBe('cheque_no_imprimible');
  });

  it('dos personas imprimiendo a la vez: gana una y la otra no duplica el original', async () => {
    const { chequeId } = await e.emitir(4);

    const [una, otra] = await Promise.all([imprimir([chequeId]), imprimir([chequeId])]);

    const estados = [una.estado, otra.estado];
    expect(estados.filter((estado) => estado === 200)).toHaveLength(1);
    expect(estados.find((estado) => estado !== 200)).toBeGreaterThanOrEqual(409);
    const originales = await comoPropietario(
      `select 1 from bancos.impresiones_de_cheques where cheque_id = $1 and tipo = 'original'`,
      [chequeId],
    );
    expect(originales).toHaveLength(1);
  });

  it('sin el permiso de imprimir es 403, aunque pueda ver', async () => {
    const { chequeId } = await e.emitir(5);
    const mira = await crearUsuarioConPermisos(entorno, e.cuenta, {
      nombres: 'Mira',
      apellidos: 'Cheques',
      permisos: ['bancos.cheques.ver'],
    });

    expect((await mira.get(`${IMPRESION}?ids=${chequeId}`)).estado).toBe(200);
    expect((await mira.post('/api/bancos/cheques/impresiones', { ids: [chequeId] })).estado).toBe(403);
    expect((await mira.get(`/api/bancos/cheques/${chequeId}/impresiones`)).estado).toBe(200);
    const sin = await crearUsuarioConPermisos(entorno, e.cuenta, {
      nombres: 'Sin',
      apellidos: 'Cheques',
      permisos: [],
    });
    expect((await sin.get(`${IMPRESION}?ids=${chequeId}`)).estado).toBe(403);
    expect((await sin.get(`/api/bancos/cheques/${chequeId}/impresiones`)).estado).toBe(403);
  });
});

describe('el lote', () => {
  it('con un hueco avisa antes, imprime todo o nada y los junta con un mismo lote', async () => {
    const chequera = await e.crearChequera(100, 120, 'LO');
    const ids = [(await e.emitir(100, {}, chequera)).chequeId, (await e.emitir(101, {}, chequera)).chequeId];
    ids.push((await e.emitir(104, {}, chequera)).chequeId);

    const vista = await e.propietario.get(`${IMPRESION}?ids=${ids.join(',')}`);
    const impresa = await imprimir(ids);

    expect(vista.cuerpo.avisos).toEqual(['Entre el 101 y el 104 faltan los cheques 102 a 103: el papel va en orden.']);
    expect(impresa.cuerpo.cheques.map((c: { numero: number }) => c.numero)).toEqual([100, 101, 104]);
    const lotes = await comoPropietario<{ lote_id: string }>(
      'select lote_id from bancos.impresiones_de_cheques where cheque_id = any($1)',
      [ids],
    );
    expect(new Set(lotes.map((l) => l.lote_id)).size).toBe(1);
    expect(lotes[0]!.lote_id).toBeTruthy();
  });

  it('si uno no sirve, ninguno se imprime; dos chequeras, más de 50 y cheques repetidos se rechazan', async () => {
    const chequera = await e.crearChequera(200, 210, 'T0');
    const bueno = (await e.emitir(200, {}, chequera)).chequeId;
    const disponible = await e.chequeDe(201, chequera);
    const deOtraChequera = (await e.emitir(10)).chequeId;

    const conDisponible = await imprimir([bueno, disponible]);
    const dosChequeras = await imprimir([bueno, deOtraChequera]);
    const muchos = await imprimir(Array.from({ length: 51 }, () => crypto.randomUUID()));

    expect(conDisponible.estado).toBe(422);
    expect(dosChequeras.estado).toBe(400);
    expect(dosChequeras.cuerpo.error.codigo).toBe('lote_de_cheques_invalido');
    expect(muchos.estado).toBe(400);
    const impresos = await comoPropietario('select 1 from bancos.impresiones_de_cheques where cheque_id = $1', [bueno]);
    expect(impresos).toHaveLength(0);
  });
});

describe('reimprimir', () => {
  it('pide motivo, guarda la copia, marca «REIMPRESIÓN» y deja auditoría', async () => {
    const { chequeId } = await e.emitir(6);
    await imprimir([chequeId]);

    const sinMotivo = await reimprimir(chequeId, { motivo: '  ' });
    const conCheque = await reimprimir(chequeId, { motivo: 'Se atascó el papel', conCheque: true });
    const soloComprobante = await reimprimir(chequeId, { motivo: 'Otra copia para el archivo' });

    expect(sinMotivo.estado).toBe(400);
    expect(conCheque.cuerpo).toMatchObject({ comprobante: { esReimpresion: true } });
    expect(conCheque.cuerpo.cheque.campos.length).toBeGreaterThan(3);
    expect(soloComprobante.cuerpo.cheque).toBeNull();
    const historial = await e.propietario.get(`/api/bancos/cheques/${chequeId}/impresiones`);
    expect(
      historial.cuerpo.map((i: { tipo: string; conCheque: boolean; motivo: string | null }) => [
        i.tipo,
        i.conCheque,
        i.motivo,
      ]),
    ).toEqual([
      ['original', true, null],
      ['reimpresion', true, 'Se atascó el papel'],
      ['reimpresion', false, 'Otra copia para el archivo'],
    ]);
    const auditoria = (await auditoriaDe(chequeId)).filter((a) => a.accion === 'reimprimir');
    expect(auditoria.map((a) => a.motivo)).toEqual(['Se atascó el papel', 'Otra copia para el archivo']);
  });

  it('uno sin imprimir no se reimprime, y hace falta su propio permiso', async () => {
    const { chequeId } = await e.emitir(7);
    const sinImprimir = await reimprimir(chequeId, { motivo: 'Prueba' });
    await imprimir([chequeId]);
    const imprime = await crearUsuarioConPermisos(entorno, e.cuenta, {
      nombres: 'Imprime',
      apellidos: 'Cheques',
      permisos: ['bancos.cheques.ver', 'bancos.cheques.imprimir'],
    });
    const reimprime = await crearUsuarioConPermisos(entorno, e.cuenta, {
      nombres: 'Reimprime',
      apellidos: 'Cheques',
      permisos: ['bancos.cheques.ver', 'bancos.cheques.reimprimir'],
    });
    const url = `/api/bancos/cheques/${chequeId}/reimpresiones`;

    expect(sinImprimir.estado).toBe(422);
    expect(sinImprimir.cuerpo.error.codigo).toBe('cheque_sin_imprimir_no_se_reimprime');
    expect((await imprime.post(url, { motivo: 'X' })).estado).toBe(403);
    expect((await reimprime.post(url, { motivo: 'Copia' })).estado).toBe(200);
  });
});
