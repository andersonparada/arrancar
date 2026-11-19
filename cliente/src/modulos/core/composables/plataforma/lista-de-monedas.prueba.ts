import { describe, expect, it } from 'vitest';
import type { ConsultaDeLaLista, Moneda, MuestraDelBanguat } from '../../servicios/monedas.api';
import type { EstadoDeLaSerie } from '../../servicios/tipos-de-cambio.api';
import {
  avisoDeAtraso,
  filtrarMonedas,
  mensajeDeActualizacion,
  mensajeDeMuestra,
  monedaInicial,
  monedasParaTipos,
  textoDelCodigo,
  ultimaActualizacionDeLaLista,
} from './lista-de-monedas';

const moneda = (codigo: string, nombre: string, extra: Partial<Moneda> = {}): Moneda => ({
  codigo,
  nombre,
  simbolo: codigo,
  decimales: 2,
  activa: false,
  codigoBanguat: null,
  letrasSingular: null,
  letrasPlural: null,
  descripcionBanguat: null,
  tieneSerieDelBanguat: false,
  ...extra,
});

const monedas = [
  moneda('USD', 'Dólar', { activa: true, codigoBanguat: 2, descripcionBanguat: 'Dólares de EE.UU.' }),
  moneda('GTQ', 'Quetzal', { activa: true }),
  moneda('EUR', 'Euro', { codigoBanguat: 28, descripcionBanguat: 'Euro' }),
  moneda('GBP', 'Libra esterlina'),
];

describe('filtrarMonedas', () => {
  it('sin filtros trae todas, por nombre', () => {
    expect(filtrarMonedas(monedas, { conCodigo: false, activas: false }).map((m) => m.codigo)).toEqual([
      'USD',
      'EUR',
      'GBP',
      'GTQ',
    ]);
  });

  it('«Con código» y «Activas» se combinan', () => {
    expect(filtrarMonedas(monedas, { conCodigo: true, activas: false }).map((m) => m.codigo)).toEqual(['USD', 'EUR']);
    expect(filtrarMonedas(monedas, { conCodigo: true, activas: true }).map((m) => m.codigo)).toEqual(['USD']);
  });

  it('no cambia la lista original', () => {
    const copia = [...monedas];
    filtrarMonedas(monedas, { conCodigo: false, activas: false });
    expect(monedas).toEqual(copia);
  });
});

describe('textoDelCodigo', () => {
  it('«Euro (28)», o una raya sin código', () => {
    expect(textoDelCodigo(monedas[2]!)).toBe('Euro (28)');
    expect(textoDelCodigo(monedas[3]!)).toBe('—');
    expect(textoDelCodigo(moneda('JPY', 'Yen', { codigoBanguat: 7 }))).toBe('Código 7');
  });
});

const serie = (extra: Partial<EstadoDeLaSerie>): EstadoDeLaSerie => ({
  moneda: 'EUR',
  nombre: 'Euro',
  codigoBanguat: 28,
  activa: true,
  ultimaFecha: '2026-11-10',
  diasDeAtraso: 5,
  atrasada: true,
  ...extra,
});

describe('avisoDeAtraso', () => {
  it('el dólar cuenta días y las demás, días hábiles', () => {
    expect(avisoDeAtraso(serie({ codigoBanguat: 2, diasDeAtraso: 2 }))).toBe('Sin tipo nuevo hace 2 días.');
    expect(avisoDeAtraso(serie({ diasDeAtraso: 4 }))).toBe('Sin tipo nuevo hace 4 días hábiles.');
    expect(avisoDeAtraso(serie({ diasDeAtraso: 1 }))).toBe('Sin tipo nuevo hace 1 día hábil.');
  });

  it('una serie que nunca se cargó lo dice; una al día o ausente no avisa', () => {
    expect(avisoDeAtraso(serie({ diasDeAtraso: null, ultimaFecha: null }))).toBe(
      'Nunca se ha cargado su tipo de cambio.',
    );
    expect(avisoDeAtraso(serie({ atrasada: false }))).toBeNull();
    expect(avisoDeAtraso(undefined)).toBeNull();
  });
});

describe('ultimaActualizacionDeLaLista', () => {
  it('es la fecha más reciente que dio el Banguat', () => {
    const opcion = (vista: string) => ({
      codigo: 1,
      descripcion: 'x',
      disponible: true,
      excluida: false,
      asignadaA: null,
      vistaPorUltimaVez: vista,
    });

    expect(ultimaActualizacionDeLaLista([opcion('2026-11-10T00:00:00Z'), opcion('2026-11-18T00:00:00Z')])).toBe(
      '2026-11-18T00:00:00Z',
    );
    expect(ultimaActualizacionDeLaLista([])).toBeNull();
  });
});

const consulta = (extra: Partial<ConsultaDeLaLista>): ConsultaDeLaLista => ({
  resultado: 'exito',
  nuevas: 0,
  noDisponibles: 0,
  detalle: null,
  hechaEn: '2026-11-18T12:00:00Z',
  ...extra,
});

describe('mensajeDeActualizacion', () => {
  it('cuenta lo nuevo y lo que ya no está', () => {
    expect(mensajeDeActualizacion(consulta({ nuevas: 3, noDisponibles: 1 }))).toEqual({
      tipo: 'exito',
      mensaje: 'Lista actualizada: 3 monedas nuevas y 1 ya no disponible.',
    });
    expect(mensajeDeActualizacion(consulta({ nuevas: 1 })).mensaje).toBe('Lista actualizada: 1 moneda nueva.');
  });

  it('sin cambios dice que ya estaba al día', () => {
    expect(mensajeDeActualizacion(consulta({})).mensaje).toBe('La lista ya estaba al día.');
  });

  it('un Banguat caído o vacío no cambia la lista y se dice cómo seguir', () => {
    expect(mensajeDeActualizacion(consulta({ resultado: 'error' }))).toMatchObject({ tipo: 'error' });
    expect(mensajeDeActualizacion(consulta({ resultado: 'sin_datos' }))).toMatchObject({ tipo: 'info' });
  });
});

const muestra = (extra: Partial<MuestraDelBanguat>): MuestraDelBanguat => ({
  codigo: 28,
  descripcion: 'Euro',
  moneda: 'EUR',
  desde: '2026-11-12',
  hasta: '2026-11-18',
  resultado: 'exito',
  valores: [{ fecha: '2026-11-17', referencia: '8.80000000' }],
  rechazadas: [],
  mensaje: null,
  ...extra,
});

describe('mensajeDeMuestra', () => {
  it('con valores dice cuántos', () => {
    expect(mensajeDeMuestra(muestra({}))).toEqual({ tipo: 'exito', mensaje: '1 valor en los últimos 7 días.' });
  });

  it('sin valores, con error y con compra distinta de venta, dice qué hacer', () => {
    expect(mensajeDeMuestra(muestra({ resultado: 'sin_datos', valores: [] })).tipo).toBe('info');
    expect(mensajeDeMuestra(muestra({ resultado: 'error', valores: [] })).tipo).toBe('error');
    expect(mensajeDeMuestra(muestra({ resultado: 'valor_ambiguo', valores: [] })).mensaje).toMatch(/compra y venta/);
  });
});

describe('monedas para los tipos de cambio', () => {
  it('ofrece las extranjeras activas o con código, por nombre, y nunca el quetzal', () => {
    expect(monedasParaTipos(monedas).map((m) => m.codigo)).toEqual(['USD', 'EUR']);
  });

  it('abre con el dólar; sin dólar, con la primera; sin ninguna, vacío', () => {
    expect(monedaInicial(monedas)).toBe('USD');
    expect(monedaInicial(monedas.filter((m) => m.codigo !== 'USD'))).toBe('EUR');
    expect(monedaInicial([monedas[1]!, monedas[3]!])).toBe('');
  });
});
