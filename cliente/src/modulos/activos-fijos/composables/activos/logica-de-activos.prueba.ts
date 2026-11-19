import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Clase } from '../../servicios/clases.api';
import {
  alCambiarElTipo,
  datosDeActivo,
  departamentoValido,
  edicionNueva,
  esDeTerceros,
  incisoDe,
} from './edicion-de-activo';
import { detallesDeFicha } from './detalles-de-activo';
import { etiquetasDeActivo } from './etiquetas-de-activo';
import { consultaDeActivos, filtrosVacios } from './filtros-de-activos';

const llena = () => ({ ...edicionNueva('2026-11-18'), descripcion: 'Tractor', claseId: 'clase-1' });

describe('formulario del activo', () => {
  it('empieza como activo del balance, comprado, con la fecha dada y de a uno', () => {
    expect(edicionNueva('2026-11-18')).toMatchObject({
      tipoDeRegistro: 'activo',
      origen: 'compra',
      fechaDeAdquisicion: '2026-11-18',
      cantidad: 1,
      enBodega: false,
    });
  });

  it('lo que no se llena se manda como null y la cantidad como número', () => {
    const datos = datosDeActivo({ ...llena(), cantidad: '3', marca: '  ' }, null);

    expect(datos).toMatchObject({ codigo: null, marca: null, responsable: null, cantidad: 3, claseId: 'clase-1' });
  });

  it('la matrícula y el catastro solo se mandan en edificios; el valor como ganado, en reproductores', () => {
    const edicion = { ...llena(), valorDeMatricula: '500000', valorCatastral: '450000', valorComoGanadoComun: '3000' };

    expect(datosDeActivo(edicion, 'maquinaria_y_vehiculos')).toMatchObject({
      valorDeMatricula: null,
      valorCatastral: null,
      valorComoGanadoComun: null,
    });
    expect(datosDeActivo(edicion, 'edificios')).toMatchObject({ valorDeMatricula: '500000', valorCatastral: '450000' });
    expect(datosDeActivo(edicion, 'reproductores').valorComoGanadoComun).toBe('3000');
  });

  it('un bien de terceros manda propietario y tenencia, y no origen', () => {
    const edicion = llena();
    edicion.tipoDeRegistro = 'de_terceros';
    alCambiarElTipo(edicion);
    edicion.propietario = ' Vecino ';

    expect(esDeTerceros(edicion)).toBe(true);
    expect(datosDeActivo(edicion, null)).toMatchObject({
      origen: null,
      propietario: 'Vecino',
      formaDeTenencia: 'comodato',
    });
  });

  it('al volver a un activo propio se limpia lo de terceros', () => {
    const edicion = llena();
    edicion.tipoDeRegistro = 'de_terceros';
    alCambiarElTipo(edicion);
    edicion.tipoDeRegistro = 'bien_de_control';
    alCambiarElTipo(edicion);

    expect(edicion).toMatchObject({ origen: 'compra', propietario: '', formaDeTenencia: null });
  });

  it('el departamento de otra localidad se descarta; el de toda la empresa o el de la localidad se conserva', () => {
    const departamentos = [
      { id: 'general', localidadId: null },
      { id: 'taller', localidadId: 'finca' },
    ];

    expect(departamentoValido(departamentos, { localidadId: 'oficina', departamentoId: 'taller' })).toBeNull();
    expect(departamentoValido(departamentos, { localidadId: 'finca', departamentoId: 'taller' })).toBe('taller');
    expect(departamentoValido(departamentos, { localidadId: 'oficina', departamentoId: 'general' })).toBe('general');
  });

  it('el inciso sale de la clase elegida', () => {
    const clases = [{ id: 'c1', incisoFiscal: 'edificios' }] as Clase[];

    expect(incisoDe(clases, 'c1')).toBe('edificios');
    expect(incisoDe(clases, null)).toBeNull();
  });
});

describe('etiquetas de la lista', () => {
  const base: Parameters<typeof etiquetasDeActivo>[0] = {
    estado: 'en_uso',
    ocioso: false,
    enBodega: false,
    tipoDeRegistro: 'activo',
  };

  it('un activo en uso y normal no lleva etiquetas', () => {
    expect(etiquetasDeActivo(base)).toEqual([]);
  });

  it('cada condición suma la suya', () => {
    const textos = (cambios: Partial<typeof base>) => etiquetasDeActivo({ ...base, ...cambios }).map((e) => e.texto);

    expect(textos({ estado: 'en_construccion' })).toEqual(['En construcción o en tránsito']);
    expect(textos({ ocioso: true, enBodega: true })).toEqual(['Ocioso', 'En bodega']);
    expect(textos({ tipoDeRegistro: 'de_terceros' })).toEqual(['De terceros']);
    expect(textos({ tipoDeRegistro: 'bien_de_control' })).toEqual(['Control']);
    expect(textos({ estado: 'dado_de_baja', enBodega: true })).toEqual(['Dado de baja']);
  });
});

describe('filtros de la lista', () => {
  it('sin filtros no se manda nada', () => {
    expect(consultaDeActivos(filtrosVacios())).toEqual({});
  });

  it('solo se mandan los llenos, y la marca elige ocioso o en bodega', () => {
    const filtros = { ...filtrosVacios(), texto: ' john ', estado: 'en_uso' as const, marca: 'bodega' as const };

    expect(consultaDeActivos(filtros)).toEqual({ texto: 'john', estado: 'en_uso', enBodega: true });
    expect(consultaDeActivos({ ...filtrosVacios(), marca: 'ocioso' })).toEqual({ ocioso: true });
  });
});

describe('ficha del activo ocioso', () => {
  beforeEach(() => setActivePinia(createPinia()));

  const ficha = (cambios: object) =>
    detallesDeFicha({
      estado: 'en_uso',
      tipoDeRegistro: 'activo',
      ocioso: false,
      ociosoDesde: null,
      motivoDeOcio: null,
      cantidad: 1,
      enBodega: false,
      ...cambios,
    } as Parameters<typeof detallesDeFicha>[0]);

  it('muestra desde cuándo y por qué está ocioso', () => {
    const etiquetas = ficha({ ocioso: true, ociosoDesde: '2026-11-10', motivoDeOcio: 'Sin operador' }).map(
      (detalle) => detalle.etiqueta,
    );

    expect(etiquetas).toEqual(expect.arrayContaining(['Ocioso desde', 'Motivo']));
  });

  it('un activo que no está ocioso no los muestra', () => {
    const etiquetas = ficha({}).map((detalle) => detalle.etiqueta);

    expect(etiquetas).not.toContain('Ocioso desde');
  });
});
