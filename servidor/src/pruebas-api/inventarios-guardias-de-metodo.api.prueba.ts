import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { cuadreDelKardex } from './soporte/cuadre-del-kardex.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearArticulo, entrada, prepararKardex, type EscenarioDeKardex } from './soporte/escenario-de-kardex.js';

const entorno = usarEntornoApi();
let e: EscenarioDeKardex;

beforeAll(async () => {
  e = await prepararKardex(entorno, 'metodoelegir');
});

afterAll(async () => {
  expect(await cuadreDelKardex(e.cuenta.empresaId)).toEqual([]);
});

describe('elegir el método a la vez que el primer documento', () => {
  it('o el método se elige antes y el documento lo usa, o el documento lo fija y la elección se rechaza', async () => {
    const articulo = await crearArticulo(e.cuenta.propietario, e.referencias);

    const [elegido, documento] = await Promise.all([
      e.cuenta.propietario.post('/api/inventarios/metodo-de-costeo', { metodo: 'peps' }),
      entrada(e.cuenta.propietario, {
        bodegaId: e.bodegaId,
        fecha: '2026-03-01',
        renglones: [{ articuloId: articulo, cantidad: '5', costoTotal: '10.00' }],
      }),
    ]);

    const politica = (await e.cuenta.propietario.get('/api/inventarios/metodo-de-costeo')).cuerpo;
    expect(documento.estado).toBe(201);
    expect(politica).toMatchObject({ fijado: true, metodo: elegido.estado === 200 ? 'peps' : 'promedio_ponderado' });
    expect(politica.historia).toHaveLength(1);
    if (elegido.estado !== 200) expect(elegido.cuerpo.error.codigo).toBe('metodo_fijado');
  });
});

describe('dos primeros documentos a la vez', () => {
  it('de artículos distintos se guardan los dos y la política queda con una sola fila', async () => {
    const otra = await prepararKardex(entorno, 'primerosdocs');
    const [uno, dos] = await Promise.all([
      crearArticulo(otra.cuenta.propietario, otra.referencias),
      crearArticulo(otra.cuenta.propietario, otra.referencias),
    ]);
    const dar = (articuloId: string) =>
      entrada(otra.cuenta.propietario, {
        bodegaId: otra.bodegaId,
        fecha: '2026-03-01',
        renglones: [{ articuloId, cantidad: '5', costoTotal: '10.00' }],
      });

    const respuestas = await Promise.all([dar(uno), dar(dos)]);

    expect(respuestas.map((r) => r.estado)).toEqual([201, 201]);
    const politica = (await otra.cuenta.propietario.get('/api/inventarios/metodo-de-costeo')).cuerpo;
    expect(politica.historia).toHaveLength(1);
    expect(politica.fijado).toBe(true);
    expect(await cuadreDelKardex(otra.cuenta.empresaId)).toEqual([]);
  });
});
