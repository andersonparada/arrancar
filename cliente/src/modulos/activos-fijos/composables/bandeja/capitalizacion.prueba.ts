import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { activo, clase, linea } from './datos-de-prueba.soporte';
import { altasConjuntasDe, nombreDeAlta, opcionesDeAltas } from './altas-conjuntas';
import {
  alCambiarLasUnidades,
  asignacionAdicional,
  asignacionInicial,
  sinRepartirDeLaLinea,
} from './edicion-de-capitalizacion';
import {
  agruparPorDocumento,
  consultaDeBandeja,
  esNotaDelLibro,
  etiquetaDeDocumento,
  filtrarPorTexto,
  filtrosDeBandejaVacios,
  totalPendiente,
} from './lineas-de-bandeja';
import { erroresDeAsignaciones } from './errores-del-servidor';
import { erroresDeCapitalizacion, llaveDeError, unidadesAcrear } from './validar-capitalizacion';

beforeEach(() => setActivePinia(createPinia()));

describe('bandeja: líneas', () => {
  it('agrupa por documento en el orden recibido', () => {
    const grupos = agruparPorDocumento([
      linea(),
      linea({ lineaId: 'l2', numeroDeLinea: 2 }),
      linea({ lineaId: 'l3', documentoId: 'd2', documento: 'B-1' }),
    ]);
    expect(grupos.map((g) => [g.titulo, g.lineas.length])).toEqual([
      ['Factura A-100', 2],
      ['Factura B-1', 1],
    ]);
  });

  it('nombra los tipos de documento y reconoce las notas', () => {
    expect(etiquetaDeDocumento('nota_de_credito')).toBe('Nota de crédito');
    expect(etiquetaDeDocumento('factura_especial')).toBe('Factura especial');
    expect(esNotaDelLibro({ tipoDeDocumento: 'nota_de_debito' })).toBe(true);
    expect(esNotaDelLibro({ tipoDeDocumento: 'factura' })).toBe(false);
  });

  it('busca por texto en documento, proveedor, concepto y descripción', () => {
    const lineas = [linea(), linea({ lineaId: 'l2', proveedorNombre: 'Sillas SA', descripcion: null })];
    expect(filtrarPorTexto(lineas, 'sillas')).toHaveLength(1);
    expect(filtrarPorTexto(lineas, '  ')).toHaveLength(2);
    expect(filtrarPorTexto(lineas, 'john')).toHaveLength(1);
  });

  it('suma lo pendiente, con signo', () => {
    expect(totalPendiente([linea({ pendiente: '100.10' }), linea({ pendiente: '-30.05' })])).toBe('70.05');
  });

  it('arma la consulta sin campos vacíos', () => {
    expect(consultaDeBandeja(filtrosDeBandejaVacios())).toEqual({
      desde: undefined,
      hasta: undefined,
      conPropuesta: undefined,
    });
    expect(consultaDeBandeja({ desde: '2026-01-01', hasta: '', propuesta: 'sin' })).toEqual({
      desde: '2026-01-01',
      hasta: undefined,
      conPropuesta: false,
    });
  });
});

describe('bandeja: altas conjuntas', () => {
  const altas = [
    activo({ id: '1', codigo: 'AF-2', altaConjuntaId: 'x', estado: 'en_construccion' }),
    activo({ id: '2', codigo: 'AF-1', altaConjuntaId: 'x', estado: 'en_uso' }),
    activo({ id: '3', codigo: 'AF-9', altaConjuntaId: 'y', estado: 'en_uso' }),
    activo({ id: '4', codigo: 'AF-8', altaConjuntaId: 'y', estado: 'dado_de_baja' }),
    activo({ id: '5', codigo: 'AF-7', altaConjuntaId: null }),
  ];

  it('solo cuenta las altas con más de un activo vigente', () => {
    const resultado = altasConjuntasDe(altas);
    expect(resultado.map((a) => a.id)).toEqual(['x']);
    expect(nombreDeAlta(resultado[0]!)).toBe('AF-1 a AF-2 · Tractor (2 activos)');
  });

  it('las opciones empiezan con una vacía', () => {
    expect(opcionesDeAltas(altasConjuntasDe(altas))[0]?.valor).toBeNull();
  });
});

describe('capitalizar: edición', () => {
  it('propone un activo nuevo con todo el pendiente, la clase sugerida y la descripción de la línea', () => {
    const parte = asignacionInicial(linea(), 1);
    expect(parte).toMatchObject({ destino: 'nuevo', monto: '750000.01', nuevo: { claseId: 'k1', unidades: 1 } });
    expect(parte.nuevo.descripcion).toBe('Tractor John Deere');
    expect(parte.nuevo.tipoDeRegistro).toBe('activo');
  });

  it('bajo el umbral propone bien de control', () => {
    expect(asignacionInicial(linea({ bajoElUmbral: true }), 1).nuevo.tipoDeRegistro).toBe('bien_de_control');
  });

  it('en una nota de crédito propone el activo de la factura y el monto sin signo', () => {
    const parte = asignacionInicial(linea({ pendiente: '-500.00', activoSugeridoId: 'a9' }), 1);
    expect(parte).toMatchObject({ destino: 'existente', activoId: 'a9', monto: '500.00' });
  });

  it('calcula lo que falta repartir y la otra parte empieza con eso', () => {
    const primera = { ...asignacionInicial(linea({ pendiente: '1000.00' }), 1), monto: '400.00' };
    expect(sinRepartirDeLaLinea(linea({ pendiente: '1000.00' }), [primera])).toBe('600.00');
    expect(asignacionAdicional(linea(), 2, '600.00')).toMatchObject({ clave: 2, monto: '600.00', destino: 'nuevo' });
    expect(sinRepartirDeLaLinea(linea({ pendiente: '100.00' }), [{ ...primera, monto: '150.00' }])).toBe('0.00');
  });

  it('al cambiar las unidades la cuadrícula tiene un renglón por unidad', () => {
    const parte = asignacionInicial(linea(), 1);
    parte.nuevo.unidades = '3';
    alCambiarLasUnidades(parte.nuevo);
    expect(parte.nuevo.renglones).toHaveLength(3);
    parte.nuevo.unidades = '';
    alCambiarLasUnidades(parte.nuevo);
    expect(parte.nuevo.renglones).toHaveLength(3);
  });
});

describe('capitalizar: revisión', () => {
  const contexto = { lineas: [linea({ pendiente: '1000.00', costo: '1000.00' })], clases: [clase('k1')] };
  const parte = (cambios = {}) => ({ ...asignacionInicial(contexto.lineas[0]!, 1), ...cambios });

  it('una parte completa no tiene errores', () => {
    expect(erroresDeCapitalizacion([parte()], contexto)).toEqual({});
  });

  it('el monto no puede pasar de lo pendiente y dice cuánto cabe', () => {
    const errores = erroresDeCapitalizacion(
      [parte({ monto: '700.00' }), parte({ clave: 2, monto: '400.00' })],
      contexto,
    );
    expect(errores[llaveDeError(1, 'monto')]).toBeUndefined();
    expect(errores[llaveDeError(2, 'monto')]).toMatch(/caben .*300/);
  });

  it('pide un monto válido, el destino y los datos del activo nuevo', () => {
    const base = parte();
    const errores = erroresDeCapitalizacion(
      [
        { ...base, monto: '0' },
        { ...base, clave: 2, destino: 'existente' as const },
        { ...base, clave: 3, destino: 'conjunta' as const },
        { ...base, clave: 4, nuevo: { ...base.nuevo, descripcion: ' ', claseId: null, cantidadPorActivo: 0 } },
      ],
      contexto,
    );
    expect(errores[llaveDeError(1, 'monto')]).toMatch(/mayor que cero/);
    expect(errores[llaveDeError(2, 'activoId')]).toBeDefined();
    expect(errores[llaveDeError(3, 'altaConjuntaId')]).toBeDefined();
    expect(errores[llaveDeError(4, 'descripcion')]).toBeDefined();
    expect(errores[llaveDeError(4, 'claseId')]).toBeDefined();
    expect(errores[llaveDeError(4, 'cantidadPorActivo')]).toBeDefined();
  });

  it('las unidades de toda la operación no pasan de 200', () => {
    const lineas = [linea({ pendiente: '10.00' })];
    const una = { ...asignacionInicial(lineas[0]!, 1), monto: '5.00' };
    const otra = { ...asignacionInicial(lineas[0]!, 2), monto: '5.00' };
    una.nuevo.unidades = 150;
    otra.nuevo.unidades = 60;
    const errores = erroresDeCapitalizacion([una, otra], { lineas, clases: [clase('k1')] });
    expect(errores[llaveDeError(1, 'unidades')]).toBeUndefined();
    expect(errores[llaveDeError(2, 'unidades')]).toMatch(/200/);
    expect(unidadesAcrear([una, otra])).toBe(210);
  });

  it('un reproductor pide su valor como ganado común', () => {
    const lineas = [linea()];
    const errores = erroresDeCapitalizacion([asignacionInicial(lineas[0]!, 1)], {
      lineas,
      clases: [clase('k1', 'reproductores')],
    });
    expect(errores[llaveDeError(1, 'valorComoGanadoComun')]).toBeDefined();
  });

  it('un valor como ganado común escrito en el campo numérico (llega como número) es válido', () => {
    const lineas = [linea()];
    const parte = asignacionInicial(lineas[0]!, 1);
    parte.nuevo.valorComoGanadoComun = 1500;
    const errores = erroresDeCapitalizacion([parte], { lineas, clases: [clase('k1', 'reproductores')] });
    expect(errores[llaveDeError(1, 'valorComoGanadoComun')]).toBeUndefined();
  });
});

describe('capitalizar: decimales y errores del servidor', () => {
  it('matrícula, catastro y ganado común admiten a lo más dos decimales', () => {
    const lineas = [linea()];
    const parte = asignacionInicial(lineas[0]!, 1);
    parte.nuevo.valorDeMatricula = '10.123';
    parte.nuevo.valorCatastral = 20.5;
    const errores = erroresDeCapitalizacion([parte], { lineas, clases: [clase('k1', 'edificios')] });
    expect(errores[llaveDeError(1, 'valorDeMatricula')]).toMatch(/dos decimales/);
    expect(errores[llaveDeError(1, 'valorCatastral')]).toBeUndefined();
    parte.nuevo.valorComoGanadoComun = '1.234';
    const deGanado = erroresDeCapitalizacion([parte], { lineas, clases: [clase('k1', 'reproductores')] });
    expect(deGanado[llaveDeError(1, 'valorComoGanadoComun')]).toMatch(/dos decimales/);
  });

  it('los errores del servidor por asignación pasan a la llave de su parte', () => {
    const lineas = [linea()];
    const primera = asignacionInicial(lineas[0]!, 7);
    const segunda = asignacionInicial(lineas[0]!, 9);
    const traducidos = erroresDeAsignaciones(
      {
        'asignaciones.1.activoNuevo.valorCatastral': 'Máximo dos decimales',
        'asignaciones.0.monto': 'Monto malo',
        otro: 'x',
      },
      [primera, segunda],
    );
    expect(traducidos).toEqual({ '9.valorCatastral': 'Máximo dos decimales', '7.monto': 'Monto malo', otro: 'x' });
  });
});
