import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Medicion } from '../../servicios/mediciones.api';
import type { FichaDeParcela } from '../../servicios/parcelas.api';
import { detallesDeMedicion } from '../mediciones/detalles-de-medicion';
import { detallesDeParcela, enlacesDelPunto, insigniaDeParcela, resumenDeParcela } from './detalles-de-parcela';
import { inmueblesParaElegir, nombreDeMadre, opcionesDeParcela } from './usar-referencias-de-parcela';

// Los formatos de cantidades y fechas leen la sesión (Pinia).
beforeEach(() => setActivePinia(createPinia()));

const mostrar = (m2: string | null) => (m2 === null ? '—' : `${m2} m²`);

const parcela: FichaDeParcela = {
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
  inmuebles: [],
  hijasActivas: 0,
};

describe('tarjeta y ficha de la parcela', () => {
  it('la tarjeta muestra el tipo, la tenencia y las superficies; sin medición, una raya', () => {
    expect(resumenDeParcela(parcela, mostrar)).toEqual([
      { etiqueta: 'Tipo', valor: 'Potrero' },
      { etiqueta: 'Tenencia', valor: 'Arrendada' },
      { etiqueta: 'Superficie total', valor: '6987.37 m²' },
      { etiqueta: 'Superficie útil', valor: '—' },
    ]);
  });

  it('la ficha agrega el punto, las colindancias y las observaciones', () => {
    const detalles = detallesDeParcela(parcela, mostrar);

    expect(detalles.find(({ etiqueta }) => etiqueta === 'Punto en el mapa')?.valor).toBe('14.634915, -90.506882');
    expect(detalles.find(({ etiqueta }) => etiqueta === 'Colinda al norte con')?.valor).toBe('Camino vecinal');
    expect(detalles.find(({ etiqueta }) => etiqueta === 'Observaciones')).toMatchObject({ valor: '—', largo: true });
  });

  it('la marca de la lista avisa de los avisos y de la tenencia arrendada', () => {
    expect(insigniaDeParcela(parcela)).toBe('Arrendada');
    expect(insigniaDeParcela({ ...parcela, formaDeTenencia: 'propia' })).toBeUndefined();
    expect(insigniaDeParcela({ ...parcela, avisos: ['El punto cae fuera de Guatemala.'] })).toBe('Con aviso');
  });

  it('los enlaces del mapa solo existen con punto', () => {
    expect(enlacesDelPunto(parcela)).toEqual({
      geo: 'geo:14.634915,-90.506882',
      mapa: 'https://www.openstreetmap.org/?mlat=14.634915&mlon=-90.506882#map=17/14.634915/-90.506882',
    });
    expect(enlacesDelPunto({ ...parcela, latitud: null, longitud: null })).toBeNull();
  });
});

describe('tarjeta de la medición', () => {
  const medicion: Medicion = {
    id: 'm-1',
    parcelaId: 'p-1',
    vigenteDesde: '2026-01-15',
    fuente: 'plano_topografico',
    superficieTotalM2: '6987.37',
    superficieUtilM2: '6987.37',
    cantidadOriginal: '16.0000',
    unidadOriginal: 'cuerda',
    varasPorLadoDeCuerda: 25,
    documento: 'Plano 2019',
    estado: 'vigente',
    anuladaEn: null,
    motivoDeAnulacion: null,
  };

  it('dice la cifra original con sus varas por lado y la fuente', () => {
    const detalles = detallesDeMedicion(medicion, mostrar);

    expect(detalles.find(({ etiqueta }) => etiqueta === 'Cifra original')?.valor).toBe(
      '16.0000 cda de 25 varas por lado',
    );
    expect(detalles.find(({ etiqueta }) => etiqueta === 'Fuente')?.valor).toBe('Plano topográfico');
    expect(detalles).toHaveLength(5);
  });

  it('una medición anulada dice cuándo y por qué', () => {
    const anulada = { ...medicion, estado: 'anulada' as const, anuladaEn: '2026-02-01', motivoDeAnulacion: 'Error' };

    expect(detallesDeMedicion(anulada, mostrar).at(-1)).toMatchObject({ valor: 'Error', largo: true });
  });
});

describe('opciones de los selectores', () => {
  it('la madre se escribe con su código y una sangría según el nivel', () => {
    expect(nombreDeMadre({ ...parcela, nivel: 1 })).toBe('P-1 · Potrero 1');
    expect(nombreDeMadre({ ...parcela, nivel: 3 })).toBe('— — P-1 · Potrero 1');
  });

  it('los inmuebles ligados que ya no están activos siguen ofreciéndose, por nombre y sin repetir', () => {
    const activos = [
      { id: 'b', nombre: 'Finca Beta' },
      { id: 'a', nombre: 'Finca Alfa' },
    ];
    const ligados = [
      { inmuebleId: 'a', inmuebleNombre: 'Finca Alfa', superficieM2: null },
      { inmuebleId: 'c', inmuebleNombre: 'Finca Antigua', superficieM2: null },
    ];

    expect(inmueblesParaElegir(activos, ligados).map(({ nombre }) => nombre)).toEqual([
      'Finca Alfa',
      'Finca Antigua',
      'Finca Beta',
    ]);
  });

  it('el tipo inactivo solo se ofrece si es el que la parcela ya tiene', () => {
    const tipos = [
      { id: 't1', nombre: 'Potrero', activo: true },
      { id: 't2', nombre: 'Lote viejo', activo: false },
    ];
    const fuentes = { catalogos: { localidades: [], inmuebles: [] }, tipos, madres: [] };

    expect(opcionesDeParcela(fuentes, null, []).tipoId.map(({ valor }) => valor)).toEqual([null, 't1']);
    expect(opcionesDeParcela(fuentes, 't2', []).tipoId.map(({ valor }) => valor)).toEqual([null, 't1', 't2']);
    expect(opcionesDeParcela(fuentes, null, []).parcelaMadreId[0]).toMatchObject({ valor: null });
  });
});
