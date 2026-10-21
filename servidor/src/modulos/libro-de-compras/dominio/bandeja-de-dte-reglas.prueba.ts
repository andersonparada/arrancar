import { describe, expect, it } from 'vitest';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import { cambiosDefinidos, exigirBorradorValido } from './borrador-del-dte.js';
import { exigirConfirmable } from './confirmabilidad-del-dte.js';
import { DteRecibido, type DatosDelDte } from './dte-recibido.js';
import {
  BorradorDeDteInvalido,
  DteAnuladoEnLaSat,
  DteNoEstaPendiente,
  FacturaSoloEnNotas,
  MontosEnColumnasDesconocidas,
} from './errores-de-bandeja.js';
import { columnasDesconocidasConMonto } from './montos-en-columnas-desconocidas.js';
import { tipoDePersonaDelNombre } from './tipo-de-persona-del-nombre.js';

const DATOS: DatosDelDte = {
  autorizacionFel: '6f1f3b0e-1c1a-4b57-9d33-0a1b2c3d4e5f',
  tipoDte: 'FACT',
  serie: 'A',
  numero: '1',
  fechaEmision: '2026-03-10',
  nitEmisor: '1234567',
  nombreEmisor: 'Proveedor',
  nitReceptor: '7654321',
  total: '112.00',
  iva: '12.00',
  idp: '0',
  otrosImpuestos: '0',
  otrosImpuestosDetalle: {},
  filaOriginal: { 'Columna rara': '25.00', Serie: 'A' },
  estadoSat: 'vigente',
  anuladoEnLaSatEl: null,
};

const fila = (cambios: Partial<DatosDelDte> = {}) =>
  DteRecibido.crear({
    empresaId: Identificador.nuevo<'Empresa'>(),
    loteId: crypto.randomUUID(),
    datos: { ...DATOS, ...cambios },
  });

describe('montos en columnas que el mapa no conoce', () => {
  it('cuenta una columna desconocida con un monto distinto de cero', () => {
    expect(columnasDesconocidasConMonto({ Rara: '1,250.50' }, ['Rara'])).toEqual(['Rara']);
    expect(columnasDesconocidasConMonto({ Rara: 'Q 5.00' }, ['Rara'])).toEqual(['Rara']);
    expect(columnasDesconocidasConMonto({ Rara: '-12' }, ['Rara'])).toEqual(['Rara']);
  });

  it('no cuenta el cero, el vacío, el texto ni las columnas que el mapa sí conoce', () => {
    const filaOriginal = { Cero: '0.00', Vacia: '', Texto: 'Sin novedad', Conocida: '99.00' };

    expect(columnasDesconocidasConMonto(filaOriginal, ['Cero', 'Vacia', 'Texto', 'Faltante'])).toEqual([]);
  });
});

describe('exigirConfirmable', () => {
  it('una fila pendiente, vigente y sin montos desconocidos se puede confirmar', () => {
    expect(() => exigirConfirmable(fila(), [])).not.toThrow();
    expect(() => exigirConfirmable(fila(), ['Otra'])).not.toThrow();
  });

  it('una fila anulada en la SAT no se confirma', () => {
    expect(() => exigirConfirmable(fila({ estadoSat: 'anulado' }), [])).toThrow(DteAnuladoEnLaSat);
  });

  it('una fila que ya no está pendiente no se confirma', () => {
    const descartada = fila();
    descartada.descartar({ motivo: 'No es nuestra', por: crypto.randomUUID(), en: new Date() });

    expect(() => exigirConfirmable(descartada, [])).toThrow(DteNoEstaPendiente);
  });

  it('una fila con un monto en una columna desconocida no se confirma en lote', () => {
    expect(() => exigirConfirmable(fila(), ['Columna rara'])).toThrow(MontosEnColumnasDesconocidas);
  });
});

describe('borrador de una fila', () => {
  const dte = { fechaEmision: '2026-03-10', tipoDte: 'FACT' } as const;

  it('la recepción no puede ser anterior a la emisión', () => {
    expect(() => exigirBorradorValido(dte, { fechaRecepcion: '2026-03-09' })).toThrow(BorradorDeDteInvalido);
    expect(() => exigirBorradorValido(dte, { fechaRecepcion: '2026-03-10' })).not.toThrow();
  });

  it('el período es un primer día de mes que no cae antes del mes de la emisión', () => {
    expect(() => exigirBorradorValido(dte, { periodo: '2026-03-15' })).toThrow(BorradorDeDteInvalido);
    expect(() => exigirBorradorValido(dte, { periodo: '2026-02-01' })).toThrow(BorradorDeDteInvalido);
    expect(() => exigirBorradorValido(dte, { periodo: '2026-03-01' })).not.toThrow();
    expect(() => exigirBorradorValido(dte, { periodo: '2026-04-01' })).not.toThrow();
  });

  it('solo una nota lleva factura afectada', () => {
    const facturaId = crypto.randomUUID();

    expect(() => exigirBorradorValido(dte, { documentoAfectadoId: facturaId })).toThrow(FacturaSoloEnNotas);
    expect(() => exigirBorradorValido({ ...dte, tipoDte: 'NCRE' }, { documentoAfectadoId: facturaId })).not.toThrow();
  });

  it('quitar un valor (null) es válido y lo que no viene no se toca', () => {
    expect(() =>
      exigirBorradorValido(dte, { fechaRecepcion: null, periodo: null, documentoAfectadoId: null }),
    ).not.toThrow();
    expect(cambiosDefinidos({ conceptoId: undefined, destino: null, noVinculado: true })).toEqual({
      destino: null,
      noVinculado: true,
    });
  });

  it('completar solo funciona mientras la fila está pendiente', () => {
    const pendiente = fila();
    pendiente.completar({ conceptoId: 'c1', noVinculado: true });

    expect(pendiente.instantanea()).toMatchObject({ conceptoId: 'c1', noVinculado: true });

    pendiente.descartar({ motivo: 'No es nuestra', por: crypto.randomUUID(), en: new Date() });
    expect(() => pendiente.completar({ conceptoId: 'c2' })).toThrow(DteNoEstaPendiente);
  });
});

describe('tipo de persona del proveedor nuevo', () => {
  it.each([
    'Agro del Norte, S.A.',
    'COMERCIAL LA ESPERANZA SOCIEDAD ANONIMA',
    'Servicios Rurales Limitada',
    'Distribuidora El Sol S. A.',
    'Compañía Agrícola del Valle',
    'Fundación Esperanza',
  ])('%s es jurídica', (nombre) => {
    expect(tipoDePersonaDelNombre(nombre)).toBe('juridica');
  });

  it.each(['Juan Pérez López', 'MARIA DE LOS ANGELES GARCIA', 'Salas Agrícolas'])('%s es individual', (nombre) => {
    expect(tipoDePersonaDelNombre(nombre)).toBe('individual');
  });
});
