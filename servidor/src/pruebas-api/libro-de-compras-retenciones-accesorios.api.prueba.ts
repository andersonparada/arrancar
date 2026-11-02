import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { consultar, HOY } from './soporte/escenario-de-documentos.js';
import {
  FECHA_VIEJA,
  MES_VIEJO,
  prepararRetenciones,
  reporteDelMes,
  RUTA_RETENCIONES,
  type EscenarioDeRetenciones,
} from './soporte/escenario-de-retenciones.js';

const entorno = usarEntornoApi();
const RUTA = `${RUTA_RETENCIONES}/enteros`;
let e: EscenarioDeRetenciones;

const fechasViejas = { fechaEmision: FECHA_VIEJA, fechaRecepcion: FECHA_VIEJA };
const enterar = (cambios: Record<string, unknown> = {}) =>
  e.propietario.post(RUTA, {
    mes: MES_VIEJO.slice(0, 7),
    grupo: 'iva_agentes',
    fechaDePago: HOY,
    documentoDePago: 'SAT2000-1',
    impuesto: '180.00',
    ...cambios,
  });
const grupoDelMes = async () =>
  (await reporteDelMes(e.propietario, MES_VIEJO)).grupos.find((g: { grupo: string }) => g.grupo === 'iva_agentes');
const anular = (id: string) => e.propietario.post(`${RUTA}/${id}/anular`, { motivo: 'Prueba' });

beforeAll(async () => {
  e = await prepararRetenciones(entorno, 'retencionesaccesorios');
  await e.registrar(e.escenario.proveedorId, fechasViejas);
  await e.registrar(e.escenario.proveedorId, fechasViejas);
});

afterAll(() => vi.restoreAllMocks());

describe('enteros: multa, intereses y mora', () => {
  let pagoId: string;

  it('retenido 180 y un pago de 180 con multa 50 queda enterado, con el total de la boleta y sin aviso de exceso', async () => {
    const respuesta = await enterar({ multa: '50.00' });

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
    pagoId = respuesta.cuerpo.entero.id;
    expect(respuesta.cuerpo.entero).toMatchObject({
      impuesto: '180.00',
      multa: '50.00',
      intereses: '0.00',
      mora: '0.00',
      total: '230.00',
      retenidoAlMarcar: '180.00',
    });
    expect(respuesta.cuerpo.entero).not.toHaveProperty('monto');
    expect(respuesta.cuerpo.avisos).toEqual([]);
    expect(await grupoDelMes()).toMatchObject({
      estado: 'enterado',
      pagado: '180.00',
      accesorios: '50.00',
      diferencia: '0.00',
    });
  });

  it('corregir quitando la multa la deja en cero (el cuerpo reemplaza todo) y audita el pago anterior con su multa', async () => {
    const respuesta = await e.propietario.put(`${RUTA}/${pagoId}`, {
      fechaDePago: HOY,
      documentoDePago: 'SAT2000-1',
      impuesto: '180.00',
      intereses: '5.10',
    });

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect(respuesta.cuerpo.entero).toMatchObject({ multa: '0.00', intereses: '5.10', mora: '0.00', total: '185.10' });
    const [auditada] = await consultar<{ anterior: { multa: string; total: string } }>(
      "select anterior from core.auditoria where recurso = 'libro-de-compras.enteros-de-retenciones' and registro_id = $1 and accion = 'corregir'",
      [pagoId],
    );
    expect(auditada?.anterior).toMatchObject({ multa: '50.00', total: '230.00' });
    expect(await grupoDelMes()).toMatchObject({ estado: 'enterado', pagado: '180.00', accesorios: '5.10' });
  });

  it('un impuesto de más cuenta como exceso y avisa que los accesorios van en sus casillas', async () => {
    const respuesta = await enterar({ documentoDePago: 'SAT2000-2', impuesto: '20.00' });

    expect(respuesta.estado).toBe(201);
    const avisos = respuesta.cuerpo.avisos.join(' ');
    expect(avisos).toContain('El impuesto pagado en ese mes y grupo (Q200.00) pasa lo retenido (Q180.00) por Q20.00.');
    expect(avisos).toContain('La multa, los intereses y la mora van en sus casillas');
    expect(await grupoDelMes()).toMatchObject({ estado: 'con_diferencia', pagado: '200.00', diferencia: '-20.00' });
    await anular(respuesta.cuerpo.entero.id);
  });

  it('un pago anulado no suma sus accesorios', async () => {
    const respuesta = await enterar({ documentoDePago: 'SAT2000-3', impuesto: '10.00', mora: '3.00' });
    await anular(respuesta.cuerpo.entero.id);

    expect((await grupoDelMes()).accesorios).toBe('5.10');
  });

  it('rechaza accesorios negativos o mal escritos, diciendo el campo', async () => {
    const negativa = await enterar({ multa: '-1.00' });
    const decimales = await enterar({ intereses: '1.234' });

    expect(negativa.estado).toBe(400);
    expect(decimales.estado).toBe(400);
    expect(JSON.stringify(negativa.cuerpo)).toContain('multa');
    expect(JSON.stringify(decimales.cuerpo)).toContain('intereses');
  });

  it('el impuesto sigue siendo obligatorio y mayor que cero: un pago solo de accesorios se rechaza', async () => {
    const soloMulta = await enterar({ impuesto: '0.00', multa: '50.00' });
    const sinImpuesto = await e.propietario.post(RUTA, {
      mes: MES_VIEJO.slice(0, 7),
      grupo: 'iva_agentes',
      fechaDePago: HOY,
      documentoDePago: 'SAT2000-4',
      multa: '50.00',
    });

    expect(soloMulta.cuerpo.error.codigo).toBe('impuesto_del_entero_invalido');
    expect(sinImpuesto.estado).toBe(400);
  });

  it('la matriz del año trae los accesorios de cada grupo', async () => {
    const respuesta = await e.propietario.get(`${RUTA}?anio=${MES_VIEJO.slice(0, 4)}`);

    const mes = respuesta.cuerpo.meses.find((m: { mes: string }) => m.mes === MES_VIEJO);
    expect(mes.grupos[0]).toMatchObject({ grupo: 'iva_agentes', pagado: '180.00', accesorios: '5.10' });
  });
});
