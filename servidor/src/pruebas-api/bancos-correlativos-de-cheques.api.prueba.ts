/** IC-7: el reporte de correlativos de cheques de una chequera, su Excel y sus permisos. */
import { beforeAll, describe, expect, it } from 'vitest';
import { filasDeExcel } from './soporte/apertura-por-api.js';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { EscenarioDeCheques } from './soporte/escenario-de-impresion-de-cheques.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
let e: EscenarioDeCheques;
let chequeraId = '';

const reporte = (filtro = '', id = chequeraId) =>
  e.propietario.get(`/api/bancos/chequeras/${id}/correlativos${filtro}`);

beforeAll(async () => {
  e = await EscenarioDeCheques.preparar(entorno, 'iccorrelativos');
  chequeraId = await e.crearChequera(1, 10, 'CO');
  await e.propietario.patch(`/api/bancos/chequeras/${chequeraId}/formato`, {
    formatoDeChequeId: null,
    plantillaDeCheque: 'cheque_suelto',
  });
  const emitir = (numero: number) => e.emitir(numero, {}, chequeraId);
  const imprimido = await emitir(1);
  await e.propietario.post('/api/bancos/cheques/impresiones', { ids: [imprimido.chequeId] });
  await e.propietario.post(`/api/bancos/cheques/${imprimido.chequeId}/cambiar-formulario`, {
    chequeDestinoId: await e.chequeDe(2, chequeraId),
    motivo: 'Se arrugó',
    enCustodia: true,
    papelConservado: true,
  });
  await e.propietario.post(`/api/bancos/cheques/${(await emitir(3)).chequeId}/anular`, { motivo: 'Error' });
  await e.propietario.post(`/api/bancos/cheques/${(await emitir(4)).chequeId}/anular`, {
    motivo: 'Se perdió',
    causa: 'extraviado',
  });
  await emitir(5);
});

describe('el reporte', () => {
  it('trae todos los números, el resumen que cuadra y a qué número pasó el inutilizado', async () => {
    const { estado, cuerpo } = await reporte();

    expect(estado).toBe(200);
    expect(cuerpo.chequera).toMatchObject({ serie: 'CO', desde: 1, hasta: 10, deApertura: false, etiqueta: null });
    expect(cuerpo.cuenta.nombre).toBeTruthy();
    expect(cuerpo.resumen).toEqual({
      emitidos: 2,
      anulados: { total: 2, manual: 1, caducidad: 0, extraviado: 1 },
      inutilizados: 1,
      disponibles: 5,
      totalDelRango: 10,
      alerta: null,
    });
    expect(cuerpo.cheques.map((c: { numero: number }) => c.numero)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const porNumero = (n: number) => cuerpo.cheques.find((c: { numero: number }) => c.numero === n);
    expect(porNumero(1)).toMatchObject({ estado: 'inutilizado', pasoAlNumero: 2, impreso: true });
    expect(porNumero(1).impresoEn).toBeTruthy();
    expect(porNumero(2)).toMatchObject({ estado: 'emitido', impreso: false, beneficiario: 'Juan Pérez López' });
    expect(porNumero(3)).toMatchObject({ estado: 'anulado', causa: 'manual', motivoDeAnulacion: 'Error' });
    expect(porNumero(4)).toMatchObject({ estado: 'anulado', causa: 'extraviado' });
    expect(porNumero(6)).toMatchObject({ estado: 'disponible', monto: null });
    expect(cuerpo.conteoFisico).toMatchObject({ disponiblesSegunElSistema: 5 });
    expect(cuerpo.conteoFisico.nota).toContain('alguien distinto de quien emite');
  });

  it('el filtro por estado recorta el detalle y el orden es por número', async () => {
    const { cuerpo } = await reporte('?estado=anulado');

    expect(cuerpo.cheques.map((c: { numero: number }) => c.numero)).toEqual([3, 4]);
    expect(cuerpo.resumen.totalDelRango).toBe(10);
    expect((await reporte('?estado=otro')).estado).toBe(400);
  });

  it('un número del rango sin fila da alerta y no cuadra', async () => {
    const otra = await e.crearChequera(500, 504, 'AL');
    await comoPropietario('delete from bancos.cheques where chequera_id = $1 and numero = 502', [otra]);

    const { cuerpo } = await reporte('', otra);

    expect(cuerpo.resumen.alerta).toBe('Alerta: no hay cheque registrado para el número 502.');
    expect(cuerpo.cheques.find((c: { numero: number }) => c.numero === 502)).toMatchObject({ estado: 'sin_registro' });
    expect(cuerpo.resumen.disponibles + 1).toBe(cuerpo.resumen.totalDelRango);
  });

  it('una chequera de la carga inicial sale con su etiqueta y solo con sus cheques', async () => {
    const deApertura = await e.crearChequera(700, 710, 'AP');
    await e.emitir(703, {}, deApertura);
    await comoPropietario('delete from bancos.cheques where chequera_id = $1 and numero <> 703', [deApertura]);
    await comoPropietario(
      'update bancos.chequeras set de_apertura = true, activa = false, plantilla_de_cheque = null, formato_de_cheque_id = null where id = $1',
      [deApertura],
    );

    const { cuerpo } = await reporte('', deApertura);

    expect(cuerpo.chequera).toMatchObject({ deApertura: true, etiqueta: 'De la carga inicial' });
    expect(cuerpo.cheques.map((c: { numero: number }) => c.numero)).toEqual([703]);
    expect(cuerpo.resumen).toMatchObject({ emitidos: 1, totalDelRango: 1, alerta: null });
  });

  it('una chequera de otra empresa no se encuentra', async () => {
    const otraEmpresa = await EscenarioDeCheques.preparar(entorno, 'iccorrelativosotra');

    const { estado } = await otraEmpresa.propietario.get(`/api/bancos/chequeras/${chequeraId}/correlativos`);

    expect(estado).toBe(404);
  });
});

describe('el Excel y los permisos', () => {
  it('exporta los números con su estado y, al final, el resumen', async () => {
    const respuesta = await e.propietario.get(`/api/bancos/chequeras/${chequeraId}/correlativos/exportar`);
    expect(respuesta.estado).toBe(200);

    const filas = await filasDeExcel(respuesta.cuerpo as Buffer);

    expect(filas[0]).toEqual(expect.arrayContaining(['Número', 'Estado', 'Causa', 'Pasó al número']));
    const texto = JSON.stringify(filas);
    expect(texto).toContain('Inutilizado');
    expect(texto).toContain('Extraviado');
    expect(texto).toContain('Total del rango');
    const filtrado = await e.propietario.get(
      `/api/bancos/chequeras/${chequeraId}/correlativos/exportar?estado=disponible`,
    );
    const soloDisponibles = await filasDeExcel(filtrado.cuerpo as Buffer);
    expect(soloDisponibles[1]).toEqual([6, 'Disponible']);
    expect(soloDisponibles.filter((fila) => fila[1] === 'Emitido')).toEqual([]);
  });

  it('ver y exportar piden cada uno su permiso', async () => {
    const mira = await crearUsuarioConPermisos(entorno, e.cuenta, {
      nombres: 'Mira',
      apellidos: 'Correlativos',
      permisos: ['bancos.correlativos-de-cheques.ver'],
    });
    const baja = await crearUsuarioConPermisos(entorno, e.cuenta, {
      nombres: 'Baja',
      apellidos: 'Correlativos',
      permisos: ['bancos.correlativos-de-cheques.exportar'],
    });
    const url = `/api/bancos/chequeras/${chequeraId}/correlativos`;

    expect((await mira.get(url)).estado).toBe(200);
    expect((await mira.get(`${url}/exportar`)).estado).toBe(403);
    expect((await baja.get(url)).estado).toBe(403);
    expect((await baja.get(`${url}/exportar`)).estado).toBe(200);
  });
});
