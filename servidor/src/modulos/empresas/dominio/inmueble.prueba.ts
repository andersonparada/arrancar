import { describe, expect, it } from 'vitest';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import { Inmueble, InmuebleInvalido, InmuebleRegistroIncompleto, type DatosDeInmueble } from './inmueble.js';

const empresaId = Identificador.nuevo<'Empresa'>();

const inscrito = (cambios: Partial<DatosDeInmueble> = {}): DatosDeInmueble => ({
  nombre: '  Finca El Carmen ',
  situacionRegistral: 'inscrito',
  registro: 'general',
  numeroDeFinca: '1234',
  folio: '56',
  libro: '345E',
  departamentoRegistral: '05',
  documentoPosesorio: null,
  titulacionSupletoriaEnTramite: false,
  titularidad: 'propia',
  porcentajeDeCopropiedad: null,
  titular: null,
  matriculaFiscal: null,
  administraIusi: null,
  codigoCatastral: null,
  departamentoCodigo: null,
  municipioCodigo: null,
  direccion: null,
  superficieRegistralM2: null,
  cantidadOriginal: null,
  unidadOriginal: null,
  varasPorLadoDeCuerda: null,
  localidadId: null,
  observaciones: null,
  ...cambios,
});

const posesorio = (cambios: Partial<DatosDeInmueble> = {}) =>
  inscrito({
    situacionRegistral: 'posesorio',
    registro: null,
    numeroDeFinca: null,
    folio: null,
    libro: null,
    departamentoRegistral: null,
    documentoPosesorio: 'Escritura 12, notario Pérez, 2019',
    ...cambios,
  });

const crear = (datos: DatosDeInmueble) => () => Inmueble.crear(empresaId, datos);

describe('Inmueble: el registro', () => {
  it('recorta el nombre y nace activo', () => {
    const { nombre, activo } = Inmueble.crear(empresaId, inscrito()).instantanea();

    expect([nombre, activo]).toEqual(['Finca El Carmen', true]);
  });

  it.each([
    ['sin registro', { registro: null }],
    ['sin número de finca', { numeroDeFinca: ' ' }],
    ['sin folio', { folio: null }],
    ['sin libro', { libro: null }],
    ['sin departamento del libro', { departamentoRegistral: null }],
  ])('un inscrito %s no es válido', (_caso, cambios) => {
    expect(crear(inscrito(cambios))).toThrow(InmuebleRegistroIncompleto);
  });

  it('el libro admite letras («345E») pero no símbolos', () => {
    expect(crear(inscrito({ libro: '345E' }))).not.toThrow();
    expect(crear(inscrito({ libro: '345#' }))).toThrow(InmuebleInvalido);
  });

  it('un posesorio lleva su documento y ningún dato del libro', () => {
    expect(crear(posesorio())).not.toThrow();
    expect(crear(posesorio({ documentoPosesorio: null }))).toThrow(InmuebleRegistroIncompleto);
    expect(crear(posesorio({ folio: '56' }))).toThrow(InmuebleRegistroIncompleto);
  });

  it('el documento posesorio y la titulación supletoria no van en un inscrito', () => {
    expect(crear(inscrito({ documentoPosesorio: 'algo' }))).toThrow(InmuebleInvalido);
    expect(crear(inscrito({ titulacionSupletoriaEnTramite: true }))).toThrow(InmuebleInvalido);
    expect(crear(posesorio({ titulacionSupletoriaEnTramite: true }))).not.toThrow();
  });
});

describe('Inmueble: titularidad, ubicación y escritura', () => {
  it('la copropiedad lleva su porcentaje, mayor que 0 y menor que 100', () => {
    const copropiedad = (porcentaje: string | null) =>
      crear(inscrito({ titularidad: 'copropiedad', porcentajeDeCopropiedad: porcentaje }));

    expect(copropiedad('33.33')).not.toThrow();
    expect(copropiedad(null)).toThrow(InmuebleInvalido);
    expect(copropiedad('100')).toThrow(InmuebleInvalido);
    expect(copropiedad('0.00')).toThrow(InmuebleInvalido);
    expect(crear(inscrito({ porcentajeDeCopropiedad: '50' }))).toThrow(InmuebleInvalido);
  });

  it('el departamento y el municipio van juntos', () => {
    expect(crear(inscrito({ departamentoCodigo: '05' }))).toThrow(InmuebleInvalido);
    expect(crear(inscrito({ departamentoCodigo: '05', municipioCodigo: '01' }))).not.toThrow();
  });

  it('la cantidad y la unidad de la escritura van juntas y positivas', () => {
    expect(crear(inscrito({ cantidadOriginal: '12.5' }))).toThrow(InmuebleInvalido);
    expect(crear(inscrito({ cantidadOriginal: '0', unidadOriginal: 'manzana' }))).toThrow(InmuebleInvalido);
    expect(crear(inscrito({ cantidadOriginal: '12.5', unidadOriginal: 'manzana' }))).not.toThrow();
    expect(crear(inscrito({ superficieRegistralM2: '-3' }))).toThrow(InmuebleInvalido);
  });

  it('la cuerda dice sus varas por lado y las demás unidades no', () => {
    const escritura = { cantidadOriginal: '8', unidadOriginal: 'cuerda' as const };

    expect(crear(inscrito({ ...escritura, varasPorLadoDeCuerda: 25 }))).not.toThrow();
    expect(crear(inscrito(escritura))).toThrow(InmuebleInvalido);
    expect(crear(inscrito({ ...escritura, varasPorLadoDeCuerda: 101 }))).toThrow(InmuebleInvalido);
    expect(crear(inscrito({ cantidadOriginal: '8', unidadOriginal: 'manzana', varasPorLadoDeCuerda: 25 }))).toThrow(
      InmuebleInvalido,
    );
  });

  it('los textos opcionales vacíos quedan sin dato', () => {
    const { matriculaFiscal } = Inmueble.crear(empresaId, inscrito({ matriculaFiscal: '   ' })).instantanea();

    expect(matriculaFiscal).toBeNull();
  });
});
