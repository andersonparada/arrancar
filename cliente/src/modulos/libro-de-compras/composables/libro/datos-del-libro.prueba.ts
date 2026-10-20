import { describe, expect, it } from 'vitest';
import type { ResumenDelLibro } from '../../servicios/libro.api';
import {
  columnasDelLibro,
  documentosPorTipo,
  esNegativo,
  ivaSinCreditoPorMotivo,
  lineasDeCombustibles,
  nombreDelTipoDte,
  numeroDeDocumento,
  opcionesDePeriodoDelLibro,
  periodoAnterior,
  textoDeCausaDeAnulacion,
} from './datos-del-libro';

describe('periodos del libro', () => {
  it('el período por omisión es el mes anterior', () => {
    expect(periodoAnterior(new Date(2026, 9, 20))).toBe('2026-09');
  });

  it('en enero el mes anterior es diciembre del año pasado', () => {
    expect(periodoAnterior(new Date(2026, 0, 5))).toBe('2025-12');
  });

  it('ofrece 36 meses desde el actual y agrega uno antiguo para que tenga etiqueta', () => {
    const opciones = opcionesDePeriodoDelLibro(new Date(2026, 9, 20), '2020-01');
    expect(opciones).toHaveLength(37);
    expect(opciones[0]).toEqual({ valor: '2026-10', texto: 'Octubre de 2026' });
    expect(opciones.at(-1)?.valor).toBe('2020-01');
  });
});

describe('columnas', () => {
  it('el libro completo trae el motivo, el IVA con y sin crédito', () => {
    const claves = columnasDelLibro('completo').map((c) => c.clave);
    expect(claves).toContain('siglaDelMotivo');
    expect(claves).toContain('ivaConCredito');
    expect(claves).not.toContain('ivaInformativo');
  });

  it('el simplificado solo trae bienes, servicios, exento, IDP, IVA informativo y total', () => {
    const dinero = columnasDelLibro('simplificado')
      .filter((c) => c.dinero)
      .map((c) => c.clave);
    expect(dinero).toEqual(['bienes', 'servicios', 'exentoYNoAfecto', 'idp', 'ivaInformativo', 'total']);
  });

  it('las columnas de texto van antes que las de dinero (el pie usa colspan)', () => {
    for (const tipo of ['completo', 'simplificado'] as const) {
      const banderas = columnasDelLibro(tipo).map((c) => c.dinero);
      expect(banderas.indexOf(true)).toBe(banderas.filter((d) => !d).length);
    }
  });
});

describe('formas de mostrar', () => {
  it('un monto negativo empieza con signo menos y no es cero', () => {
    expect(esNegativo('-112.00')).toBe(true);
    expect(esNegativo('112.00')).toBe(false);
    expect(esNegativo('-0.00')).toBe(false);
    expect(esNegativo('0.00')).toBe(false);
  });

  it('el número de documento lleva la serie solo si existe', () => {
    expect(numeroDeDocumento({ serie: 'A', numero: '12' })).toBe('A-12');
    expect(numeroDeDocumento({ serie: null, numero: '12' })).toBe('12');
  });

  it('el tipo de DTE se muestra con su nombre', () => {
    expect(nombreDelTipoDte('NCRE')).toBe('Nota de crédito');
    expect(nombreDelTipoDte('XXXX')).toBe('XXXX');
    expect(nombreDelTipoDte(null)).toBe('Sin código de la SAT');
  });

  it('la causa de anulación se traduce y lo desconocido queda tal cual', () => {
    expect(textoDeCausaDeAnulacion('error_de_captura')).toBe('Error de captura');
    expect(textoDeCausaDeAnulacion('otra')).toBe('otra');
    expect(textoDeCausaDeAnulacion(null)).toBe('');
  });
});

const montos = {
  bienes: '0.00',
  servicios: '0.00',
  combustibles: '0.00',
  pequenoContribuyente: '0.00',
  primarioPecuario: '0.00',
  exentoYNoAfecto: '0.00',
  idp: '0.00',
  ivaConCredito: '0.00',
  ivaSinCredito: '0.00',
  ivaInformativo: '0.00',
  total: '0.00',
};

const resumen = (cambios: Partial<ResumenDelLibro>): ResumenDelLibro => ({
  totales: montos,
  porTipoDte: [],
  creditoFiscalDelPeriodo: '0.00',
  ivaSinCreditoPorMotivo: [],
  combustibles: { base: '0.00', idp: '0.00', iva: '0.00', exentoPorDecreto: '0.00' },
  ...cambios,
});

describe('resumen mensual', () => {
  it('el IVA sin crédito sale por motivo, en orden de nombre', () => {
    const lineas = ivaSinCreditoPorMotivo(
      resumen({
        ivaSinCreditoPorMotivo: [
          { motivo: 'no_vinculado', ivaSinCredito: '5.00' },
          { motivo: 'fuera_de_plazo', ivaSinCredito: '12.00' },
        ],
      }),
    );
    expect(lineas.map((l) => l.texto)).toEqual(['Fuera de plazo', 'No vinculado a operaciones gravadas']);
  });

  it('los documentos por tipo llevan nombre y cantidad, en orden de nombre', () => {
    const lineas = documentosPorTipo(
      resumen({
        porTipoDte: [
          { tipoDte: 'NCRE', cantidad: 1, total: '-10.00' },
          { tipoDte: 'FACT', cantidad: 4, total: '500.00' },
          { tipoDte: null, cantidad: 2, total: '20.00' },
        ],
      }),
    );
    expect(lineas.map((l) => [l.texto, l.cantidad])).toEqual([
      ['Factura', 4],
      ['Nota de crédito', 1],
      ['Sin código de la SAT', 2],
    ]);
  });

  it('los combustibles solo se muestran si hubo alguno', () => {
    expect(lineasDeCombustibles(resumen({}).combustibles)).toEqual([]);
    const con = lineasDeCombustibles({ base: '100.00', idp: '10.00', iva: '12.00', exentoPorDecreto: '0.00' });
    expect(con).toHaveLength(4);
  });
});
