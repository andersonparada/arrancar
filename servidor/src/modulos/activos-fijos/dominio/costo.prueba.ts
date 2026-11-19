import { describe, expect, it } from 'vitest';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import { Costo, type DatosDeCostoManual } from './costo.js';
import { CostoInvalido, CostoNoAnulable } from './errores-de-costo.js';

const empresaId = Identificador.nuevo<'Empresa'>();
const activoId = crypto.randomUUID();

const datos = (cambios: Partial<DatosDeCostoManual> = {}): DatosDeCostoManual => ({
  claseDeCosto: 'importacion',
  fecha: '2026-11-01',
  montoCentavos: 250_000,
  documentoDeSoporte: ' DUCA 26-0000123 ',
  descripcion: null,
  aplicaAlLibroFiscal: true,
  motivoFueraDelLibroFiscal: null,
  noEsEdificacion: false,
  ...cambios,
});

describe('costo manual', () => {
  it('guarda el soporte recortado y nace vigente, en el libro fiscal', () => {
    const costo = Costo.manual(empresaId, activoId, datos()).instantanea();

    expect(costo).toMatchObject({
      origen: 'manual',
      documentoDeSoporte: 'DUCA 26-0000123',
      estado: 'vigente',
      aplicaAlLibroFiscal: true,
      documentoDeCompraId: null,
      lineaDeDocumentoId: null,
    });
  });

  it('sin documento de soporte no se guarda', () => {
    expect(() => Costo.manual(empresaId, activoId, datos({ documentoDeSoporte: '   ' }))).toThrow(CostoInvalido);
  });

  it('el monto es positivo y entero en centavos', () => {
    expect(() => Costo.manual(empresaId, activoId, datos({ montoCentavos: 0 }))).toThrow(CostoInvalido);
    expect(() => Costo.manual(empresaId, activoId, datos({ montoCentavos: -5 }))).toThrow(CostoInvalido);
    expect(() => Costo.manual(empresaId, activoId, datos({ montoCentavos: 10.5 }))).toThrow(CostoInvalido);
  });

  it('fuera del libro fiscal exige motivo (V-8); dentro, lo descarta', () => {
    expect(() => Costo.manual(empresaId, activoId, datos({ aplicaAlLibroFiscal: false }))).toThrow(CostoInvalido);

    const fuera = Costo.manual(
      empresaId,
      activoId,
      datos({ aplicaAlLibroFiscal: false, motivoFueraDelLibroFiscal: 'Sin documento ante la SAT' }),
    ).instantanea();
    const dentro = Costo.manual(empresaId, activoId, datos({ motivoFueraDelLibroFiscal: 'ignorado' })).instantanea();

    expect(fuera).toMatchObject({ aplicaAlLibroFiscal: false, motivoFueraDelLibroFiscal: 'Sin documento ante la SAT' });
    expect(dentro.motivoFueraDelLibroFiscal).toBeNull();
  });

  it('los textos no pasan de su largo', () => {
    expect(() => Costo.manual(empresaId, activoId, datos({ documentoDeSoporte: 'x'.repeat(151) }))).toThrow(
      CostoInvalido,
    );
    expect(() => Costo.manual(empresaId, activoId, datos({ descripcion: 'x'.repeat(301) }))).toThrow(CostoInvalido);
  });
});

describe('anular un costo', () => {
  const ahora = new Date('2026-11-18T10:00:00Z');

  it('queda anulado con su motivo, quien lo anuló y cuándo', () => {
    const costo = Costo.manual(empresaId, activoId, datos());

    costo.anular({ motivo: ' Se capturó dos veces ', usuarioId: 'u-1', ahora });

    expect(costo.instantanea()).toMatchObject({
      estado: 'anulado',
      motivoDeAnulacion: 'Se capturó dos veces',
      anuladoPor: 'u-1',
      anuladoEn: ahora,
    });
  });

  it('exige el motivo y no se anula dos veces', () => {
    const costo = Costo.manual(empresaId, activoId, datos());

    expect(() => costo.anular({ motivo: ' ', usuarioId: 'u-1', ahora })).toThrow(CostoInvalido);
    costo.anular({ motivo: 'Error', usuarioId: 'u-1', ahora });
    expect(() => costo.anular({ motivo: 'Otra vez', usuarioId: 'u-1', ahora })).toThrow(CostoNoAnulable);
  });

  it('el costo del saldo inicial no se anula aquí', () => {
    const costo = Costo.reconstruir({
      ...Costo.manual(empresaId, activoId, datos()).instantanea(),
      origen: 'saldo_inicial',
    });

    expect(() => costo.anular({ motivo: 'Error', usuarioId: 'u-1', ahora })).toThrow(CostoNoAnulable);
  });
});

describe('el costo de un saldo inicial', () => {
  const nuevo = () => Costo.deSaldoInicial({ empresaId, activoId, fecha: '2025-12-31', montoCentavos: 12_000_000 });

  it('nace vigente, fechado el día de corte, sin soporte y siempre al libro fiscal', () => {
    expect(nuevo().instantanea()).toMatchObject({
      origen: 'saldo_inicial',
      claseDeCosto: 'adquisicion',
      fecha: '2025-12-31',
      montoCentavos: 12_000_000,
      estado: 'vigente',
      aplicaAlLibroFiscal: true,
      documentoDeSoporte: null,
      lineaDeDocumentoId: null,
    });
  });

  it('se corrige el monto y la fecha, y solo el de un saldo inicial', () => {
    const costo = nuevo();

    costo.corregirSaldoInicial({ montoCentavos: 15_000_000, fecha: '2026-03-14' });

    expect(costo.instantanea()).toMatchObject({ montoCentavos: 15_000_000, fecha: '2026-03-14' });
    expect(() =>
      Costo.manual(empresaId, activoId, datos()).corregirSaldoInicial({ montoCentavos: 1, fecha: '2026-03-14' }),
    ).toThrow(CostoInvalido);
  });
});
