import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  alCambiarABodega,
  datosDeTraslado,
  edicionDeTrasladoNueva,
  erroresDeTraslado,
  mensajeDeTraslado,
  numeroDeBoleta,
} from './edicion-de-traslado';
import { mensajeDeAnulacionDeBoleta } from './usar-anulacion-de-traslado';

beforeEach(() => setActivePinia(createPinia()));

const activos = [{ id: 'a1', codigo: 'AF-0001', descripcion: 'Tractor' }];
const llena = () => ({
  ...edicionDeTrasladoNueva('2026-11-20'),
  recibidoPor: ' Juan Pérez ',
  motivo: ' Entrega a la finca ',
  responsable: ' ',
});

describe('traslado', () => {
  it('empieza con la fecha dada y sin bodega', () => {
    expect(edicionDeTrasladoNueva('2026-11-20')).toMatchObject({
      fecha: '2026-11-20',
      aBodega: false,
      marcarOcioso: false,
    });
  });

  it('pide quién recibe y el motivo, diciendo cómo corregir', () => {
    const errores = erroresDeTraslado(edicionDeTrasladoNueva('2026-11-20'));
    expect(Object.keys(errores).sort()).toEqual(['motivo', 'recibidoPor']);
    expect(erroresDeTraslado(llena())).toEqual({});
  });

  it('manda lo vacío como null y un renglón por activo', () => {
    expect(datosDeTraslado(activos, llena())).toMatchObject({
      recibidoPor: 'Juan Pérez',
      motivo: 'Entrega a la finca',
      responsable: null,
      localidadId: null,
      renglones: [{ activoId: 'a1' }],
    });
  });

  it('«Marcar como ocioso» solo vale con la bodega', () => {
    const edicion = { ...llena(), aBodega: true, marcarOcioso: true };
    expect(datosDeTraslado(activos, edicion).marcarOcioso).toBe(true);
    edicion.aBodega = false;
    alCambiarABodega(edicion);
    expect(edicion.marcarOcioso).toBe(false);
    expect(datosDeTraslado(activos, { ...edicion, marcarOcioso: true }).marcarOcioso).toBe(false);
  });

  it('numera la boleta con año y correlativo', () => {
    expect(numeroDeBoleta(12, 2027)).toBe('2027-0012');
  });

  it('el resumen dice qué, adónde y quién recibe', () => {
    const uno = mensajeDeTraslado(activos, llena(), { localidad: 'Finca Norte', departamento: 'Bodega' });
    expect(uno).toContain('AF-0001 · Tractor');
    expect(uno).toContain('Finca Norte · Bodega');
    expect(uno).toContain('Recibe Juan Pérez');
    const varios = mensajeDeTraslado(
      [...activos, { id: 'a2', codigo: 'AF-0002', descripcion: 'Arado' }],
      { ...llena(), aBodega: true, marcarOcioso: true },
      { localidad: null, departamento: null },
    );
    expect(varios).toContain('2 activos');
    expect(varios).toContain('la bodega de activos (la misma localidad y departamento)');
    expect(varios).toContain('ociosos');
  });

  it('explica la anulación de la boleta', () => {
    const texto = mensajeDeAnulacionDeBoleta({ grupoId: 'g', numero: 3, anioDeNumero: 2026, fecha: '2026-11-01' });
    expect(texto).toContain('2026-0003');
    expect(texto).toContain('último traslado');
  });
});
