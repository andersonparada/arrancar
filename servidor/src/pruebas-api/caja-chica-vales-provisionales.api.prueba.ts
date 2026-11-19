/**
 * Vales provisionales (CC-6, §5.5): entregar (monto contra el efectivo, talonario compartido con los vales de gasto),
 * liquidar con documentos y vales de gasto (devuelto, caja cuadrada, todo o nada) y anular con auditoría.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { RUTA_DE_FONDOS } from './soporte/caja-chica-fondos.js';
import { EscenarioDeComprobantes, RUTA_DE_CAJA_CHICA } from './soporte/caja-chica-comprobantes.js';
import {
  AyudasDeVales,
  comprobantesDelVale,
  RUTA_DE_VALES,
  valeEnBase,
} from './soporte/caja-chica-vales-provisionales.js';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';

const entorno = usarEntornoApi();
let e: EscenarioDeComprobantes;
let v: AyudasDeVales;

beforeAll(async () => {
  e = await EscenarioDeComprobantes.preparar(entorno, 'cajachicavales');
  v = new AyudasDeVales(e);
});

describe('entregar un vale', () => {
  it('lo numera con el talonario de los vales de gasto, baja el efectivo esperado y no deja auditoría', async () => {
    const fondo = await v.fondoDe('Caja del vale entregado');
    const gastoMenor = await e.registrarVale(fondo.id);

    const respuesta = await v.entregar(fondo.id);
    const lista = await e.propietario().get(`${RUTA_DE_FONDOS}/${fondo.id}/vales-provisionales`);

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
    expect(respuesta.cuerpo).toMatchObject({
      numero: gastoMenor.cuerpo.comprobantes[0].numero + 1,
      estado: 'abierto',
      monto: '500.00',
      entregadoA: 'Pedro Compras',
      comprobantes: [],
    });
    expect(lista.cuerpo.map((v: any) => v.id)).toEqual([respuesta.cuerpo.id]);
    expect(await v.ficha(fondo.id)).toMatchObject({
      valesAbiertos: '500.00',
      pendienteDeReponer: '50.00',
      efectivoEsperado: '2450.00',
    });
    const auditoria = await comoPropietario(
      "select 1 from core.auditoria where recurso = 'caja-chica.vales-provisionales' and registro_id = $1",
      [respuesta.cuerpo.id],
    );
    expect(auditoria).toEqual([]);
  });

  it('rechaza lo que no alcanza, el monto en cero, la fecha futura y el vale sin a quién entregarlo', async () => {
    const fondo = await v.fondoDe('Caja de los vales malos');

    const grande = await v.entregar(fondo.id, { monto: '3000.01' });
    const cero = await v.entregar(fondo.id, { monto: '0.00' });
    const futura = await v.entregar(fondo.id, { fecha: '2999-01-01' });
    const sinReceptor = await v.entregar(fondo.id, { entregadoA: null });

    expect(grande.estado).toBe(422);
    expect(grande.cuerpo.error.codigo).toBe('vale_mayor_que_el_efectivo');
    expect(cero.cuerpo.error.codigo).toBe('monto_del_comprobante_invalido');
    expect(futura.cuerpo.error.codigo).toBe('fecha_del_vale_invalida');
    expect(sinReceptor.estado).toBe(400);
    expect((await v.ficha(fondo.id)).valesAbiertos).toBe('0.00');
  });

  it('el efectivo esperado también cuenta en el arqueo y el fondo no pasa de lo que queda en la caja', async () => {
    const fondo = await v.fondoDe('Caja del arqueo con vale');
    await v.entregarBien(fondo.id, { monto: '2500.00' });

    const propuesta = await e.propietario().get(`${RUTA_DE_FONDOS}/${fondo.id}/arqueos/propuesta`);
    const otro = await v.entregar(fondo.id, { monto: '500.01' });

    expect(propuesta.cuerpo).toMatchObject({ valesAbiertos: '2500.00', efectivoEsperado: '500.00' });
    expect(otro.cuerpo.error.codigo).toBe('vale_mayor_que_el_efectivo');
  });
});

describe('liquidar un vale', () => {
  it('asigna documentos y vales de gasto, devuelve lo que sobró y la caja cuadra', async () => {
    const fondo = await v.fondoDe('Caja del vale liquidado');
    const vale = await v.entregarBien(fondo.id);
    const { documentoId } = await e.registrarEnElLibro({ total: '300.00' });
    const documento = await e.enLaBandeja(documentoId);

    const respuesta = await v.liquidar(vale.id, {
      documentos: [{ comprobanteId: documento.id }],
      valesDeGasto: [v.gasto()],
    });

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect(respuesta.cuerpo).toMatchObject({ estado: 'liquidado', gastado: '350.00', devuelto: '150.00' });
    expect(respuesta.cuerpo.comprobantes).toHaveLength(2);
    expect(await valeEnBase(vale.id)).toMatchObject({ estado: 'liquidado', devuelto: '150.00' });
    expect(await comprobantesDelVale(vale.id)).toEqual([
      { clase: 'documento', monto: '300.00', fondo_id: fondo.id },
      { clase: 'vale_de_gasto', monto: '50.00', fondo_id: fondo.id },
    ]);
    expect(await v.ficha(fondo.id)).toMatchObject({
      valesAbiertos: '0.00',
      pendienteDeReponer: '350.00',
      efectivoEsperado: '2650.00',
    });
    expect(await e.bandeja()).not.toContainEqual(expect.objectContaining({ id: documento.id }));
  });

  it('si se gastó de más no devuelve nada; sin comprobantes devuelve todo', async () => {
    const fondo = await v.fondoDe('Caja de los vales de más y de menos');
    const corto = await v.entregarBien(fondo.id, { monto: '100.00' });
    const entero = await v.entregarBien(fondo.id, { monto: '200.00' });

    const deMas = await v.liquidar(corto.id, { valesDeGasto: [v.gasto({ monto: '150.00' })] });
    const sinGastos = await v.liquidar(entero.id);

    expect(deMas.estado, JSON.stringify(deMas.cuerpo)).toBe(200);
    expect(deMas.cuerpo).toMatchObject({ devuelto: '0.00', gastado: '150.00' });
    expect(sinGastos.cuerpo).toMatchObject({ devuelto: '200.00', gastado: '0.00' });
    expect(await v.ficha(fondo.id)).toMatchObject({ valesAbiertos: '0.00', efectivoEsperado: '2850.00' });
  });

  it('es todo o nada: si un documento falla, el vale sigue abierto y los demás siguen en la bandeja', async () => {
    const fondo = await v.fondoGrande('Caja de la liquidación fallida');
    const vale = await v.entregarBien(fondo.id);
    const bueno = await e.registrarEnElLibro({ total: '100.00' });
    const conRetencion = await e.registrarEnElLibro({ total: '5600.00' });
    const idBueno = (await e.enLaBandeja(bueno.documentoId)).id;
    const idConRetencion = (await e.enLaBandeja(conRetencion.documentoId)).id;

    const respuesta = await v.liquidar(vale.id, {
      documentos: [{ comprobanteId: idBueno }, { comprobanteId: idConRetencion }],
      valesDeGasto: [v.gasto()],
    });

    expect(respuesta.cuerpo.error.codigo).toBe('motivo_con_retencion_obligatorio');
    expect(await valeEnBase(vale.id)).toMatchObject({ estado: 'abierto', devuelto: '0.00' });
    expect(await comprobantesDelVale(vale.id)).toEqual([]);
    expect(await e.bandeja()).toContainEqual(expect.objectContaining({ id: idBueno }));
    expect((await v.ficha(fondo.id)).valesAbiertos).toBe('500.00');
  });

  it('un documento con retención entra con el permiso y el motivo, y queda quién lo autorizó', async () => {
    const fondo = await v.fondoGrande('Caja del vale con retención');
    const vale = await v.entregarBien(fondo.id, { monto: '6000.00' });
    const { documentoId } = await e.registrarEnElLibro({ total: '5600.00' });
    const id = (await e.enLaBandeja(documentoId)).id;

    const respuesta = await v.liquidar(vale.id, {
      documentos: [{ comprobanteId: id, motivoConRetencion: 'No da otra forma' }],
    });

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect(respuesta.cuerpo.comprobantes[0]).toMatchObject({ conRetencion: true, valeProvisionalId: vale.id });
  });

  it('solo se liquida un vale abierto; la fecha va entre la entrega y hoy', async () => {
    const fondo = await v.fondoDe('Caja del vale liquidado dos veces');
    const vale = await v.entregarBien(fondo.id);

    const antes = await v.liquidar(vale.id, { fecha: '2000-01-01' });
    const futura = await v.liquidar(vale.id, { fecha: '2999-01-01' });
    await v.liquidar(vale.id);
    const otraVez = await v.liquidar(vale.id);

    expect(antes.cuerpo.error.codigo).toBe('fecha_del_vale_invalida');
    expect(futura.cuerpo.error.codigo).toBe('fecha_del_vale_invalida');
    expect(otraVez.estado).toBe(422);
    expect(otraVez.cuerpo.error.codigo).toBe('vale_no_esta_abierto');
  });

  it('un comprobante de un vale no vuelve a la bandeja', async () => {
    const fondo = await v.fondoDe('Caja del comprobante atado');
    const vale = await v.entregarBien(fondo.id);
    const { documentoId } = await e.registrarEnElLibro({ total: '100.00' });
    const id = (await e.enLaBandeja(documentoId)).id;
    await v.liquidar(vale.id, { documentos: [{ comprobanteId: id }] });

    const devolver = await e.propietario().post(`${RUTA_DE_CAJA_CHICA}/comprobantes/${id}/devolver-a-la-bandeja`, {
      motivo: 'Me equivoqué',
    });

    expect(devolver.estado).toBe(422);
    expect(devolver.cuerpo.error.codigo).toBe('comprobante_de_un_vale');
  });
});

describe('anular un vale', () => {
  it('anula un vale abierto, devuelve el efectivo a la caja y audita «anular» con el vale como estaba', async () => {
    const fondo = await v.fondoDe('Caja del vale anulado');
    const vale = await v.entregarBien(fondo.id);

    const respuesta = await e.propietario().post(`${RUTA_DE_VALES}/${vale.id}/anular`, { motivo: 'Ya no se compró' });

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect(respuesta.cuerpo).toMatchObject({ estado: 'anulado', motivoDeAnulacion: 'Ya no se compró' });
    expect(await v.ficha(fondo.id)).toMatchObject({ valesAbiertos: '0.00', efectivoEsperado: '3000.00' });
    const [entrada, ...otras] = await comoPropietario<{ accion: string; motivo: string; anterior: any }>(
      `select accion, motivo, anterior from core.auditoria
        where recurso = 'caja-chica.vales-provisionales' and registro_id = $1`,
      [vale.id],
    );
    expect(otras).toEqual([]);
    expect(entrada).toMatchObject({ accion: 'anular', motivo: 'Ya no se compró' });
    expect(entrada!.anterior).toMatchObject({ id: vale.id, estado: 'abierto', monto: '500.00' });
  });

  it('no anula un vale liquidado ni uno ya anulado', async () => {
    const fondo = await v.fondoDe('Caja de los vales que no se anulan');
    const liquidado = await v.entregarBien(fondo.id, { monto: '100.00' });
    const anulado = await v.entregarBien(fondo.id, { monto: '100.00' });
    await v.liquidar(liquidado.id);
    await e.propietario().post(`${RUTA_DE_VALES}/${anulado.id}/anular`, { motivo: 'Primera vez' });

    const uno = await e.propietario().post(`${RUTA_DE_VALES}/${liquidado.id}/anular`, { motivo: 'x' });
    const otro = await e.propietario().post(`${RUTA_DE_VALES}/${anulado.id}/anular`, { motivo: 'x' });
    const sinMotivo = await e.propietario().post(`${RUTA_DE_VALES}/${anulado.id}/anular`, {});

    expect(uno.cuerpo.error.codigo).toBe('vale_no_esta_abierto');
    expect(otro.cuerpo.error.codigo).toBe('vale_no_esta_abierto');
    expect(sinMotivo.estado).toBe(400);
  });
});
