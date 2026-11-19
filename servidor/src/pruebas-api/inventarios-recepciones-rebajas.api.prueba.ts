/**
 * Rebajas de costo (INV-5): una nota de crédito sin devolución física reparte su monto entre las entradas de la factura
 * (V-2): lo absorbido baja el valor del artículo y lo ya vendido va a resultados; una salida registrada después con fecha
 * anterior vuelve a repartir, con su rastro y su evento.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import '../modulos/core/contratos/inventarios.contratos.js';
import { busEventos } from '../modulos/core/eventos/bus-eventos.js';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { cuadreDelKardex } from './soporte/cuadre-del-kardex.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { instalarDestinoFalso } from './soporte/escenario-de-documentos.js';
import { crearArticulo, kardexDe } from './soporte/escenario-de-kardex.js';
import { comprar, factura, nota, rebajar, sacar } from './soporte/escenario-de-notas.js';
import { prepararRecepciones, type EscenarioDeRecepciones } from './soporte/escenario-de-recepciones.js';

const entorno = usarEntornoApi();
let e: EscenarioDeRecepciones;
const eventos: Array<{ nombre: string; datos: Record<string, any> }> = [];

const propietario = () => e.cuenta.propietario;
const nuevoArticulo = () => crearArticulo(propietario(), e.referencias);

beforeAll(async () => {
  instalarDestinoFalso();
  for (const nombre of ['costo_ajustado', 'costo_recalculado'] as const) {
    busEventos.suscribir(`inventarios.${nombre}`, (datos) => {
      eventos.push({ nombre, datos: datos as Record<string, any> });
    });
  }
  e = await prepararRecepciones(entorno, 'recepcionesrebajas');
});

afterAll(async () => {
  vi.restoreAllMocks();
  expect(await cuadreDelKardex(e.cuenta.empresaId)).toEqual([]);
});

describe('rebajas de costo', () => {
  it('reparten el monto entre las entradas: lo absorbido baja el valor y lo ya vendido va a resultados', async () => {
    const articulo = await nuevoArticulo();
    const compra = await comprar(e, articulo, { cantidad: '100', costo: 200 });
    await sacar(e, articulo, { cantidad: '40', dias: 8 });
    const { lineaIds } = await nota(e, compra.documentoId, 30);

    const respuesta = await rebajar(e, { lineaId: lineaIds[0]!, monto: '30.00' });

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
    expect(respuesta.cuerpo).toMatchObject({ clase: 'rebaja_de_costo', bodegaId: null, costoTotal: '18.00' });
    const kardex = await kardexDe(propietario(), articulo);
    expect(kardex.renglones.at(-1)).toMatchObject({
      clase: 'rebaja_de_costo',
      tipo: 'valor',
      saldoCantidad: '60.0000',
      saldoValor: '102.00',
    });
    const reparto = await comoPropietario<{
      monto: string;
      absorbido: string;
      a_resultados: string;
      base_del_reparto: string;
    }>(
      'select monto::text, absorbido::text, a_resultados::text, base_del_reparto from inventarios.repartos_de_costo where documento_id = $1',
      [respuesta.cuerpo.id],
    );
    expect(reparto).toEqual([
      { monto: '-30.00', absorbido: '-18.00', a_resultados: '-12.00', base_del_reparto: 'valor' },
    ]);
    expect(eventos.find((ev) => ev.datos.documentoId === respuesta.cuerpo.id)).toMatchObject({
      nombre: 'costo_ajustado',
      datos: {
        documentoDeCompraId: expect.any(String),
        repartos: [{ movimientoDeEntradaId: compra.entradaId, absorbidoCentavos: -1_800, aResultadosCentavos: -1_200 }],
      },
    });
  });

  it('una salida registrada después con fecha anterior vuelve a repartir lo absorbido y deja su rastro', async () => {
    const articulo = await nuevoArticulo();
    const compra = await comprar(e, articulo, { cantidad: '100', costo: 200 });
    await sacar(e, articulo, { cantidad: '40', dias: 8 });
    const { lineaIds } = await nota(e, compra.documentoId, 30);
    const rebaja = await rebajar(e, { lineaId: lineaIds[0]!, monto: '30.00' });
    eventos.length = 0;

    const otra = await sacar(e, articulo, { cantidad: '20', dias: 6 });

    expect(otra.estado).toBe(201);
    const reparto = await comoPropietario<{ absorbido: string; a_resultados: string }>(
      'select absorbido::text, a_resultados::text from inventarios.repartos_de_costo where documento_id = $1',
      [rebaja.cuerpo.id],
    );
    expect(reparto).toEqual([{ absorbido: '-12.00', a_resultados: '-18.00' }]);
    expect(eventos.find((ev) => ev.nombre === 'costo_recalculado')!.datos).toMatchObject({
      repartos: [
        { documentoId: rebaja.cuerpo.id, diferenciaAbsorbidoCentavos: 600, diferenciaAResultadosCentavos: -600 },
      ],
    });
    const rastro = await comoPropietario<{ repartos_afectados: number; diferencia_a_resultados: string }>(
      'select repartos_afectados, diferencia_a_resultados::text from inventarios.recalculos where articulo_id = $1 and repartos_afectados > 0',
      [articulo],
    );
    expect(rastro).toEqual([{ repartos_afectados: 1, diferencia_a_resultados: '-6.00' }]);
  });

  it('no pasan del costo de la línea de la nota, ni se aplican a una factura sin entradas o con una fecha anterior', async () => {
    const articulo = await nuevoArticulo();
    const compra = await comprar(e, articulo, { cantidad: '100', costo: 200 });
    const sinEntradas = await factura(e, 100);
    const deLaSinEntradas = await nota(e, sinEntradas.documentoId, 10);
    const { lineaIds } = await nota(e, compra.documentoId, 30);
    const lineaId = lineaIds[0]!;
    await rebajar(e, { lineaId, monto: '20.00' });

    const demasiado = await rebajar(e, { lineaId, monto: '10.01' });
    const sinRecepcion = await rebajar(e, { lineaId: deLaSinEntradas.lineaIds[0]!, monto: '1.00' });
    const anterior = await rebajar(e, { lineaId, monto: '1.00', dias: 20 });

    expect(demasiado.cuerpo.error.codigo).toBe('linea_sobrerrecibida');
    expect(sinRecepcion.cuerpo.error.codigo).toBe('documento_invalido');
    expect(anterior.cuerpo.error.codigo).toBe('documento_invalido');
  });
});
