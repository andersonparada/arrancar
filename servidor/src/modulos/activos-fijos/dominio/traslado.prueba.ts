import { describe, expect, it } from 'vitest';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import { TrasladoInvalido, TrasladoNoAnulable } from './errores-de-traslado.js';
import { Traslado, type DatosDeTraslado } from './traslado.js';

const empresa = Identificador.nuevo<'Empresa'>();
const boleta = { grupoId: crypto.randomUUID(), numero: 7, anioDeNumero: 2027 };
const datos = (cambios: Partial<DatosDeTraslado> = {}): DatosDeTraslado => ({
  fecha: '2027-06-10',
  localidadId: null,
  departamentoId: null,
  responsable: '  Marta López ',
  aBodega: false,
  recibidoPor: ' Marta López ',
  motivo: ' Entrega ',
  ...cambios,
});
const registrar = (cambios: Partial<DatosDeTraslado> = {}) =>
  Traslado.registrar({ empresaId: empresa, activoId: crypto.randomUUID(), ...boleta }, datos(cambios), '2027-06-15');

describe('Traslado', () => {
  it('limpia los textos y nace vigente con el número de su boleta', () => {
    expect(registrar().instantanea()).toMatchObject({
      responsable: 'Marta López',
      recibidoPor: 'Marta López',
      motivo: 'Entrega',
      estado: 'vigente',
      numero: 7,
    });
  });

  it('el responsable vacío queda sin responsable', () => {
    expect(registrar({ responsable: '  ' }).instantanea().responsable).toBeNull();
  });

  it.each([
    ['fecha futura', { fecha: '2027-06-16' }],
    ['sin quien recibe', { recibidoPor: ' ' }],
    ['sin motivo', { motivo: '' }],
    ['motivo muy largo', { motivo: 'x'.repeat(301) }],
    ['quien recibe muy largo', { recibidoPor: 'x'.repeat(151) }],
  ])('rechaza: %s', (_caso, cambios) => {
    expect(() => registrar(cambios)).toThrow(TrasladoInvalido);
  });

  it('se anula una sola vez, con motivo, y la fila queda como rastro', () => {
    const traslado = registrar();
    expect(() => traslado.anular({ motivo: ' ', usuarioId: 'u', ahora: new Date() })).toThrow(TrasladoInvalido);

    traslado.anular({ motivo: ' Error ', usuarioId: 'u1', ahora: new Date() });

    expect(traslado.instantanea()).toMatchObject({ estado: 'anulado', motivoDeAnulacion: 'Error', anuladoPor: 'u1' });
    expect(() => traslado.anular({ motivo: 'otra', usuarioId: 'u', ahora: new Date() })).toThrow(TrasladoNoAnulable);
  });
});
