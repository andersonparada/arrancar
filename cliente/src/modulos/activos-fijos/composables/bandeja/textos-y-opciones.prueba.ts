import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Activo } from '../../servicios/activos.api';
import type { LineaDeBandeja } from '../../servicios/bandeja.api';
import type { Clase } from '../../servicios/clases.api';
import { asignacionInicial } from './edicion-de-capitalizacion';
import { opcionesDeActivos, opcionesDeClases, opcionesDeDepartamentos } from './opciones-de-capitalizacion';
import {
  mensajeDeCapitalizado,
  nombreDeLinea,
  resumenDeCapitalizacion,
  textoDeCostoPorUnidad,
  textoDeDescarte,
} from './textos-de-bandeja';
import { erroresDeLaParte, erroresDeRenglones } from './validar-capitalizacion';

beforeEach(() => setActivePinia(createPinia()));

const linea = (cambios: Partial<LineaDeBandeja> = {}): LineaDeBandeja =>
  ({
    lineaId: 'l1',
    documentoId: 'd1',
    numeroDeLinea: 2,
    tipoDeDocumento: 'factura',
    documento: 'A-100',
    conceptoNombre: 'Maquinaria',
    descripcion: null,
    costo: '1000.00',
    pendiente: '1000.00',
    claseSugeridaId: null,
    bajoElUmbral: false,
    activoSugeridoId: null,
    ...cambios,
  }) as LineaDeBandeja;

describe('textos de la bandeja', () => {
  it('nombra la línea con su documento', () => {
    expect(nombreDeLinea(linea())).toBe('línea 2 de Factura A-100');
  });

  it('el descarte explica que el libro no se corrige y que se puede devolver', () => {
    const texto = textoDeDescarte(linea());
    expect(texto).toContain('Inversión');
    expect(texto).toContain('no se corrige');
    expect(texto).toContain('devolverla');
  });

  it('el costo por unidad muestra el sobrante en la última y el costo por pieza', () => {
    const tres = textoDeCostoPorUnidad('750000.01', 3, 1) ?? '';
    expect(tres).toContain('último recibe');
    expect(tres).toContain('sobrante');
    expect(textoDeCostoPorUnidad('900.00', 3, 1)).not.toContain('sobrante');
    expect(textoDeCostoPorUnidad('900.00', 1, 1)).toBeNull();
    expect(textoDeCostoPorUnidad('900.00', 1, 50)).toContain('Por pieza');
    expect(textoDeCostoPorUnidad('abc', 3, 1)).toBeNull();
    expect(textoDeCostoPorUnidad('900.00', 0, 1)).toBeNull();
  });

  it('el resumen cuenta los activos nuevos, los costos a existentes y el total con signo', () => {
    const nueva = asignacionInicial(linea(), 1);
    nueva.nuevo.unidades = 3;
    const existente = {
      ...asignacionInicial(linea({ lineaId: 'l2' }), 2),
      destino: 'existente' as const,
      monto: '40.00',
    };
    const lineas = [linea(), linea({ lineaId: 'l2' })];
    const texto = resumenDeCapitalizacion([nueva, existente], lineas);
    expect(texto).toContain('se crean 3 activos nuevos');
    expect(texto).toContain('se suma 1 costo a activos que ya existen');
    expect(
      resumenDeCapitalizacion([{ ...existente, monto: '10.00' }], [linea({ lineaId: 'l2', costo: '-10.00' })]),
    ).toContain('-');
  });

  it('el aviso de éxito nombra hasta cinco activos', () => {
    const activos = ['AF-1', 'AF-2', 'AF-3', 'AF-4', 'AF-5', 'AF-6', 'AF-7'].map((codigo) => ({
      id: codigo,
      codigo,
      costo: '1.00',
    }));
    expect(mensajeDeCapitalizado({ activos, costos: 7 })).toBe(
      'Capitalizado: 7 costos registrados. Activos: AF-1, AF-2, AF-3, AF-4, AF-5 y 2 más.',
    );
    expect(mensajeDeCapitalizado({ activos: [], costos: 1 })).toBe('Capitalizado: 1 costo registrado.');
  });
});

describe('errores de la capitalización', () => {
  it('las partes reciben sus errores sin el prefijo', () => {
    expect(erroresDeLaParte({ '1.monto': 'a', '12.monto': 'b', '1.renglon.0': 'c' }, 1)).toEqual({
      monto: 'a',
      'renglon.0': 'c',
    });
  });

  it('los códigos rechazados por el servidor caen en su renglón, según la posición de la parte', () => {
    const partes = [asignacionInicial(linea(), 7), asignacionInicial(linea({ lineaId: 'l2' }), 9)];
    const errores = erroresDeRenglones(
      [
        { asignacion: 1, renglon: 2, causa: 'ya_usado_por_otro_activo' },
        { asignacion: 0, renglon: 0, causa: 'repetido_en_la_cuadricula' },
        { asignacion: 5, renglon: 0, causa: 'repetido_en_la_cuadricula' },
      ],
      partes,
    );
    expect(Object.keys(errores).sort()).toEqual(['7.renglon.0', '9.renglon.2']);
    expect(errores['9.renglon.2']).toMatch(/ya usa/);
  });
});

describe('opciones de los selectores', () => {
  const clase = (id: string, nombre: string, activo = true) => ({ id, nombre, activo }) as Clase;
  const activo = (cambios: Partial<Activo>) => ({ id: 'a', codigo: 'AF-1', descripcion: 'X', ...cambios }) as Activo;

  it('las clases activas van ordenadas por nombre, con la opción vacía primero', () => {
    const opciones = opcionesDeClases([
      clase('1', 'Vehículos'),
      clase('2', 'Computadoras'),
      clase('3', 'Vieja', false),
    ]);
    expect(opciones.map((o) => o.texto)).toEqual(['Elija una clase', 'Computadoras', 'Vehículos']);
    expect(opciones[0]?.valor).toBeNull();
  });

  it('los activos excluyen los dados de baja y los de terceros, por descripción', () => {
    const opciones = opcionesDeActivos([
      activo({ id: '1', descripcion: 'Tractor', estado: 'en_uso', tipoDeRegistro: 'activo' }),
      activo({ id: '2', descripcion: 'Bodega', estado: 'en_construccion', tipoDeRegistro: 'activo' }),
      activo({ id: '3', descripcion: 'Baja', estado: 'dado_de_baja', tipoDeRegistro: 'activo' }),
      activo({ id: '4', descripcion: 'Ajeno', estado: 'en_uso', tipoDeRegistro: 'de_terceros' }),
    ]);
    expect(opciones.map((o) => o.valor)).toEqual([null, '2', '1']);
  });

  it('los departamentos son los de toda la empresa o los de la localidad elegida', () => {
    const ubicaciones = {
      localidades: [],
      departamentos: [
        { id: 'd1', codigo: '1', nombre: 'Taller', localidadId: null },
        { id: 'd2', codigo: '2', nombre: 'Establo', localidadId: 'l1' },
        { id: 'd3', codigo: '3', nombre: 'Oficina', localidadId: 'l2' },
      ],
    };
    expect(opcionesDeDepartamentos(ubicaciones, 'l1').map((o) => o.valor)).toEqual([null, 'd2', 'd1']);
    expect(opcionesDeDepartamentos(ubicaciones, null).map((o) => o.valor)).toEqual([null, 'd1']);
  });
});
