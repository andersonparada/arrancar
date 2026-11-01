import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { ErrorApi } from '@/modulos/core/servicios/cliente-http';
import type { DocumentoPorPagar, FichaDelDocumento } from '../servicios/tipos';
import { detallesDeFicha, detallesDeLista, tituloDeDocumento } from './detalles-de-documento';
import {
  cantidadDeFiltros,
  consultaDeDocumentos,
  filtrosIniciales,
  opcionesDeProveedor,
  opcionesDeTipo,
  paginasEnTotal,
  rangoMostrado,
} from './filtros-de-documentos';
import {
  datosDeAnulacion,
  edicionDeAnulacionVacia,
  errorDelMotivo,
  errorDelVencimiento,
  erroresDeAnulacion,
  mensajeDeLoPropio,
  esperaAOtraPersona,
  opcionesDeCausa,
  resumenDeAutorizacion,
  sePuedeMarcarParaAutorizar,
} from './reglas-de-acciones';

// Los textos con fechas y montos dan formato con la sesión (Pinia).
beforeEach(() => setActivePinia(createPinia()));

const documento = (cambios: Partial<DocumentoPorPagar> = {}): DocumentoPorPagar =>
  ({
    id: 'a',
    tipo: 'factura',
    clase: 'cargo',
    serie: 'A',
    numero: '123',
    saldo: '100.00',
    neto: '100.00',
    ...cambios,
  }) as DocumentoPorPagar;

describe('títulos', () => {
  it('lleva la serie cuando la hay', () => {
    expect(tituloDeDocumento(documento())).toBe('Factura A-123');
    expect(tituloDeDocumento(documento({ tipo: 'nota_de_credito', serie: null, numero: '45' }))).toBe(
      'Nota de crédito 45',
    );
  });

  it('el saldo de una nota de crédito se llama «a favor»', () => {
    const etiquetas = (d: DocumentoPorPagar) => detallesDeLista(d).map((detalle) => detalle.etiqueta);
    expect(etiquetas(documento())).toContain('Saldo');
    expect(etiquetas(documento({ clase: 'abono' }))).toContain('Saldo a favor');
  });

  it('la ficha de una nota de crédito no muestra vencimiento', () => {
    const ficha = { ...documento({ clase: 'abono' }), notas: [], aplicaciones: [] } as unknown as FichaDelDocumento;
    expect(detallesDeFicha(ficha).map((detalle) => detalle.etiqueta)).not.toContain('Vence');
  });
});

describe('filtros de la lista', () => {
  it('abren con lo vigente y sin más filtros', () => {
    expect(cantidadDeFiltros(filtrosIniciales())).toBe(0);
  });

  it('cuentan lo que se escogió, incluido el estado distinto del de omisión', () => {
    const filtros = { ...filtrosIniciales(), estado: 'anulado' as const, soloVencidos: true, tipo: 'factura' as const };
    expect(cantidadDeFiltros(filtros)).toBe(3);
  });

  it('la consulta no manda lo que quedó en «todos»', () => {
    const consulta = consultaDeDocumentos({ ...filtrosIniciales(), proveedorId: 'p1' }, 2);
    expect(consulta).toMatchObject({ proveedorId: 'p1', estado: 'vigente', pagina: 2, limite: 50 });
    expect(consulta.tipo).toBeUndefined();
    expect(consulta.soloVencidos).toBeUndefined();
    expect(consultaDeDocumentos({ ...filtrosIniciales(), soloVencidos: true }, 1).soloVencidos).toBe(true);
  });

  it('los proveedores y los tipos van por nombre, con «todos» primero', () => {
    const proveedores = opcionesDeProveedor([
      { id: '2', nombre: 'Zeta' },
      { id: '1', nombre: 'Álamo' },
    ]);
    expect(proveedores.map((o) => o.texto)).toEqual(['Todos los proveedores', 'Álamo', 'Zeta']);
    expect(opcionesDeTipo()[0]).toEqual({ valor: '', texto: 'Todos los tipos' });
  });

  it('pagina y muestra el rango', () => {
    expect(paginasEnTotal(0, 50)).toBe(1);
    expect(paginasEnTotal(120, 50)).toBe(3);
    expect(rangoMostrado(2, 50, 120)).toBe('51 a 100 de 120');
    expect(rangoMostrado(1, 50, 0)).toBe('0 de 0');
  });
});

describe('anulación', () => {
  it('pide causa y motivo', () => {
    expect(Object.keys(erroresDeAnulacion(edicionDeAnulacionVacia()))).toEqual(['causa', 'motivo']);
  });

  it('el motivo no puede ser solo espacios ni pasar de 300 caracteres', () => {
    expect(errorDelMotivo('   ')).not.toBeNull();
    expect(errorDelMotivo('x'.repeat(301))).toContain('300');
    expect(errorDelMotivo('Se capturó dos veces')).toBeNull();
  });

  it('arma el cuerpo con el motivo sin espacios sobrantes', () => {
    const edicion = { abierta: true, causa: 'error_de_captura' as const, motivo: '  duplicada ' };
    expect(erroresDeAnulacion(edicion)).toEqual({});
    expect(datosDeAnulacion(edicion)).toEqual({ causa: 'error_de_captura', motivo: 'duplicada' });
  });

  it('ofrece las causas por nombre después de la invitación', () => {
    const opciones = opcionesDeCausa();
    expect(opciones[0]?.valor).toBe('');
    expect(opciones).toHaveLength(4);
  });
});

describe('vencimiento nuevo', () => {
  it('no puede faltar ni ser anterior a la emisión', () => {
    expect(errorDelVencimiento('', '2026-10-01')).not.toBeNull();
    expect(errorDelVencimiento('2026-09-30', '2026-10-01')).toContain('anterior');
    expect(errorDelVencimiento('2026-10-01', '2026-10-01')).toBeNull();
  });
});

describe('autorización', () => {
  it('reconoce el error de lo propio por su código y deja pasar los demás', () => {
    const propio = new ErrorApi(403, { codigo: 'autorizacion_de_lo_propio', mensaje: 'No puede autorizar A-1.' });
    expect(mensajeDeLoPropio(propio)).toBe('No puede autorizar A-1.');
    expect(mensajeDeLoPropio(new ErrorApi(403, { codigo: 'otro', mensaje: 'x' }))).toBeNull();
    expect(mensajeDeLoPropio(new Error('x'))).toBeNull();
  });

  it('lo propio solo se marca con el permiso de autorizar lo propio', () => {
    const propio = documento({ puedeAutorizar: true, esPropio: true });
    expect(sePuedeMarcarParaAutorizar(propio, false)).toBe(false);
    expect(esperaAOtraPersona(propio, false)).toBe(true);
    expect(sePuedeMarcarParaAutorizar(propio, true)).toBe(true);
    expect(esperaAOtraPersona(propio, true)).toBe(false);
  });

  it('lo ajeno se marca si el servidor dice que se puede, y lo demás no', () => {
    expect(sePuedeMarcarParaAutorizar(documento({ puedeAutorizar: true, esPropio: false }), false)).toBe(true);
    const noSePuede = documento({ puedeAutorizar: false, esPropio: true });
    expect(sePuedeMarcarParaAutorizar(noSePuede, true)).toBe(false);
    expect(esperaAOtraPersona(noSePuede, false)).toBe(false);
  });

  it('el resumen suma el saldo de los cargos y no cuenta las notas de crédito', () => {
    const lote = [
      documento({ saldo: '100.50' }),
      documento({ saldo: '50.25' }),
      documento({ clase: 'abono', saldo: '9.00' }),
    ];
    const resumen = resumenDeAutorizacion(lote);
    expect(resumen).toContain('los 3 documentos');
    expect(resumen).toContain('150.75');
  });

  it('con solo notas de crédito no habla de montos a pagar', () => {
    expect(resumenDeAutorizacion([documento({ clase: 'abono' })])).not.toContain('a pagar');
  });
});
