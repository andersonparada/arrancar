import { describe, expect, it } from 'vitest';
import { normalizarElConteo, totalDelConteo } from './conteo-de-efectivo.js';
import {
  ArqueoConComprobanteRepuesto,
  ArqueoYaAnulado,
  ConteoInvalido,
  DatoDeDiferenciaQueNoAplica,
  DestinoDelFaltanteObligatorio,
  FechaDelArqueoInvalida,
  MotivoDeDiferenciaObligatorio,
  SeparacionDeFuncionesEnElArqueo,
} from './errores-de-arqueos.js';
import {
  avisoDeArqueoVencido,
  AVISO_DE_ARQUEO_DEL_CUSTODIO,
  diferenciaDelArqueo,
  exigirArqueoAnulable,
  exigirDiferenciaExplicada,
  exigirFechaDelArqueo,
  revisarLaSeparacionEnElArqueo,
} from './reglas-de-arqueos.js';

describe('el conteo de efectivo', () => {
  it('suma denominación por cantidad en centavos enteros', () => {
    const conteo = [
      { denominacionCentavos: 10000, cantidad: 3 },
      { denominacionCentavos: 25, cantidad: 3 },
      { denominacionCentavos: 1, cantidad: 7 },
    ];
    expect(totalDelConteo(conteo)).toBe(30_082);
  });

  it('quita las líneas en cero y ordena de mayor a menor', () => {
    const conteo = normalizarElConteo([
      { denominacionCentavos: 100, cantidad: 2 },
      { denominacionCentavos: 5000, cantidad: 0 },
      { denominacionCentavos: 20000, cantidad: 1 },
    ]);
    expect(conteo).toEqual([
      { denominacionCentavos: 20000, cantidad: 1 },
      { denominacionCentavos: 100, cantidad: 2 },
    ]);
  });

  it.each([
    [[{ denominacionCentavos: 3000, cantidad: 1 }]],
    [[{ denominacionCentavos: 100, cantidad: 1.5 }]],
    [[{ denominacionCentavos: 100, cantidad: -1 }]],
    [
      [
        { denominacionCentavos: 100, cantidad: 1 },
        { denominacionCentavos: 100, cantidad: 2 },
      ],
    ],
  ])('rechaza un conteo inválido', (conteo) => {
    expect(() => normalizarElConteo(conteo)).toThrow(ConteoInvalido);
  });
});

describe('la fecha del arqueo', () => {
  const contexto = {
    hoy: '2026-11-18',
    ahora: new Date('2026-11-18T20:00:00Z'),
    fondo: { fechaDeApertura: '2026-11-01' },
  };

  it('acepta un conteo de hoy o anterior', () => {
    const realizadoEn = new Date('2026-11-10T15:00:00Z');
    expect(() => exigirFechaDelArqueo({ fecha: '2026-11-10', realizadoEn }, contexto)).not.toThrow();
  });

  it('rechaza el futuro y lo anterior a la apertura', () => {
    const futuro = new Date('2026-11-18T22:00:00Z');
    expect(() => exigirFechaDelArqueo({ fecha: '2026-11-18', realizadoEn: futuro }, contexto)).toThrow(
      FechaDelArqueoInvalida,
    );
    const antes = new Date('2026-10-31T15:00:00Z');
    expect(() => exigirFechaDelArqueo({ fecha: '2026-10-31', realizadoEn: antes }, contexto)).toThrow(
      FechaDelArqueoInvalida,
    );
  });
});

describe('la diferencia del arqueo', () => {
  it('suma los cheques por cambiar a lo contado', () => {
    const diferencia = diferenciaDelArqueo({
      contadoCentavos: 90_000,
      valoresPorCambiarCentavos: 5_000,
      esperadoCentavos: 100_000,
    });
    expect(diferencia).toBe(-5_000);
  });

  it('sin diferencia no admite motivo ni destino', () => {
    expect(exigirDiferenciaExplicada({ diferenciaCentavos: 0, motivo: '  ', destino: null })).toEqual({
      motivo: null,
      destino: null,
    });
    expect(() => exigirDiferenciaExplicada({ diferenciaCentavos: 0, motivo: 'x', destino: null })).toThrow(
      DatoDeDiferenciaQueNoAplica,
    );
    expect(() => exigirDiferenciaExplicada({ diferenciaCentavos: 0, motivo: null, destino: 'perdida' })).toThrow(
      DatoDeDiferenciaQueNoAplica,
    );
  });

  it('un faltante pide motivo y destino', () => {
    expect(() => exigirDiferenciaExplicada({ diferenciaCentavos: -100, motivo: '', destino: 'perdida' })).toThrow(
      MotivoDeDiferenciaObligatorio,
    );
    expect(() => exigirDiferenciaExplicada({ diferenciaCentavos: -100, motivo: 'Faltó', destino: null })).toThrow(
      DestinoDelFaltanteObligatorio,
    );
    const resultado = exigirDiferenciaExplicada({ diferenciaCentavos: -100, motivo: ' Faltó ', destino: 'perdida' });
    expect(resultado).toEqual({ motivo: 'Faltó', destino: 'perdida' });
  });

  it('un sobrante pide motivo y no lleva destino', () => {
    expect(exigirDiferenciaExplicada({ diferenciaCentavos: 100, motivo: 'Sobra', destino: null }).motivo).toBe('Sobra');
    expect(() => exigirDiferenciaExplicada({ diferenciaCentavos: 100, motivo: 'Sobra', destino: 'perdida' })).toThrow(
      DatoDeDiferenciaQueNoAplica,
    );
  });
});

describe('la separación de funciones del arqueo', () => {
  it('no dice nada si quien arquea no es el custodio', () => {
    expect(revisarLaSeparacionEnElArqueo(false, 'bloquear')).toBeNull();
  });

  it('avisa o bloquea según la configuración', () => {
    expect(revisarLaSeparacionEnElArqueo(true, 'avisar')).toBe(AVISO_DE_ARQUEO_DEL_CUSTODIO);
    expect(() => revisarLaSeparacionEnElArqueo(true, 'bloquear')).toThrow(SeparacionDeFuncionesEnElArqueo);
  });
});

describe('anular un arqueo', () => {
  it('rechaza el ya anulado y el que tiene su ajuste repuesto', () => {
    expect(() => exigirArqueoAnulable({ estado: 'anulado', numero: 2 }, null)).toThrow(ArqueoYaAnulado);
    expect(() => exigirArqueoAnulable({ estado: 'vigente', numero: 2 }, 5)).toThrow(ArqueoConComprobanteRepuesto);
    expect(() => exigirArqueoAnulable({ estado: 'vigente', numero: 2 }, null)).not.toThrow();
  });
});

describe('el aviso «sin arqueo»', () => {
  const fondo = { fechaDeApertura: '2026-09-01', estado: 'abierto' as const };

  it('avisa si pasaron más de los días desde el último arqueo', () => {
    const aviso = avisoDeArqueoVencido({
      fondo,
      ultimoArqueo: '2026-10-01T15:00:00Z',
      hoy: '2026-11-18',
      diasParaAvisar: 30,
    });
    expect(aviso).toBe('Hace 48 días que no se arquea este fondo.');
  });

  it('cuenta desde la apertura si nunca se arqueó', () => {
    const aviso = avisoDeArqueoVencido({ fondo, ultimoArqueo: null, hoy: '2026-11-18', diasParaAvisar: 30 });
    expect(aviso).toBe('El fondo lleva 78 días sin arquearse.');
  });

  it('no avisa dentro del plazo, con 0 días ni con el fondo cerrado', () => {
    const base = { fondo, ultimoArqueo: '2026-11-10T00:00:00Z', hoy: '2026-11-18', diasParaAvisar: 30 };
    expect(avisoDeArqueoVencido(base)).toBeNull();
    expect(avisoDeArqueoVencido({ ...base, ultimoArqueo: null, diasParaAvisar: 0 })).toBeNull();
    expect(avisoDeArqueoVencido({ ...base, ultimoArqueo: null, fondo: { ...fondo, estado: 'cerrado' } })).toBeNull();
  });
});
