import { beforeEach, describe, expect, it } from 'vitest';
import { AccesoDenegado, RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import { ExistenciaNegativa } from '../../../dominio/costeo/errores.js';
import { DocumentoInvalido, DocumentoYaAnulado, MesCerrado, MetodoFijado } from '../../../dominio/errores-de-kardex.js';
import { ARTICULO, BODEGA, EscenarioDelKardex } from '../../../pruebas/escenario-del-kardex.js';
import { ElegirMetodoDeCosteo } from '../metodo-de-costeo/elegir-metodo-de-costeo.js';
import { ObtenerPoliticaDeCosteo } from '../metodo-de-costeo/obtener-politica-de-costeo.js';
import { KardexDelArticulo } from './kardex-del-articulo.js';

let e: EscenarioDelKardex;

beforeEach(() => {
  e = new EscenarioDelKardex();
});

describe('AnularDocumento', () => {
  it('deja el rastro en la auditoría, devuelve las existencias y publica documento_anulado', async () => {
    const compra = await e.registrarEntrada();

    const anulado = await e.anular('entrada_manual', compra.id, 'Duplicada');

    expect(e.kardex.existenciaDe(BODEGA, ARTICULO)).toBe(0n);
    expect(e.kardex.saldos.get(ARTICULO)).toMatchObject({ cantidad: 0n, valor: 0n });
    expect(e.auditoria.entradas).toEqual([
      expect.objectContaining({
        recurso: 'inventarios.entradas',
        registroId: compra.id,
        accion: 'anular',
        motivo: 'Duplicada',
      }),
    ]);
    expect(e.publicador.nombres()).toContain('inventarios.documento_anulado');
    expect(anulado.id).toBe(compra.id);
  });

  it('no deja anular una entrada de la que dependen salidas posteriores', async () => {
    const compra = await e.registrarEntrada();
    await e.registrarSalida('30');

    await expect(e.anular('entrada_manual', compra.id)).rejects.toThrow(ExistenciaNegativa);
    expect(e.auditoria.entradas).toEqual([]);
  });

  it('anular una salida devuelve la mercadería y la audita como salida', async () => {
    await e.registrarEntrada();
    const consumo = await e.registrarSalida('30');

    await e.anular('salida_por_consumo', consumo.id);

    expect(e.kardex.existenciaDe(BODEGA, ARTICULO)).toBe(1_000_000n);
    expect(e.auditoria.acciones()).toEqual(['inventarios.salidas:anular']);
  });

  it('no anula dos veces, ni en un mes cerrado, ni un documento de otra clase, ni sin motivo', async () => {
    const compra = await e.registrarEntrada();
    await e.anular('entrada_manual', compra.id);
    const otra = await e.registrarEntrada();
    e.cierres.cerrados = ['2026-09-01'];

    await expect(e.anular('entrada_manual', compra.id)).rejects.toThrow(DocumentoYaAnulado);
    await expect(e.anular('entrada_manual', otra.id)).rejects.toThrow(MesCerrado);
    e.cierres.cerrados = [];
    await expect(e.anular('salida_por_consumo', otra.id)).rejects.toThrow(RecursoNoEncontrado);
    await expect(e.anular('entrada_manual', otra.id, '  ')).rejects.toThrow(DocumentoInvalido);
  });

  it('al anular una entrada anterior recalcula el costo de las salidas', async () => {
    await e.registrarEntrada();
    const cara = await e.registrarEntrada({ fecha: '2026-09-02', renglones: e.compra('100', '400.00') });
    const consumo = await e.registrarSalida('50', { fecha: '2026-09-03' });
    expect(consumo.costoTotal).toBe('150.00');

    await e.anular('entrada_manual', cara.id);

    expect((await e.kardex.documento(consumo.id)).costoTotal).toBe('100.00');
    expect(e.publicador.nombres().at(-1)).toBe('inventarios.costo_recalculado');
  });
});

describe('política de costeo', () => {
  it('propone el método de la configuración mientras nadie lo elige y lo elige hasta el primer movimiento', async () => {
    const politica = () => new ObtenerPoliticaDeCosteo(e.dependencias).ejecutar(e.operador);
    const elegir = (metodo: 'peps' | 'promedio_ponderado') =>
      new ElegirMetodoDeCosteo(e.dependencias).ejecutar(e.operador, metodo);

    expect(await politica()).toMatchObject({ elegido: false, fijado: false, metodo: 'promedio_ponderado' });
    expect(await elegir('peps')).toMatchObject({ elegido: true, metodo: 'peps' });
    await elegir('promedio_ponderado');
    expect(e.auditoria.acciones()).toEqual(['inventarios.metodos-de-costeo:corregir']);
    await e.registrarEntrada();

    await expect(elegir('peps')).rejects.toThrow(MetodoFijado);
    expect(await politica()).toMatchObject({ fijado: true, metodo: 'promedio_ponderado' });
  });
});

describe('KardexDelArticulo', () => {
  it('sin bodega solo lo ve quien ve todas las bodegas', async () => {
    const consulta = new KardexDelArticulo(e.dependencias);
    const pedido = { articuloId: ARTICULO, filtros: {} };

    await expect(consulta.ejecutar(e.operador, pedido, { verCostos: true, veTodasLasBodegas: false })).rejects.toThrow(
      AccesoDenegado,
    );
    await expect(consulta.ejecutar(e.operador, pedido, e.vista)).resolves.toMatchObject({
      articuloCodigo: 'A-1',
      bodegaId: null,
    });
  });
});
