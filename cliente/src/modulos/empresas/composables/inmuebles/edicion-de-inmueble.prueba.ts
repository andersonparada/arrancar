import { describe, expect, it } from 'vitest';
import type { DatosInmueble, Inmueble } from '../../servicios/inmuebles.api';
import { fincaFolioYLibro } from './detalles-de-inmueble';
import { datosDeInmueble, edicionDe } from './edicion-de-inmueble';

const datos: DatosInmueble = {
  nombre: 'Finca El Carmen',
  situacionRegistral: 'inscrito',
  registro: 'general',
  numeroDeFinca: '1234',
  folio: '56',
  libro: '345E',
  departamentoRegistral: '05',
  documentoPosesorio: null,
  titulacionSupletoriaEnTramite: false,
  titularidad: 'copropiedad',
  porcentajeDeCopropiedad: '12.50',
  titular: 'Los Pérez',
  matriculaFiscal: 'M-77',
  administraIusi: 'dicabi',
  codigoCatastral: null,
  departamentoCodigo: '05',
  municipioCodigo: '01',
  direccion: 'Km 12',
  superficieRegistralM2: '12500.00',
  cantidadOriginal: '8.0000',
  unidadOriginal: 'cuerda',
  varasPorLadoDeCuerda: 25,
  localidadId: '00000000-0000-4000-8000-000000000001',
  observaciones: 'Una nota de prueba.',
};
const inmueble: Inmueble = { id: 'registro-1', ...datos, activo: true, localidadNombre: 'Finca' };

describe('formulario de inmuebles', () => {
  it('lo que se abre para editar se manda igual si no se cambia nada', () => {
    expect(datosDeInmueble(edicionDe(inmueble))).toEqual(datos);
    expect(edicionDe(inmueble).id).toBe(inmueble.id);
  });

  it('un registro nuevo empieza sin id y lo que no se llena se manda como null', () => {
    expect(edicionDe()).toMatchObject({ abierta: true, id: null });
    expect(datosDeInmueble(edicionDe())).toMatchObject({
      registro: null,
      numeroDeFinca: null,
      departamentoRegistral: null,
      documentoPosesorio: null,
      porcentajeDeCopropiedad: null,
      unidadOriginal: null,
      varasPorLadoDeCuerda: null,
      localidadId: null,
    });
  });

  it('al pasar a posesorio no se mandan los datos del libro, y al revés', () => {
    const edicion = edicionDe(inmueble);
    edicion.situacionRegistral = 'posesorio';
    edicion.documentoPosesorio = 'Escritura 12';

    expect(datosDeInmueble(edicion)).toMatchObject({
      registro: null,
      numeroDeFinca: null,
      folio: null,
      libro: null,
      departamentoRegistral: null,
      documentoPosesorio: 'Escritura 12',
    });
    edicion.situacionRegistral = 'inscrito';
    expect(datosDeInmueble(edicion)).toMatchObject({ numeroDeFinca: '1234', documentoPosesorio: null });
  });

  it('el porcentaje solo va en la copropiedad y las varas solo en la cuerda', () => {
    const edicion = edicionDe(inmueble);
    edicion.titularidad = 'propia';
    edicion.unidadOriginal = 'manzana';

    expect(datosDeInmueble(edicion)).toMatchObject({ porcentajeDeCopropiedad: null, varasPorLadoDeCuerda: null });
  });

  it('la tarjeta muestra finca, folio y libro juntos solo si es inscrito', () => {
    expect(fincaFolioYLibro(inmueble)).toBe('1234 · 56 · 345E');
    expect(fincaFolioYLibro({ ...inmueble, numeroDeFinca: null, folio: null, libro: null })).toBeNull();
  });
});
