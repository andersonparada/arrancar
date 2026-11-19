import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import '../modulos/core/contratos/inventarios.contratos.js';
import { busEventos } from '../modulos/core/eventos/bus-eventos.js';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { cuadreDelKardex } from './soporte/cuadre-del-kardex.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';
import {
  crearArticulo,
  entrada,
  prepararKardex,
  salida,
  type EscenarioDeKardex,
} from './soporte/escenario-de-kardex.js';

const entorno = usarEntornoApi();
let e: EscenarioDeKardex;
const anulaciones: Array<Record<string, any>> = [];

const propietario = () => e.cuenta.propietario;

beforeAll(async () => {
  busEventos.suscribir('inventarios.documento_anulado', (datos) => {
    anulaciones.push(datos);
  });
  e = await prepararKardex(entorno, 'kardexanulaciones');
});

afterAll(async () => {
  expect(await cuadreDelKardex(e.cuenta.empresaId)).toEqual([]);
});

describe('anular', () => {
  it('deja el documento anulado con su motivo, devuelve las existencias y queda en la auditoría', async () => {
    const articulo = await crearArticulo(propietario(), e.referencias);
    const compra = await entrada(propietario(), {
      bodegaId: e.bodegaId,
      fecha: '2026-03-01',
      renglones: [{ articuloId: articulo, cantidad: '8', costoTotal: '16.00' }],
    });

    const anulada = await propietario().post(`/api/inventarios/entradas/${compra.cuerpo.id}/anular`, {
      motivo: 'Se registró dos veces',
    });
    const otraVez = await propietario().post(`/api/inventarios/entradas/${compra.cuerpo.id}/anular`, {
      motivo: 'Otra',
    });

    expect(anulada.cuerpo).toMatchObject({ estado: 'anulado', motivoDeAnulacion: 'Se registró dos veces' });
    expect(otraVez.cuerpo.error.codigo).toBe('documento_ya_anulado');
    const existencias = (await propietario().get(`/api/inventarios/existencias?articuloId=${articulo}`)).cuerpo;
    expect(existencias).toEqual([]);
    const enCero = (await propietario().get(`/api/inventarios/existencias?articuloId=${articulo}&incluirEnCero=true`))
      .cuerpo;
    expect(enCero[0].cantidad).toBe('0.0000');
    const rastro = await comoPropietario<{ anterior: { numero: number; costoTotal: string }; motivo: string }>(
      `select anterior, motivo from core.auditoria where recurso = 'inventarios.entradas' and accion = 'anular' and registro_id = $1`,
      [compra.cuerpo.id],
    );
    expect(rastro).toHaveLength(1);
    expect(rastro[0]).toMatchObject({
      anterior: { costoTotal: '16.00', estado: 'vigente' },
      motivo: 'Se registró dos veces',
    });
    expect(anulaciones.find((d) => d.documentoId === compra.cuerpo.id)).toMatchObject({ clase: 'entrada_manual' });
  });

  it('exige motivo y que el documento sea de la clase de la ruta', async () => {
    const articulo = await crearArticulo(propietario(), e.referencias);
    const compra = await entrada(propietario(), {
      bodegaId: e.bodegaId,
      fecha: '2026-03-01',
      renglones: [{ articuloId: articulo, cantidad: '8', costoTotal: '16.00' }],
    });

    const sinMotivo = await propietario().post(`/api/inventarios/entradas/${compra.cuerpo.id}/anular`, { motivo: ' ' });
    const comoSalida = await propietario().post(`/api/inventarios/salidas/${compra.cuerpo.id}/anular`, { motivo: 'X' });

    expect(sinMotivo.estado).toBe(400);
    expect(comoSalida.estado).toBe(404);
  });
});

describe('permisos', () => {
  it('cada acción pide su permiso', async () => {
    const lector = await crearUsuarioConPermisos(entorno, e.cuenta, {
      nombres: 'Solo',
      apellidos: 'Lector',
      permisos: ['inventarios.existencias.ver'],
    });
    const articulo = await crearArticulo(propietario(), e.referencias);
    const compra = await entrada(propietario(), {
      bodegaId: e.bodegaId,
      fecha: '2026-03-01',
      renglones: [{ articuloId: articulo, cantidad: '8', costoTotal: '16.00' }],
    });

    const intentos = [
      await entrada(lector, {
        bodegaId: e.bodegaId,
        fecha: '2026-03-02',
        renglones: [{ articuloId: articulo, cantidad: '1', costoTotal: '1.00' }],
      }),
      await salida(lector, e, {
        bodegaId: e.bodegaId,
        fecha: '2026-03-02',
        renglones: [{ articuloId: articulo, cantidad: '1' }],
      }),
      await lector.post(`/api/inventarios/entradas/${compra.cuerpo.id}/anular`, { motivo: 'X' }),
      await lector.get('/api/inventarios/metodo-de-costeo'),
      await lector.post('/api/inventarios/metodo-de-costeo', { metodo: 'peps' }),
    ];

    expect(intentos.map((r) => r.estado)).toEqual([403, 403, 403, 403, 403]);
    expect((await lector.get('/api/inventarios/documentos')).estado).toBe(200);
    expect((await lector.get('/api/inventarios/existencias')).estado).toBe(200);
  });
});
