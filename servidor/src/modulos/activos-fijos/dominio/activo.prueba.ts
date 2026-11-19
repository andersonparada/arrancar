import { describe, expect, it } from 'vitest';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import { Activo, type DatosEditables, type EntradaDeAlta } from './activo.js';
import {
  ActivoDadoDeBaja,
  ActivoInvalido,
  ActivoNoEnUso,
  MotivoDeOcioRequerido,
  ValorFiscalSoloEnEdificios,
} from './errores-de-activo.js';
import type { DatosDeActivo } from './reglas-de-activo.js';

const empresa = Identificador.nuevo<'Empresa'>();
const HOY = '2026-11-18';

const datos = (cambios: Partial<DatosDeActivo> = {}): DatosDeActivo => ({
  codigo: 'AF-0001',
  descripcion: 'Tractor John Deere',
  claseId: crypto.randomUUID(),
  activoPadreId: null,
  tipoDeRegistro: 'activo',
  origen: 'compra',
  propietario: null,
  formaDeTenencia: null,
  fechaDeAdquisicion: '2026-11-01',
  valorComoGanadoComun: null,
  valorDeMatricula: null,
  valorCatastral: null,
  valoresDelInmuebleCompleto: false,
  marca: null,
  modelo: null,
  numeroDeSerie: null,
  placa: null,
  cantidad: 1,
  observaciones: null,
  ...cambios,
});

const entrada = (cambios: Partial<DatosDeActivo> = {}): EntradaDeAlta => ({
  datos: datos(cambios),
  ubicacion: { localidadId: null, departamentoId: null, responsable: null, enBodega: false },
});

const crear = (
  cambios: Partial<DatosDeActivo> = {},
  inciso: Parameters<typeof Activo.crear>[2] = 'maquinaria_y_vehiculos',
) => Activo.crear(empresa, entrada(cambios), inciso);

const comoEdicion = ({ codigo: _codigo, tipoDeRegistro: _tipo, ...resto }: DatosDeActivo): DatosEditables => resto;

describe('Activo: alta', () => {
  it('un activo del balance nace en construcción, sin libros', () => {
    const activo = crear().instantanea();

    expect(activo).toMatchObject({ estado: 'en_construccion', fechaDeInicioDeUso: null, porcentajeFiscal: null });
    expect(activo.ocioso).toBe(false);
  });

  it('un bien de control o de terceros nace en uso con la fecha de adquisición', () => {
    const control = crear({ tipoDeRegistro: 'bien_de_control' }).instantanea();
    const ajeno = crear({
      tipoDeRegistro: 'de_terceros',
      origen: null,
      propietario: 'Vecino',
      formaDeTenencia: 'comodato',
    }).instantanea();

    expect(control).toMatchObject({ estado: 'en_uso', fechaDeInicioDeUso: '2026-11-01' });
    expect(ajeno).toMatchObject({ estado: 'en_uso', propietario: 'Vecino' });
  });

  it('recorta los textos y deja nulos los vacíos', () => {
    const activo = crear({ descripcion: '  Tractor  ', marca: '  ', placa: ' P-123 ' }).instantanea();

    expect(activo).toMatchObject({ descripcion: 'Tractor', marca: null, placa: 'P-123' });
  });

  it.each([
    ['descripción vacía', { descripcion: ' ' }],
    ['código con espacios', { codigo: 'AF 01' }],
    ['código de más de 30', { codigo: 'A'.repeat(31) }],
    ['cantidad cero', { cantidad: 0 }],
    ['sin origen', { origen: null }],
    ['propietario en un activo propio', { propietario: 'Otro' }],
    ['de terceros sin propietario', { tipoDeRegistro: 'de_terceros', origen: null }],
    ['de terceros con origen', { tipoDeRegistro: 'de_terceros', propietario: 'X', formaDeTenencia: 'otra' }],
    ['catastro en cero', { valorCatastral: '0' }],
    ['inmueble completo sin valores', { valoresDelInmuebleCompleto: true }],
  ] as const)('rechaza %s', (_caso, cambios) => {
    const intento = () => crear(cambios as Partial<DatosDeActivo>, 'edificios');

    expect(intento).toThrow(ActivoInvalido);
  });

  it('la matrícula y el catastro son solo de edificios', () => {
    expect(() => crear({ valorDeMatricula: '500000.00' })).toThrow(ValorFiscalSoloEnEdificios);
    expect(crear({ valorDeMatricula: '500000.00', valorCatastral: '450000' }, 'edificios').instantanea()).toMatchObject(
      {
        valorDeMatricula: '500000.00',
      },
    );
  });

  it('un reproductor lleva su valor como ganado común', () => {
    expect(() => crear({}, 'reproductores')).toThrow(ActivoInvalido);
    expect(crear({ valorComoGanadoComun: '3000.00' }, 'reproductores').instantanea().valorComoGanadoComun).toBe(
      '3000.00',
    );
  });
});

describe('Activo: valores que dependen de la clase', () => {
  it('el valor como ganado común es solo de los reproductores', () => {
    expect(() => crear({ valorComoGanadoComun: '5000.00' })).toThrow(ActivoInvalido);
  });

  it('un terreno no puede ser un bien de control', () => {
    expect(() => crear({ tipoDeRegistro: 'bien_de_control' }, 'terrenos')).toThrow(ActivoInvalido);
    expect(crear({}, 'terrenos').instantanea().estado).toBe('en_construccion');
  });
});

describe('Activo: editar', () => {
  it('cambia lo descriptivo siempre, sin tocar el código ni el tipo', () => {
    const activo = crear();

    activo.cambiarDatos(
      { ...comoEdicion(datos()), descripcion: 'Tractor nuevo', marca: 'JD' },
      'maquinaria_y_vehiculos',
    );

    expect(activo.instantanea()).toMatchObject({ descripcion: 'Tractor nuevo', marca: 'JD', codigo: 'AF-0001' });
  });

  it('la clase, la cantidad y la fecha se cambian solo en construcción', () => {
    const control = crear({ tipoDeRegistro: 'bien_de_control' });

    const intento = () =>
      control.cambiarDatos(
        { ...comoEdicion(datos({ tipoDeRegistro: 'bien_de_control' })), cantidad: 5 },
        'maquinaria_y_vehiculos',
      );

    expect(intento).toThrow(ActivoInvalido);
    expect(() =>
      crear().cambiarDatos({ ...comoEdicion(datos()), cantidad: 5 }, 'maquinaria_y_vehiculos'),
    ).not.toThrow();
  });

  it('«1000» y «1000.00» son el mismo valor: no cuenta como cambio', () => {
    const edificio = crear({ valorDeMatricula: '1000.00' }, 'edificios');
    const base = comoEdicion(datos({ valorDeMatricula: '1000' }));

    expect(() => edificio.cambiarDatos(base, 'edificios')).not.toThrow();
  });

  it('un activo dado de baja no se edita', () => {
    const baja = Activo.reconstruir({ ...crear().instantanea(), estado: 'dado_de_baja', fechaDeBaja: HOY });

    expect(() => baja.cambiarDatos(comoEdicion(datos()), 'maquinaria_y_vehiculos')).toThrow(ActivoDadoDeBaja);
  });
});

describe('Activo: ocioso', () => {
  const enUso = () => crear({ tipoDeRegistro: 'bien_de_control' });

  it('se marca con fecha y motivo, y se quita', () => {
    const activo = enUso();

    activo.marcarOcioso({ fecha: '2026-11-10', motivo: ' Sin operador ' }, HOY);
    expect(activo.instantanea()).toMatchObject({
      ocioso: true,
      ociosoDesde: '2026-11-10',
      motivoDeOcio: 'Sin operador',
    });

    activo.quitarOcioso('2026-11-15', HOY);
    expect(activo.instantanea()).toMatchObject({ ocioso: false, ociosoDesde: null, motivoDeOcio: null });
  });

  it('exige motivo, que la fecha no sea futura ni anterior al uso, y que esté en uso', () => {
    expect(() => enUso().marcarOcioso({ fecha: '2026-11-10', motivo: ' ' }, HOY)).toThrow(MotivoDeOcioRequerido);
    expect(() => enUso().marcarOcioso({ fecha: '2026-12-01', motivo: 'x' }, HOY)).toThrow(ActivoInvalido);
    expect(() => enUso().marcarOcioso({ fecha: '2026-10-01', motivo: 'x' }, HOY)).toThrow(ActivoInvalido);
    expect(() => crear().marcarOcioso({ fecha: '2026-11-10', motivo: 'x' }, HOY)).toThrow(ActivoNoEnUso);
  });

  it('no se quita la marca con una fecha anterior a cuando se puso', () => {
    const activo = enUso();
    activo.marcarOcioso({ fecha: '2026-11-10', motivo: 'x' }, HOY);

    expect(() => activo.quitarOcioso('2026-11-05', HOY)).toThrow(ActivoInvalido);
  });
});

describe('Activo: moverA', () => {
  it('deja la ubicación vigente y quita al usuario responsable', () => {
    const activo = Activo.reconstruir({ ...crear().instantanea(), responsableUsuarioId: crypto.randomUUID() });

    activo.moverA({ localidadId: null, departamentoId: null, responsable: 'Marta', enBodega: true });

    expect(activo.instantanea()).toMatchObject({ responsable: 'Marta', enBodega: true, responsableUsuarioId: null });
  });

  it('un activo dado de baja no se mueve', () => {
    const baja = Activo.reconstruir({ ...crear().instantanea(), estado: 'dado_de_baja', fechaDeBaja: HOY });

    expect(() => baja.moverA({ localidadId: null, departamentoId: null, responsable: null, enBodega: false })).toThrow(
      ActivoDadoDeBaja,
    );
  });
});
