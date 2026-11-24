import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import { ExistenciaNegativa } from '../../../dominio/costeo/errores.js';
import { DocumentoInvalido } from '../../../dominio/errores-de-kardex.js';
import {
  CargaInicialCerrada,
  InventarioConFechaFueraDeLaCarga,
  MetodoDeCosteoSinElegir,
  SaldoInicialSinFechaDeInicio,
  SaldosConCierres,
} from '../../../dominio/errores-de-saldo-inicial.js';
import { LoteInvalido } from '../../../dominio/errores.js';
import { EscenarioDeSaldosIniciales } from '../../../pruebas/escenario-de-saldos-iniciales.js';
import { ARTICULO, BODEGA, OTRA_BODEGA, OTRO_ARTICULO } from '../../../pruebas/escenario-del-kardex.js';

let e: EscenarioDeSaldosIniciales;

beforeEach(() => {
  e = new EscenarioDeSaldosIniciales();
  e.elegirMetodo('promedio_ponderado');
});

describe('RegistrarSaldoInicial', () => {
  it('guarda el renglón en un documento saldo_inicial del día anterior al inicio y mueve las existencias', async () => {
    const saldo = await e.registrarSaldo('100', '200.00');

    expect(saldo).toMatchObject({ cantidad: '100.0000', costoTotal: '200.00', fechaDeCapa: '2026-08-31' });
    const [documento] = [...e.kardex.documentosGuardados.values()];
    expect(documento).toMatchObject({ clase: 'saldo_inicial', fecha: '2026-08-31', bodegaId: BODEGA, numero: 1 });
    expect(e.kardex.existenciaDe(BODEGA, ARTICULO)).toBe(1_000_000n);
    expect(e.kardex.saldos.get(ARTICULO)).toMatchObject({ cantidad: 1_000_000n, valor: 20_000n });
  });

  it('agrega los renglones de la misma bodega al mismo documento y abre otro por bodega', async () => {
    await e.registrarSaldo('100', '200.00');
    await e.registrarSaldo('40', '90.00', { articuloId: OTRO_ARTICULO });
    await e.registrarSaldo('10', '30.00', { bodegaId: OTRA_BODEGA });

    const documentos = [...e.kardex.documentosGuardados.values()];
    expect(documentos.map((d) => [d.bodegaId, d.numero])).toEqual([
      [BODEGA, 1],
      [OTRA_BODEGA, 2],
    ]);
    const pantalla = await e.listarSaldos();
    expect(pantalla.saldos).toHaveLength(3);
    expect(pantalla.totales).toEqual({ renglones: 3, articulos: 2, valor: '320.00' });
  });

  it('con PEPS la capa más antigua sale primero aunque se haya anotado después', async () => {
    e.kardex.metodos.length = 0;
    e.elegirMetodo('peps');
    await e.registrarSaldo('50', '115.00', { fechaDeCapa: '2026-08-01' });
    await e.registrarSaldo('100', '200.00', { fechaDeCapa: '2026-03-01' });

    const consumo = await e.registrarSalida('120');

    expect(consumo.renglones[0]!.costoTotal).toBe('246.00');
  });

  it('con promedio ponderado el costo de la salida es el promedio de los saldos', async () => {
    await e.registrarSaldo('50', '115.00', { fechaDeCapa: '2026-08-01' });
    await e.registrarSaldo('100', '200.00', { fechaDeCapa: '2026-03-01' });

    const consumo = await e.registrarSalida('120');

    expect(consumo.renglones[0]!.costoTotal).toBe('252.00');
  });

  it('fija el método elegido con el primer saldo', async () => {
    await e.registrarSaldo('100', '200.00');

    expect(e.kardex.metodos[0]!.fijadoEn).toBeInstanceOf(Date);
  });

  it('rechaza una fecha de capa que no es anterior al inicio', async () => {
    await expect(e.registrarSaldo('1', '1.00', { fechaDeCapa: '2026-09-01' })).rejects.toThrow(DocumentoInvalido);
  });

  it('pasa los quintales a libras y guarda lo escrito', async () => {
    const saldo = await e.registrarSaldo('2', '400.00', { unidadId: 'qq' });

    expect(saldo.cantidadBase).toBe('200.0000');
    expect(e.kardex.existenciaDe(BODEGA, ARTICULO)).toBe(2_000_000n);
  });
});

describe('RegistrarSaldoInicial, lo que exige la carga', () => {
  it('pide la fecha de inicio, la carga abierta, ningún cierre y el método elegido', async () => {
    e.cargaInicial.fechaDeInicio = null;
    await expect(e.registrarSaldo('1', '1.00')).rejects.toThrow(SaldoInicialSinFechaDeInicio);
    e.cargaInicial.fechaDeInicio = '2026-09-01';
    e.cargaInicial.cerrada = true;
    await expect(e.registrarSaldo('1', '1.00')).rejects.toThrow(CargaInicialCerrada);
    e.cargaInicial.cerrada = false;
    e.cierres.cerrados.push('2026-09-01');
    await expect(e.registrarSaldo('1', '1.00')).rejects.toThrow(SaldosConCierres);
    e.cierres.cerrados.length = 0;
    e.kardex.metodos.length = 0;
    await expect(e.registrarSaldo('1', '1.00')).rejects.toThrow(MetodoDeCosteoSinElegir);
  });
});

describe('lotes de los saldos iniciales', () => {
  beforeEach(() => {
    e.kardex.articulosDelCatalogo.set(ARTICULO, {
      ...e.kardex.articulosDelCatalogo.get(ARTICULO)!,
      manejaLotes: true,
      manejaVencimiento: true,
    });
  });

  it('crea el lote escrito con su vencimiento y lo reutiliza en el renglón siguiente', async () => {
    const primero = await e.registrarSaldo('10', '20.00', { loteCodigo: 'L-1', loteVencimiento: '2026-12-01' });
    const segundo = await e.registrarSaldo('5', '10.00', { loteCodigo: 'l-1', fechaDeCapa: '2026-08-01' });

    expect(e.lotes.lotes).toHaveLength(1);
    expect(primero.loteId).toBe(segundo.loteId);
    expect(primero).toMatchObject({ loteCodigo: 'L-1', loteVencimiento: '2026-12-01' });
  });

  it('rechaza el lote existente con otro vencimiento, el lote sin vencimiento y los dos datos a la vez', async () => {
    await e.registrarSaldo('10', '20.00', { loteCodigo: 'L-1', loteVencimiento: '2026-12-01' });

    await expect(e.registrarSaldo('1', '1.00', { loteCodigo: 'L-1', loteVencimiento: '2027-01-01' })).rejects.toThrow(
      DocumentoInvalido,
    );
    await expect(e.registrarSaldo('1', '1.00', { loteCodigo: 'L-2' })).rejects.toThrow(LoteInvalido);
    await expect(e.registrarSaldo('1', '1.00', { loteId: 'x', loteCodigo: 'L-1' })).rejects.toThrow(DocumentoInvalido);
  });
});

describe('CorregirSaldoInicial', () => {
  it('cambia el costo, recalcula las salidas posteriores, audita y publica el recálculo', async () => {
    const saldo = await e.registrarSaldo('100', '200.00');
    const consumo = await e.registrarSalida('10');
    expect(consumo.renglones[0]!.costoTotal).toBe('20.00');

    const corregido = await e.corregirSaldo(saldo.id, e.saldo('100', '300.00'));

    expect(corregido.costoTotal).toBe('300.00');
    expect(e.kardex.saldos.get(ARTICULO)).toMatchObject({ cantidad: 900_000n, valor: 27_000n });
    expect(e.kardex.recalculos.at(-1)).toMatchObject({ causa: 'saldo_inicial_corregido', diferenciaDeCosto: 1_000n });
    expect(e.publicador.nombres()).toContain('inventarios.costo_recalculado');
    expect(e.auditoria.acciones()).toEqual(['inventarios.saldos-iniciales:corregir']);
    expect(e.auditoria.entradas[0]!.anterior).toMatchObject({ id: saldo.id, costoTotal: '200.00' });
    expect((await e.listarSaldos()).saldos).toHaveLength(1);
  });

  it('mueve el renglón a otra bodega y anula el documento que se quedó vacío', async () => {
    const saldo = await e.registrarSaldo('100', '200.00');

    await e.corregirSaldo(saldo.id, e.saldo('100', '200.00', { bodegaId: OTRA_BODEGA }));

    expect(e.kardex.existenciaDe(BODEGA, ARTICULO)).toBe(0n);
    expect(e.kardex.existenciaDe(OTRA_BODEGA, ARTICULO)).toBe(1_000_000n);
    const estados = [...e.kardex.documentosGuardados.values()].map((d) => [d.bodegaId, d.estado]);
    expect(estados).toEqual([
      [BODEGA, 'anulado'],
      [OTRA_BODEGA, 'vigente'],
    ]);
    expect(e.auditoria.acciones()).toEqual([
      'inventarios.saldos-iniciales:anular',
      'inventarios.saldos-iniciales:corregir',
    ]);
  });

  it('cambia de artículo y vuelve a costear los dos', async () => {
    const saldo = await e.registrarSaldo('100', '200.00');

    await e.corregirSaldo(saldo.id, e.saldo('100', '200.00', { articuloId: OTRO_ARTICULO }));

    expect(e.kardex.saldos.get(ARTICULO)).toMatchObject({ cantidad: 0n, valor: 0n });
    expect(e.kardex.saldos.get(OTRO_ARTICULO)).toMatchObject({ cantidad: 1_000_000n, valor: 20_000n });
  });

  it('no encuentra un renglón que ya no es vigente y respeta la carga cerrada', async () => {
    const saldo = await e.registrarSaldo('100', '200.00');
    await e.eliminarSaldo(saldo.id);

    await expect(e.corregirSaldo(saldo.id, e.saldo('1', '1.00'))).rejects.toThrow(RecursoNoEncontrado);
    e.cargaInicial.cerrada = true;
    await expect(e.corregirSaldo(saldo.id, e.saldo('1', '1.00'))).rejects.toThrow(CargaInicialCerrada);
  });
});

describe('EliminarSaldoInicial', () => {
  it('quita el renglón, devuelve la existencia, audita con el renglón y anula el documento sin renglones', async () => {
    const saldo = await e.registrarSaldo('100', '200.00');

    await e.eliminarSaldo(saldo.id);

    expect(e.kardex.existenciaDe(BODEGA, ARTICULO)).toBe(0n);
    expect([...e.kardex.documentosGuardados.values()][0]!.estado).toBe('anulado');
    expect(e.auditoria.acciones()).toEqual([
      'inventarios.saldos-iniciales:anular',
      'inventarios.saldos-iniciales:eliminar',
    ]);
    expect(e.auditoria.entradas.at(-1)!.anterior).toMatchObject({ id: saldo.id, cantidad: '100.0000' });
  });

  it('con otro renglón en el documento lo deja vigente', async () => {
    const saldo = await e.registrarSaldo('100', '200.00');
    await e.registrarSaldo('40', '90.00', { articuloId: OTRO_ARTICULO });

    await e.eliminarSaldo(saldo.id);

    expect([...e.kardex.documentosGuardados.values()][0]!.estado).toBe('vigente');
    expect((await e.listarSaldos()).saldos.map((s) => s.articuloId)).toEqual([OTRO_ARTICULO]);
  });

  it('no deja quitar lo que una salida posterior ya consumió', async () => {
    const saldo = await e.registrarSaldo('100', '200.00');
    await e.registrarSalida('10');

    await expect(e.eliminarSaldo(saldo.id)).rejects.toThrow(ExistenciaNegativa);
  });

  it('no deja tocar una carga cerrada', async () => {
    const saldo = await e.registrarSaldo('100', '200.00');
    e.cargaInicial.cerrada = true;

    await expect(e.eliminarSaldo(saldo.id)).rejects.toThrow(CargaInicialCerrada);
  });
});

describe('RevisarCierreDeCargaEnInventarios', () => {
  it('sin saldos avisa que no hay existencias', async () => {
    const revision = await e.revisarCierre();

    expect(revision.hallazgos.map((h) => h.codigo)).toEqual(['sin_saldos_iniciales']);
    expect(revision.hallazgos[0]!.mensaje).toContain('31/08/2026');
    expect(revision).toMatchObject({ nombreDelModulo: 'Inventarios', ruta: '/inventarios/saldos-iniciales' });
  });

  it('con saldos da las cifras y avisa del costo cero, los lotes vencidos y la falta de conteo', async () => {
    e.kardex.articulosDelCatalogo.set(ARTICULO, {
      ...e.kardex.articulosDelCatalogo.get(ARTICULO)!,
      manejaLotes: true,
      manejaVencimiento: true,
    });
    await e.registrarSaldo('10', '0.00', { loteCodigo: 'V-1', loteVencimiento: '2026-06-30' });
    await e.registrarSaldo('40', '90.00', { articuloId: OTRO_ARTICULO, bodegaId: OTRA_BODEGA });

    const revision = await e.revisarCierre();

    expect(revision.hallazgos.map((h) => h.codigo)).toEqual([
      'existencias_sin_costo',
      'lotes_vencidos',
      'sin_conteo_de_respaldo',
    ]);
    expect(revision.hallazgos[1]!.mensaje).toBe(
      '1 lote de saldo inicial ya estaba vencido al 31/08/2026 por Q0.00: considere el deterioro.',
    );
    expect(revision.resumen).toBe('2 artículos por Q90.00 en 2 bodegas al 31/08/2026');
    const generales = revision.cifras.filter((c) => c.registro === null).map((c) => [c.clave, c.valor]);
    expect(generales).toEqual([
      ['articulos_con_existencia', '2'],
      ['valor_del_inventario', '90.00'],
    ]);
    expect(revision.cifras.filter((c) => c.clave === 'valor_por_bodega')).toHaveLength(2);
  });

  it('con un conteo de respaldo no avisa de la falta de conteo', async () => {
    await e.registrarSaldo('10', '20.00');
    e.saldos.conteos = true;

    expect((await e.revisarCierre()).hallazgos).toEqual([]);
  });
});

describe('ValidarFechaDeInicioEnInventarios', () => {
  it('mueve los documentos de saldo inicial al nuevo día anterior', async () => {
    await e.registrarSaldo('100', '200.00');

    await e.cambiarFechaDeInicio('2026-10-01');

    expect([...e.kardex.documentosGuardados.values()][0]!.fecha).toBe('2026-09-30');
    expect(e.kardex.movimientos[0]).toMatchObject({ fecha: '2026-09-30', fechaDeCapa: '2026-09-30' });
  });

  it('rechaza si hay un cierre, un movimiento anterior que no es saldo o una capa posterior', async () => {
    await e.registrarSaldo('100', '200.00', { fechaDeCapa: '2026-08-15' });
    await e.registrarEntrada({ fecha: '2026-09-02' });

    await expect(e.cambiarFechaDeInicio('2026-09-03')).rejects.toThrow(InventarioConFechaFueraDeLaCarga);
    await expect(e.cambiarFechaDeInicio('2026-08-10')).rejects.toThrow(InventarioConFechaFueraDeLaCarga);
    e.cierres.cerrados.push('2026-09-01');
    await expect(e.cambiarFechaDeInicio('2026-09-01')).rejects.toThrow(InventarioConFechaFueraDeLaCarga);
  });

  it('rechaza si una capa propia quedaría igual al nuevo día anterior y se confundiría con la predeterminada', async () => {
    await e.registrarSaldo('100', '200.00');
    await e.registrarSaldo('50', '80.00', { fechaDeCapa: '2026-06-30' });

    await expect(e.cambiarFechaDeInicio('2026-07-01')).rejects.toThrow(/fecha de capa propia/);
    await expect(e.cambiarFechaDeInicio('2026-10-01')).resolves.toBeUndefined();
  });
});
