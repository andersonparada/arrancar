import { describe, expect, it } from 'vitest';
import {
  accionesDeDocumento,
  causaDeAnulacionValida,
  exigirAnulable,
  exigirEliminable,
  exigirQueLasNotasDeCreditoSigaCabiendo,
  fechaDeAnulacionValida,
  motivoDeAnulacionValido,
  type HechosDeUnDocumento,
} from './baja-de-documento.js';
import {
  CausaDeAnulacionInvalida,
  DocumentoConNotas,
  DocumentoConNotasVigentes,
  DocumentoProcesado,
  DocumentoYaAnulado,
  FechaDeAnulacionInvalida,
  FechaDeAnulacionRequerida,
  MotivoDeAnulacionInvalido,
  NotaDeDebitoSostieneNotasDeCredito,
} from './errores-de-baja.js';

const limpio: HechosDeUnDocumento = { anulado: false, procesadoEnElDestino: false, notasVigentes: 0, notasEnTotal: 0 };

describe('anular un documento', () => {
  it('se anula lo vigente sin notas vigentes, aunque esté procesado o tenga notas anuladas', () => {
    expect(() => exigirAnulable(limpio)).not.toThrow();
    expect(() => exigirAnulable({ ...limpio, procesadoEnElDestino: true, notasEnTotal: 2 })).not.toThrow();
  });

  it('lo anulado y lo que tiene notas vigentes no se anula', () => {
    expect(() => exigirAnulable({ ...limpio, anulado: true })).toThrow(DocumentoYaAnulado);
    expect(() => exigirAnulable({ ...limpio, notasVigentes: 1, notasEnTotal: 1 })).toThrow(DocumentoConNotasVigentes);
  });
});

describe('eliminar un documento', () => {
  it('solo lo limpio: vigente, sin procesar y sin ninguna nota', () => {
    expect(() => exigirEliminable(limpio)).not.toThrow();
    expect(() => exigirEliminable({ ...limpio, anulado: true })).toThrow(DocumentoYaAnulado);
    expect(() => exigirEliminable({ ...limpio, procesadoEnElDestino: true })).toThrow(DocumentoProcesado);
    expect(() => exigirEliminable({ ...limpio, notasEnTotal: 1 })).toThrow(DocumentoConNotas);
  });

  it('las acciones de la pantalla salen de los mismos hechos', () => {
    expect(accionesDeDocumento(limpio)).toEqual({ puedeAnular: true, puedeEliminar: true });
    expect(accionesDeDocumento({ ...limpio, procesadoEnElDestino: true })).toEqual({
      puedeAnular: true,
      puedeEliminar: false,
    });
    expect(accionesDeDocumento({ ...limpio, anulado: true })).toEqual({ puedeAnular: false, puedeEliminar: false });
  });
});

describe('causa, motivo y fecha de la anulación', () => {
  it('recorta el motivo y lo limita a 300', () => {
    expect(motivoDeAnulacionValido('  Error  ')).toBe('Error');
    expect(() => motivoDeAnulacionValido('   ')).toThrow(MotivoDeAnulacionInvalido);
    expect(() => motivoDeAnulacionValido('x'.repeat(301))).toThrow(MotivoDeAnulacionInvalido);
  });

  it('la causa es de la lista', () => {
    expect(causaDeAnulacionValida('fel_anulada_en_la_sat')).toBe('fel_anulada_en_la_sat');
    expect(() => causaDeAnulacionValida('porque sí')).toThrow(CausaDeAnulacionInvalida);
  });

  it('con la FEL anulada en la SAT la fecha es obligatoria y va entre la emisión y hoy', () => {
    const contexto = { emision: '2026-03-10', hoy: '2026-04-02' };
    const sat = (fecha: string | null) => ({ causa: 'fel_anulada_en_la_sat' as const, fecha });

    expect(fechaDeAnulacionValida(sat('2026-03-10'), contexto)).toBe('2026-03-10');
    expect(() => fechaDeAnulacionValida(sat(null), contexto)).toThrow(FechaDeAnulacionRequerida);
    expect(() => fechaDeAnulacionValida(sat('2026-03-09'), contexto)).toThrow(FechaDeAnulacionInvalida);
    expect(() => fechaDeAnulacionValida(sat('2026-04-03'), contexto)).toThrow(FechaDeAnulacionInvalida);
  });

  it('con las otras causas la fecha es la del registro interno (hoy), aunque venga otra', () => {
    const contexto = { emision: '2026-03-10', hoy: '2026-04-02' };

    expect(fechaDeAnulacionValida({ causa: 'error_de_captura', fecha: null }, contexto)).toBe('2026-04-02');
    expect(fechaDeAnulacionValida({ causa: 'no_corresponde_a_la_empresa', fecha: '2026-03-15' }, contexto)).toBe(
      '2026-04-02',
    );
  });
});

describe('anular una nota de débito', () => {
  const factura = {
    total: 11200,
    iva: 1200,
    totalDeNotasDeCredito: 11200,
    ivaDeNotasDeCredito: 1200,
    cantidadDeNotasDeCredito: 1,
    totalDeNotasDeDebito: 1120,
    ivaDeNotasDeDebito: 120,
  };

  it('las notas de crédito deben seguir cabiendo sin ella', () => {
    expect(() => exigirQueLasNotasDeCreditoSigaCabiendo(factura, { total: 1120, iva: 120 })).not.toThrow();
    const intento = () =>
      exigirQueLasNotasDeCreditoSigaCabiendo({ ...factura, totalDeNotasDeCredito: 12000 }, { total: 1120, iva: 120 });

    expect(intento).toThrow(NotaDeDebitoSostieneNotasDeCredito);
  });

  it('usa la misma tolerancia de redondeo que al registrar las notas', () => {
    const conRedondeo = {
      total: 10000,
      iva: 1071,
      totalDeNotasDeCredito: 10000,
      ivaDeNotasDeCredito: 1072,
      cantidadDeNotasDeCredito: 1,
      totalDeNotasDeDebito: 1000,
      ivaDeNotasDeDebito: 107,
    };

    expect(() => exigirQueLasNotasDeCreditoSigaCabiendo(conRedondeo, { total: 1000, iva: 107 })).not.toThrow();
    const pasada = { ...conRedondeo, ivaDeNotasDeCredito: 1077 };
    expect(() => exigirQueLasNotasDeCreditoSigaCabiendo(pasada, { total: 1000, iva: 107 })).toThrow(
      NotaDeDebitoSostieneNotasDeCredito,
    );
  });

  it('anular la nota de débito con dos notas de crédito de Q50.00 sigue cabiendo, como al registrarlas', () => {
    const dosNotas = {
      total: 10000,
      iva: 1071,
      totalDeNotasDeCredito: 10000,
      ivaDeNotasDeCredito: 1072,
      cantidadDeNotasDeCredito: 2,
      totalDeNotasDeDebito: 1000,
      ivaDeNotasDeDebito: 107,
    };

    expect(() => exigirQueLasNotasDeCreditoSigaCabiendo(dosNotas, { total: 1000, iva: 107 })).not.toThrow();
  });
});
