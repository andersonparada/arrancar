/** U8l-3: un saldo inicial con notas ya tiene movimientos, y avisa de las notas posteriores que quedaron libres. */
import { beforeEach, describe, expect, it } from 'vitest';
import { SaldoInicialConMovimientos } from '../../../dominio/errores-de-saldos-iniciales.js';
import type { NotaLibreDelSistemaAnterior } from '../../../dominio/notas-posteriores.js';
import { EscenarioDeSaldosIniciales } from '../../../pruebas/escenario-de-saldos-iniciales.js';

let e: EscenarioDeSaldosIniciales;
let id: string;

beforeEach(async () => {
  e = new EscenarioDeSaldosIniciales();
  e.carga.estado = { fechaDeInicio: '2026-01-01', cerrada: false };
  id = (await e.crear.ejecutar(e.operador, e.solicitud())).id;
});

/** Una nota del libro enlazada al saldo inicial (la que se recibió ya con la factura cargada). */
function notaEnlazada(estado: 'pendiente' | 'anulado' = 'pendiente') {
  const saldo = e.documentos.documentos[0]!;
  e.documentos.documentos.push({
    ...saldo,
    id: crypto.randomUUID(),
    origen: 'libro_de_compras',
    documentoId: crypto.randomUUID(),
    tipo: 'nota_de_credito',
    documentoAfectadoId: saldo.id,
    facturaDelSistemaAnterior: true,
    saldoAlInicioCentavos: null,
    retencionesPorPracticarCentavos: null,
    totalCentavos: 3000,
    vencimiento: null,
    estado,
  });
}

const libre = (cambios: Partial<NotaLibreDelSistemaAnterior> = {}): NotaLibreDelSistemaAnterior => ({
  proveedorId: e.proveedorId,
  tipo: 'nota_de_credito',
  serie: 'A',
  numero: '1001',
  saldoLibreCentavos: 3000,
  ...cambios,
});

describe('un saldo inicial con notas del libro', () => {
  it('no se corrige ni se elimina, aunque la nota no haya aplicado nada', async () => {
    notaEnlazada();

    await expect(e.corregir.ejecutar(e.operador, id, e.solicitud())).rejects.toThrow(SaldoInicialConMovimientos);
    await expect(e.eliminar.ejecutar(e.operador, id, 'Error')).rejects.toThrow(SaldoInicialConMovimientos);
  });

  it('tampoco con una nota anulada: la apertura nunca cambia por una nota posterior', async () => {
    notaEnlazada('anulado');

    await expect(e.corregir.ejecutar(e.operador, id, e.solicitud())).rejects.toThrow(SaldoInicialConMovimientos);
    await expect(e.eliminar.ejecutar(e.operador, id, 'Error')).rejects.toThrow(SaldoInicialConMovimientos);
  });

  it('la ficha y la lista dicen que ya no se puede corregir ni eliminar', async () => {
    notaEnlazada();

    expect(await e.obtener.ejecutar(e.operador, id)).toMatchObject({ puedeCorregir: false, puedeEliminar: false });
    const { elementos } = await e.listar.ejecutar(e.operador, {}, { pagina: 1, limite: 20 });
    expect(elementos[0]).toMatchObject({ puedeCorregir: false, puedeEliminar: false });
  });
});

describe('notas posteriores libres que citan el saldo inicial', () => {
  it('sin notas libres todo está en cero', async () => {
    expect((await e.obtener.ejecutar(e.operador, id)).notasPosteriores).toEqual({
      notasDeCredito: 0,
      saldoLibre: '0.00',
      notasDeDebito: 0,
    });
  });

  it('suma las notas de crédito con su saldo a favor y cuenta las de débito', async () => {
    e.consultas.libres = [
      libre(),
      libre({ saldoLibreCentavos: 2050 }),
      libre({ tipo: 'nota_de_debito', saldoLibreCentavos: 0 }),
    ];

    const dto = await e.obtener.ejecutar(e.operador, id);

    expect(dto.notasPosteriores).toEqual({ notasDeCredito: 2, saldoLibre: '50.50', notasDeDebito: 1 });
  });

  it('no cuenta las de otro proveedor, otro número, otra serie ni una nota de crédito ya agotada', async () => {
    e.consultas.libres = [
      libre({ proveedorId: crypto.randomUUID() }),
      libre({ numero: '1002' }),
      libre({ serie: null }),
      libre({ saldoLibreCentavos: 0 }),
    ];

    expect((await e.obtener.ejecutar(e.operador, id)).notasPosteriores.notasDeCredito).toBe(0);
  });

  it('la lista, el alta y la corrección también traen el aviso', async () => {
    e.consultas.libres = [libre()];

    const { elementos } = await e.listar.ejecutar(e.operador, {}, { pagina: 1, limite: 20 });
    const corregido = await e.corregir.ejecutar(e.operador, id, e.solicitud());
    const otro = await e.crear.ejecutar(e.operador, e.solicitud({ numero: '2002' }));

    expect(elementos[0]?.notasPosteriores).toMatchObject({ notasDeCredito: 1, saldoLibre: '30.00' });
    expect(corregido.notasPosteriores).toMatchObject({ notasDeCredito: 1, saldoLibre: '30.00' });
    expect(otro.notasPosteriores.notasDeCredito).toBe(0);
  });

  it('un saldo inicial que no es de factura (recibo, nota) nunca tiene notas posteriores', async () => {
    e.consultas.libres = [libre()];

    const recibo = await e.crear.ejecutar(e.operador, e.solicitud({ tipo: 'recibo', numero: '1001', serie: 'A' }));

    expect(recibo.notasPosteriores.notasDeCredito).toBe(0);
  });
});
