import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import { ExistenciaNegativa } from '../../../dominio/costeo/errores.js';
import {
  DocumentoInvalido,
  ElementoInactivo,
  FechaAnteriorAlInicio,
  MesCerrado,
} from '../../../dominio/errores-de-kardex.js';
import { ARTICULO, BODEGA, EscenarioDelKardex, OTRO_ARTICULO } from '../../../pruebas/escenario-del-kardex.js';
import { RegistrarEntradaManual } from './registrar-entrada-manual.js';

let e: EscenarioDelKardex;

beforeEach(() => {
  e = new EscenarioDelKardex();
});

describe('RegistrarEntradaManual', () => {
  it('numera el documento, guarda el kardex, mueve las existencias y publica el evento', async () => {
    const documento = await e.registrarEntrada();

    expect(documento).toMatchObject({ clase: 'entrada_manual', numero: 1, costoTotal: '200.00' });
    expect(e.kardex.existenciaDe(BODEGA, ARTICULO)).toBe(1_000_000n);
    expect(e.kardex.saldos.get(ARTICULO)).toMatchObject({
      cantidad: 1_000_000n,
      valor: 20_000n,
      costoPromedio: 2_000_000n,
    });
    expect(e.publicador.nombres()).toEqual(['inventarios.entrada_registrada']);
    expect(e.kardex.bloqueos).toEqual([[ARTICULO], [ARTICULO]]);
  });

  it('toma el candado de los artículos antes de leerlos para pasarlos a la unidad base', async () => {
    await e.registrarEntrada();

    expect(e.kardex.orden[0]).toBe('bloquear');
    expect(e.kardex.orden.indexOf('bloquear')).toBeLessThan(e.kardex.orden.indexOf('leer_articulos'));
  });

  it('pasa los quintales a libras y guarda lo escrito', async () => {
    const renglones = [{ articuloId: ARTICULO, loteId: null, cantidad: '2', unidadId: 'qq', costoTotal: '400.00' }];

    const documento = await e.registrarEntrada({ renglones });

    expect(e.kardex.existenciaDe(BODEGA, ARTICULO)).toBe(2_000_000n);
    expect(documento.costoTotal).toBe('400.00');
  });

  it('fija el método de la configuración con el primer movimiento y no vuelve a tocarlo', async () => {
    e.metodoInicial.metodo = 'peps';

    await e.registrarEntrada();
    await e.registrarEntrada();

    expect(e.kardex.metodos).toHaveLength(1);
    expect(e.kardex.metodos[0]).toMatchObject({ metodo: 'peps', desde: '2000-01-01' });
    expect(e.kardex.metodos[0]!.fijadoEn).toBeInstanceOf(Date);
    expect(e.kardex.capas.get(ARTICULO)!.capas).toHaveLength(2);
  });

  it('rechaza la fecha futura, la anterior al inicio, el mes cerrado, la bodega inactiva y la que no existe', async () => {
    e.cargaInicial.fechaDeInicio = '2026-08-15';
    e.cierres.cerrados = ['2026-08-01'];
    e.kardex.bodegasDelCatalogo.set('inactiva', { id: 'inactiva', nombre: 'Vieja', activo: false });

    await expect(e.registrarEntrada({ fecha: '2026-10-01' })).rejects.toThrow(DocumentoInvalido);
    await expect(e.registrarEntrada({ fecha: '2026-08-14' })).rejects.toThrow(FechaAnteriorAlInicio);
    e.cargaInicial.fechaDeInicio = null;
    await expect(e.registrarEntrada({ fecha: '2026-08-20' })).rejects.toThrow(MesCerrado);
    await expect(e.registrarEntrada({ bodegaId: 'inactiva' })).rejects.toThrow(ElementoInactivo);
    await expect(e.registrarEntrada({ bodegaId: 'no-existe' })).rejects.toThrow(RecursoNoEncontrado);
    expect(e.kardex.movimientos).toEqual([]);
    expect(e.publicador.publicados).toEqual([]);
  });

  it('revisa el mes cerrado después de tomar el candado del cierre', async () => {
    e.cierres.cerrados = ['2026-09-01'];

    await expect(e.registrarEntrada()).rejects.toThrow(MesCerrado);
    expect(e.kardex.bloqueos).toEqual([[ARTICULO], [ARTICULO]]);
  });

  it('un artículo que no existe es un recurso no encontrado', async () => {
    const renglones = e.compra('1', '1.00', 'fantasma');

    await expect(
      new RegistrarEntradaManual(e.dependencias).ejecutar(e.operador, e.entrada({ renglones }), e.vista),
    ).rejects.toThrow(RecursoNoEncontrado);
  });
});

describe('RegistrarSalida', () => {
  beforeEach(async () => {
    await e.registrarEntrada();
  });

  it('el método calcula el costo y la salida baja las existencias y el saldo', async () => {
    const documento = await e.registrarSalida('40');

    expect(documento).toMatchObject({ clase: 'salida_por_consumo', numero: 1, costoTotal: '80.00' });
    expect(e.kardex.existenciaDe(BODEGA, ARTICULO)).toBe(600_000n);
    expect(e.kardex.saldos.get(ARTICULO)).toMatchObject({ cantidad: 600_000n, valor: 12_000n });
    expect(e.publicador.nombres()).toEqual(['inventarios.entrada_registrada', 'inventarios.salida_registrada']);
  });

  it('una salida mayor que la existencia falla con existencia_negativa y no mueve las existencias', async () => {
    await expect(e.registrarSalida('101')).rejects.toThrow(ExistenciaNegativa);

    expect(e.kardex.existenciaDe(BODEGA, ARTICULO)).toBe(1_000_000n);
  });

  it('una salida anterior a la única entrada se rechaza aunque hoy haya existencia', async () => {
    await expect(e.registrarSalida('10', { fecha: '2026-08-31' })).rejects.toThrow(ExistenciaNegativa);
  });

  it('sin concepto de gasto lo propone el artículo; sin ninguno, falla', async () => {
    const documento = await e.registrarSalida('1', { conceptoDeGastoId: null });
    e.kardex.articulosDelCatalogo.set(ARTICULO, {
      ...e.kardex.articulosDelCatalogo.get(ARTICULO)!,
      conceptoDeGastoId: null,
    });

    expect(documento.conceptoDeGastoId).toBe('concepto-1');
    await expect(e.registrarSalida('1', { conceptoDeGastoId: null })).rejects.toThrow(DocumentoInvalido);
  });

  it('una entrada con fecha anterior recalcula la salida ya registrada y publica la diferencia', async () => {
    const consumo = await e.registrarSalida('40');
    e.publicador.publicados.length = 0;

    await e.registrarEntrada({ renglones: e.compra('100', '400.00') });

    expect((await e.kardex.documento(consumo.id)).costoTotal).toBe('120.00');
    expect(e.kardex.recalculos).toEqual([
      expect.objectContaining({
        articuloId: ARTICULO,
        causa: 'registro_con_fecha_anterior',
        salidasAfectadas: 1,
        diferenciaDeCosto: 4000n,
      }),
    ]);
    expect(e.publicador.nombres()).toEqual(['inventarios.entrada_registrada', 'inventarios.costo_recalculado']);
    expect(e.publicador.publicados[1]!.datos).toMatchObject({
      diferencias: [{ movimientoId: expect.any(String), diferenciaCentavos: 4000 }],
    });
  });

  it('un documento con dos artículos toma los candados de los dos, en orden por id', async () => {
    e.kardex.bloqueos.length = 0;
    const renglones = [...e.compra('1', '1.00', OTRO_ARTICULO), ...e.compra('1', '1.00', ARTICULO)];

    await e.registrarEntrada({ renglones });

    expect(e.kardex.bloqueos).toEqual([
      [ARTICULO, OTRO_ARTICULO],
      [ARTICULO, OTRO_ARTICULO],
    ]);
  });
});
