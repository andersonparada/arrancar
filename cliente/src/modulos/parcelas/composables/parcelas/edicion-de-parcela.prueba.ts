import { describe, expect, it } from 'vitest';
import type { FichaDeParcela } from '../../servicios/parcelas.api';
import { medicionNueva } from '../mediciones/edicion-de-medicion';
import type { AjustesDeSuperficie } from '../superficie/unidades-de-superficie';
import {
  cambioDeParcela,
  datosDeParcela,
  edicionDe,
  edicionDeParcela,
  indiceEnviado,
  ligaNueva,
  mensajeDeInactivacion,
} from './edicion-de-parcela';

const AJUSTES: AjustesDeSuperficie = {
  factores: { metrosPorVara: 0.835905, varasCuadradasPorManzana: 10000, varasCuadradasPorCaballeria: 645816 },
  varasPorLadoDeCuerda: 25,
  unidadParaMostrar: 'manzana',
};

const ficha: FichaDeParcela = {
  id: 'p-1',
  localidadId: 'loc-1',
  localidadNombre: 'Finca El Carmen',
  parcelaMadreId: null,
  parcelaMadreCodigo: null,
  nivel: 1,
  tipoId: 'tipo-1',
  tipoNombre: 'Potrero',
  codigo: 'P-1',
  nombre: 'Potrero 1',
  formaDeTenencia: 'arrendada',
  superficieTotalM2: '6987.37',
  superficieUtilM2: null,
  latitud: '14.634915',
  longitud: '-90.506882',
  colindanciaNorte: 'Camino vecinal',
  colindanciaSur: null,
  colindanciaOriente: null,
  colindanciaPoniente: null,
  activo: true,
  observaciones: null,
  avisos: [],
  mediciones: [],
  inmuebles: [{ inmuebleId: 'inm-1', inmuebleNombre: 'Finca 123', superficieM2: '5000.00' }],
  hijasActivas: 0,
};

describe('formulario de parcela', () => {
  it('lo que se abre para editar se manda igual si no se cambia nada', () => {
    expect(cambioDeParcela(edicionDeParcela(ficha))).toEqual({
      tipoId: 'tipo-1',
      nombre: 'Potrero 1',
      formaDeTenencia: 'arrendada',
      latitud: '14.634915',
      longitud: '-90.506882',
      colindanciaNorte: 'Camino vecinal',
      colindanciaSur: null,
      colindanciaOriente: null,
      colindanciaPoniente: null,
      observaciones: null,
      inmuebles: [{ inmuebleId: 'inm-1', superficieM2: '5000.00' }],
    });
  });

  it('al editar no se vuelve a pedir la medición: esa se registra desde la ficha', () => {
    expect(edicionDeParcela(ficha)).toMatchObject({ id: 'p-1', conMedicion: false });
  });

  it('una subparcela nueva ya trae su localidad y su madre', () => {
    expect(edicionDe({ localidadId: 'loc-1', parcelaMadreId: 'p-1' })).toMatchObject({
      id: null,
      localidadId: 'loc-1',
      parcelaMadreId: 'p-1',
      formaDeTenencia: 'propia',
      conMedicion: true,
    });
  });

  it('las filas de inmuebles a medio llenar no se mandan', () => {
    const edicion = { ...edicionDe(), inmuebles: [ligaNueva(), { inmuebleId: 'inm-2', superficieM2: '' }] };

    expect(cambioDeParcela(edicion).inmuebles).toEqual([{ inmuebleId: 'inm-2', superficieM2: null }]);
  });

  it('al crear manda la localidad, la madre, el código y la primera medición', () => {
    const edicion = { ...edicionDe({ localidadId: 'loc-1', parcelaMadreId: 'p-0' }), codigo: 'P-2', nombre: 'Nuevo' };
    const medicion = { ...medicionNueva(AJUSTES), vigenteDesde: '2026-01-01', cifra: '2' };

    const datos = datosDeParcela(edicion, medicion);

    expect(datos).toMatchObject({ localidadId: 'loc-1', parcelaMadreId: 'p-0', codigo: 'P-2' });
    expect(datos.medicion).toMatchObject({ cantidadOriginal: '2', unidadOriginal: 'manzana' });
  });

  it('sin marcar la medición no se manda', () => {
    const edicion = { ...edicionDe(), conMedicion: false };

    expect(datosDeParcela(edicion, medicionNueva(AJUSTES)).medicion).toBeNull();
  });
});

describe('confirmación de inactivar', () => {
  it('avisa si tiene subparcelas activas', () => {
    expect(mensajeDeInactivacion('Potrero 1', 0)).not.toContain('subparcela');
    expect(mensajeDeInactivacion('Potrero 1', 1)).toContain('1 subparcela activa');
    expect(mensajeDeInactivacion('Potrero 1', 3)).toContain('3 subparcelas activas');
  });
});

describe('índice de una fila de inmuebles en el servidor', () => {
  const filas = [
    { inmuebleId: null, superficieM2: '' },
    { inmuebleId: 'a', superficieM2: '100' },
    { inmuebleId: 'b', superficieM2: '9999999999999' },
  ];

  it('cuenta solo las filas que se mandan: la B va en la posición 1 aunque esté en la tercera fila', () => {
    expect(indiceEnviado(filas, 1)).toBe(0);
    expect(indiceEnviado(filas, 2)).toBe(1);
  });

  it('una fila sin inmueble no se manda, así que no tiene error', () => {
    expect(indiceEnviado(filas, 0)).toBeNull();
    expect(indiceEnviado(filas, 7)).toBeNull();
  });
});
