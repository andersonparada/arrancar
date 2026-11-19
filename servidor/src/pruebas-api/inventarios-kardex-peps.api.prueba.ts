import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { cuadreDelKardex } from './soporte/cuadre-del-kardex.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import {
  crearArticulo,
  entrada,
  prepararKardex,
  salida,
  type EscenarioDeKardex,
} from './soporte/escenario-de-kardex.js';

const entorno = usarEntornoApi();
const RUTA_DE_METODO = '/api/inventarios/metodo-de-costeo';
let e: EscenarioDeKardex;

const dar = (articuloId: string, fecha: string, compra: { cantidad: string; costoTotal: string }) =>
  entrada(e.cuenta.propietario, { bodegaId: e.bodegaId, fecha, renglones: [{ articuloId, ...compra }] });

const sacar = (articuloId: string, fecha: string, cantidad: string) =>
  salida(e.cuenta.propietario, e, { bodegaId: e.bodegaId, fecha, renglones: [{ articuloId, cantidad }] });

const capasDe = (articuloId: string) =>
  comoPropietario<{ cantidad_restante: string; valor_restante: string }>(
    `select cantidad_restante::text, valor_restante::text from inventarios.capas where articulo_id = $1 order by fecha, secuencia`,
    [articuloId],
  );

beforeAll(async () => {
  e = await prepararKardex(entorno, 'kardexpeps');
});

afterAll(async () => {
  expect(await cuadreDelKardex(e.cuenta.empresaId)).toEqual([]);
});

describe('política de costeo', () => {
  it('propone el método de la configuración, se elige antes del primer movimiento y luego queda fijado', async () => {
    const antes = await e.cuenta.propietario.get(RUTA_DE_METODO);
    const elegido = await e.cuenta.propietario.post(RUTA_DE_METODO, { metodo: 'peps' });
    const otraVez = await e.cuenta.propietario.post(RUTA_DE_METODO, { metodo: 'promedio_ponderado' });
    const cambiado = await e.cuenta.propietario.post(RUTA_DE_METODO, { metodo: 'peps' });
    await dar(e.articuloId, '2026-01-02', { cantidad: '10', costoTotal: '20.00' });
    const fijado = await e.cuenta.propietario.post(RUTA_DE_METODO, { metodo: 'promedio_ponderado' });

    expect(antes.cuerpo).toMatchObject({ elegido: false, fijado: false, metodo: 'promedio_ponderado', historia: [] });
    expect(elegido.cuerpo).toMatchObject({ elegido: true, fijado: false, metodo: 'peps' });
    expect(otraVez.cuerpo.metodo).toBe('promedio_ponderado');
    expect(cambiado.cuerpo.metodo).toBe('peps');
    expect(fijado.estado).toBe(422);
    expect(fijado.cuerpo.error.codigo).toBe('metodo_fijado');
    expect((await e.cuenta.propietario.get(RUTA_DE_METODO)).cuerpo).toMatchObject({ fijado: true, metodo: 'peps' });
  });

  it('cambiar la política antes de usarla queda en la auditoría con la fila anterior', async () => {
    const filas = await comoPropietario<{ anterior: { metodo: string } }>(
      `select anterior from core.auditoria where recurso = 'inventarios.metodos-de-costeo' and accion = 'corregir'
        and empresa_id = $1`,
      [e.cuenta.empresaId],
    );

    expect(filas.map((f) => f.anterior.metodo).sort()).toEqual(['peps', 'promedio_ponderado']);
  });
});

describe('kardex con PEPS (§7.6)', () => {
  it('consume la capa más antigua primero y guarda lo que queda de cada una', async () => {
    const articulo = await crearArticulo(e.cuenta.propietario, e.referencias);
    await dar(articulo, '2026-02-01', { cantidad: '100', costoTotal: '200.00' });
    await dar(articulo, '2026-02-02', { cantidad: '50', costoTotal: '115.00' });

    const consumo = await sacar(articulo, '2026-02-03', '120');

    expect(consumo.cuerpo.renglones[0].costoTotal).toBe('246.00');
    expect(await capasDe(articulo)).toEqual([
      { cantidad_restante: '0.0000', valor_restante: '0.00' },
      { cantidad_restante: '30.0000', valor_restante: '69.00' },
    ]);
  });

  it('al anular la salida las capas vuelven a lo que eran', async () => {
    const articulo = await crearArticulo(e.cuenta.propietario, e.referencias);
    await dar(articulo, '2026-02-01', { cantidad: '100', costoTotal: '200.00' });
    await dar(articulo, '2026-02-02', { cantidad: '50', costoTotal: '115.00' });
    const consumo = await sacar(articulo, '2026-02-03', '120');

    await e.cuenta.propietario.post(`/api/inventarios/salidas/${consumo.cuerpo.id}/anular`, { motivo: 'Error' });

    expect(await capasDe(articulo)).toEqual([
      { cantidad_restante: '100.0000', valor_restante: '200.00' },
      { cantidad_restante: '50.0000', valor_restante: '115.00' },
    ]);
  });

  it('una entrada con fecha anterior cambia qué capa consume cada salida y recalcula su costo', async () => {
    const articulo = await crearArticulo(e.cuenta.propietario, e.referencias);
    await dar(articulo, '2026-03-02', { cantidad: '100', costoTotal: '300.00' });
    const consumo = await sacar(articulo, '2026-03-03', '60');
    expect(consumo.cuerpo.renglones[0].costoTotal).toBe('180.00');

    await dar(articulo, '2026-03-01', { cantidad: '100', costoTotal: '100.00' });

    const documento = (await e.cuenta.propietario.get(`/api/inventarios/documentos/${consumo.cuerpo.id}`)).cuerpo;
    expect(documento.renglones[0].costoTotal).toBe('60.00');
    expect(await capasDe(articulo)).toEqual([
      { cantidad_restante: '40.0000', valor_restante: '40.00' },
      { cantidad_restante: '100.0000', valor_restante: '300.00' },
    ]);
  });
});
