import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { ErrorApi } from '@/modulos/core/servicios/cliente-http';
import type { DocumentoPorPagar, FichaDelDocumento } from '../servicios/tipos';
import {
  detallesDeAnulacion,
  detallesDeFicha,
  detallesDeLista,
  detallesDeMontos,
  tituloDeDocumento,
} from './detalles-de-documento';
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
  documentoYaCambio,
  errorDelMotivo,
  errorDelVencimiento,
  erroresDeAnulacion,
  mensajeDeLoPropio,
  esperaAOtraPersona,
  mensajeDeDesautorizacion,
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

  it('la anulación muestra causa traducida, motivo, quién y cuándo; sin anulación no hay bloque', () => {
    expect(detallesDeAnulacion({ anulacion: null })).toEqual([]);
    const detalles = detallesDeAnulacion({
      anulacion: {
        causa: 'error_de_captura',
        motivo: 'Se duplicó',
        anuladoPor: 'u1',
        anuladoPorNombre: 'Ana Pérez',
        anuladoEn: '2026-11-05T15:30:00Z',
      },
    });
    expect(detalles.map((d) => d.etiqueta)).toEqual(['Causa', 'Motivo', 'Anulado por', 'Anulado el']);
    expect(detalles[0]?.valor).toBe('Error de captura');
    expect(detalles[1]?.valor).toBe('Se duplicó');
    expect(detalles[2]?.valor).toBe('Ana Pérez');
    expect(detalles[3]?.valor).not.toBe('—');
  });

  it('una anulación antigua sin datos no rompe el bloque', () => {
    const detalles = detallesDeAnulacion({
      anulacion: { causa: null, motivo: null, anuladoPor: null, anuladoPorNombre: null, anuladoEn: null },
    });
    expect(detalles).toHaveLength(4);
  });

  it('si el usuario no se puede leer, lo dice en vez de mostrar su id', () => {
    const detalles = detallesDeAnulacion({
      anulacion: { causa: null, motivo: null, anuladoPor: 'u1', anuladoPorNombre: null, anuladoEn: null },
    });
    expect(detalles[2]?.valor).toBe('Usuario no disponible');
  });
});

describe('saldos iniciales', () => {
  const saldo = (cambios: Partial<FichaDelDocumento> = {}) =>
    ({
      ...documento({ origen: 'saldo_inicial', fechaRecepcion: null, documentoId: null }),
      saldoAlInicio: '500.00',
      anterioresAlInicio: '100.00',
      retencionesPorPracticar: '12.00',
      referencia: 'F-9',
      ...cambios,
    }) as FichaDelDocumento;
  const etiquetas = (detalles: { etiqueta: string }[]) => detalles.map((d) => d.etiqueta);

  it('la ficha muestra el origen y la referencia, sin fecha de recepción', () => {
    const e = etiquetas(detallesDeFicha(saldo()));
    expect(e).toContain('Origen');
    expect(e).toContain('Referencia (sistema anterior)');
    expect(e).not.toContain('Fecha de recepción');
  });

  it('los montos agregan saldo al inicio, anteriores y retenciones por practicar', () => {
    expect(etiquetas(detallesDeMontos(saldo()))).toEqual(
      expect.arrayContaining([
        'Saldo al inicio',
        'Pagos y notas anteriores a la fecha de inicio',
        'Retenciones por practicar',
      ]),
    );
    expect(etiquetas(detallesDeMontos(saldo({ anterioresAlInicio: null, retencionesPorPracticar: null })))).toEqual(
      expect.arrayContaining(['Saldo al inicio']),
    );
  });

  it('un documento del libro no muestra nada de saldo inicial y conserva la recepción', () => {
    const ficha = documento({ origen: 'libro_de_compras', fechaRecepcion: '2026-11-01' }) as FichaDelDocumento;
    expect(etiquetas(detallesDeFicha(ficha))).toContain('Fecha de recepción');
    expect(etiquetas(detallesDeMontos(ficha))).not.toContain('Saldo al inicio');
  });

  it('la lista con recepción nula no rompe', () => {
    expect(() => detallesDeLista(saldo())).not.toThrow();
  });

  it('el filtro de origen cuenta y se manda solo si se escogió', () => {
    expect(cantidadDeFiltros({ ...filtrosIniciales(), origen: 'saldo_inicial' })).toBe(1);
    expect(consultaDeDocumentos(filtrosIniciales(), 1).origen).toBeUndefined();
    expect(consultaDeDocumentos({ ...filtrosIniciales(), origen: 'saldo_inicial' }, 1).origen).toBe('saldo_inicial');
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
      { id: '2', nombre: 'Zeta', activo: true },
      { id: '1', nombre: 'Álamo', activo: true },
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
  it('reconoce que otra persona ya autorizó o anuló un documento marcado', () => {
    for (const codigo of ['documento_ya_autorizado', 'documento_ya_anulado']) {
      expect(documentoYaCambio(new ErrorApi(422, { codigo, mensaje: 'x' }))).toBe(true);
    }
    expect(documentoYaCambio(new ErrorApi(422, { codigo: 'otro', mensaje: 'x' }))).toBe(false);
    expect(documentoYaCambio(new Error('x'))).toBe(false);
  });

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
    expect(resumen).toContain('los 3 documentos marcados.');
    expect(resumen).toContain('150.75');
  });

  it('con un solo documento dice «el documento marcado», no «marcados»', () => {
    expect(resumenDeAutorizacion([documento({ saldo: '10.00' })])).toContain('Se autorizarán el documento marcado.');
  });

  it('con solo notas de crédito no habla de montos a pagar', () => {
    expect(resumenDeAutorizacion([documento({ clase: 'abono' })])).not.toContain('a pagar');
  });

  it('desautorizar dice el saldo, no el total; en un saldo inicial, el saldo al inicio', () => {
    const libro = { ...documento({ total: '5000.00', saldo: '3000.00' }), proveedorNombre: 'Agro' };
    const inicial = { ...libro, origen: 'saldo_inicial', saldoAlInicio: '2500.00' };

    const deLibro = mensajeDeDesautorizacion(libro as unknown as FichaDelDocumento);
    const deSaldo = mensajeDeDesautorizacion(inicial as unknown as FichaDelDocumento);

    expect(deLibro).toContain('con saldo de');
    expect(deLibro).toContain('3,000.00');
    expect(deLibro).not.toContain('5,000.00');
    expect(deSaldo).toContain('con saldo al inicio de');
    expect(deSaldo).toContain('2,500.00');
  });
});
