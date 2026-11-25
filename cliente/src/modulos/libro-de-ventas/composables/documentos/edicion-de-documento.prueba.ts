import { describe, expect, it } from 'vitest';
import {
  conCliente,
  conTipo,
  datosDeDocumento,
  edicionVacia,
  erroresDeEdicion,
  fechaDe,
  edicionParaOtro,
  nitDelCliente,
  pendientesDeEdicion,
  pendientesDelIvaDeLaNota,
  type EdicionDeDocumento,
} from './edicion-de-documento';

const hoy = new Date(2026, 10, 23);

/** Una factura completa y válida; cada prueba cambia solo lo que prueba. */
function completa(cambios: Partial<EdicionDeDocumento> = {}): EdicionDeDocumento {
  const base = edicionVacia(hoy);
  const [linea] = base.lineas;
  return {
    ...base,
    numero: '100',
    serie: 'A',
    lineas: [{ ...linea!, conceptoDeIngresoId: 'k1', total: '1120.00' }],
    ...cambios,
  };
}

describe('documento en blanco', () => {
  it('empieza como factura de hoy, con una línea gravada vacía', () => {
    const vacia = edicionVacia(hoy);

    expect(vacia).toMatchObject({ tipo: 'factura', fechaEmision: '2026-11-23', clienteId: null, destino: '' });
    expect(vacia.lineas).toHaveLength(1);
    expect(fechaDe(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('dice todo lo que falta, en orden, hasta poder registrar', () => {
    expect(pendientesDeEdicion(edicionVacia(hoy))).toEqual([
      'el número del documento',
      'el concepto de la línea',
      'el total de la línea',
    ]);
    expect(pendientesDeEdicion(completa())).toEqual([]);
  });
});

describe('lo que se manda al servidor', () => {
  it('lo vacío va como null, el número recortado y sin destino si lo decide el sistema', () => {
    const datos = datosDeDocumento(completa({ numero: ' 100 ', observaciones: '  ' }));

    expect(datos).toMatchObject({
      tipo: 'factura',
      tipoDte: null,
      clienteId: null,
      tipoDeIdentificacion: null,
      nitReceptor: null,
      serie: 'A',
      numero: '100',
      autorizacionFel: null,
      documentoAfectadoId: null,
      facturaAnterior: null,
      ivaDelDte: null,
      observaciones: null,
    });
    expect(datos).not.toHaveProperty('destino');
    expect(datos.lineas).toHaveLength(1);
  });

  it('manda el destino cuando el usuario lo escoge, incluso «ninguno»', () => {
    expect(datosDeDocumento(completa({ destino: 'ninguno' })).destino).toBe('ninguno');
    expect(datosDeDocumento(completa({ destino: 'cuentas-por-cobrar' })).destino).toBe('cuentas-por-cobrar');
  });

  it('el código de la SAT solo viaja con autorización FEL', () => {
    expect(datosDeDocumento(completa({ tipoDte: 'FACT' })).tipoDte).toBeNull();
    const conFel = datosDeDocumento(completa({ tipoDte: 'FACT', autorizacionFel: 'abc' }));
    expect(conFel).toMatchObject({ tipoDte: 'FACT', autorizacionFel: 'abc' });
  });

  it('una factura nunca manda datos de nota aunque se hayan escrito', () => {
    const datos = datosDeDocumento(completa({ documentoAfectadoId: 'x', usaFacturaAnterior: true }));

    expect(datos.documentoAfectadoId).toBeNull();
    expect(datos.facturaAnterior).toBeNull();
  });

  it('una nota manda la factura que corrige o la factura anterior, no las dos', () => {
    const conFactura = completa({ tipo: 'nota_de_credito', documentoAfectadoId: 'f1' });
    expect(datosDeDocumento(conFactura)).toMatchObject({ documentoAfectadoId: 'f1', facturaAnterior: null });

    const anterior = { serie: ' ', numero: ' 9 ', fecha: '2025-12-01' };
    const conAnterior = completa({
      tipo: 'nota_de_credito',
      documentoAfectadoId: 'f1',
      usaFacturaAnterior: true,
      facturaAnterior: anterior,
    });
    expect(datosDeDocumento(conAnterior)).toMatchObject({
      documentoAfectadoId: null,
      facturaAnterior: { serie: null, numero: '9', fecha: '2025-12-01' },
    });
  });
});

describe('notas', () => {
  it('una nota pide la factura que corrige o los datos de la factura anterior', () => {
    expect(pendientesDeEdicion(completa({ tipo: 'nota_de_credito' }))).toEqual(['la factura que corrige la nota']);
    expect(pendientesDeEdicion(completa({ tipo: 'nota_de_credito', documentoAfectadoId: 'f1' }))).toEqual([]);
    expect(pendientesDeEdicion(completa({ tipo: 'nota_de_debito', usaFacturaAnterior: true }))).toEqual([
      'el número de la factura anterior',
      'la fecha de la factura anterior',
    ]);
  });

  it('cambiar a un tipo que no es nota suelta la factura que corregía', () => {
    const nota = completa({ tipo: 'nota_de_credito', documentoAfectadoId: 'f1', usaFacturaAnterior: true });

    expect(conTipo(nota, 'factura')).toMatchObject({ documentoAfectadoId: null, usaFacturaAnterior: false });
    expect(conTipo(nota, 'nota_de_debito')).toMatchObject({ documentoAfectadoId: 'f1', usaFacturaAnterior: true });
  });

  it('cambiar de cliente suelta la factura que se corregía', () => {
    const nota = completa({ tipo: 'nota_de_credito', clienteId: 'c1', documentoAfectadoId: 'f1' });

    expect(conCliente(nota, 'c2')).toMatchObject({ clienteId: 'c2', documentoAfectadoId: null });
    expect(conCliente(nota, 'c1')).toBe(nota);
  });
});

describe('código de la SAT', () => {
  it('con una sola opción en la familia la pone; con varias deja escoger; conserva la que cabe', () => {
    expect(conTipo(completa(), 'nota_de_credito').tipoDte).toBe('NCRE');
    expect(conTipo(completa(), 'recibo').tipoDte).toBe('');
    expect(conTipo(completa({ tipo: 'recibo', tipoDte: 'RDON' }), 'recibo').tipoDte).toBe('RDON');
    expect(conTipo(completa({ tipoDte: 'FACT' }), 'recibo').tipoDte).toBe('');
  });

  it('con autorización FEL pide el código', () => {
    expect(pendientesDeEdicion(completa({ tipo: 'recibo', autorizacionFel: 'abc' }))).toEqual([
      'el código de la SAT del documento electrónico',
    ]);
  });
});

describe('registrar otro seguido', () => {
  it('conserva tipo, fecha, serie, cliente y destino y deja en blanco lo que cambia', () => {
    const anterior = completa({ clienteId: 'c1', destino: 'ninguno', fechaEmision: '2026-11-05', observaciones: 'x' });

    const siguiente = edicionParaOtro({ ...anterior, autorizacionFel: 'abc', tipoDte: 'FACT' });

    expect(siguiente).toMatchObject({
      tipo: 'factura',
      clienteId: 'c1',
      destino: 'ninguno',
      serie: 'A',
      fechaEmision: '2026-11-05',
    });
    expect(siguiente).toMatchObject({ numero: '', autorizacionFel: '', observaciones: '', tipoDte: 'FACT' });
    expect(siguiente.lineas).toHaveLength(1);
    expect(siguiente.lineas[0]?.total).toBe('');
  });
});

describe('otras ayudas', () => {
  it('el IVA del DTE mal escrito se marca y cuenta como pendiente', () => {
    expect(erroresDeEdicion(completa({ ivaDelDte: '12.345' })).ivaDelDte).toBeDefined();
    expect(pendientesDeEdicion(completa({ ivaDelDte: 'x' }))).toEqual(['corregir el IVA del DTE']);
    expect(erroresDeEdicion(completa({ ivaDelDte: '120.00' }))).toEqual({});
  });

  it('muestra el NIT del cliente escogido como pista', () => {
    const clientes = [{ id: 'c1', nombre: 'Ana', nit: '1234567', activo: true }];

    expect(nitDelCliente(clientes, 'c1')).toBe('1234567');
    expect(nitDelCliente(clientes, null)).toBe('');
    expect(nitDelCliente(clientes, 'zz')).toBe('');
  });
});

describe('el IVA que pide el servidor para una nota sobre factura anterior', () => {
  const nota = (cambios: Partial<EdicionDeDocumento> = {}) =>
    completa({ tipo: 'nota_de_credito', usaFacturaAnterior: true, ...cambios });

  it('falta mientras el campo siga vacío, y el 0 cuenta como escrito', () => {
    expect(pendientesDelIvaDeLaNota(nota(), true)).toEqual(['el IVA que dice la nota (escriba 0 si no lleva)']);
    expect(pendientesDelIvaDeLaNota(nota({ ivaDelDte: '0' }), true)).toEqual([]);
  });

  it('no se exige si el servidor no lo pidió o si la nota no es sobre factura anterior', () => {
    expect(pendientesDelIvaDeLaNota(nota(), false)).toEqual([]);
    expect(pendientesDelIvaDeLaNota(nota({ usaFacturaAnterior: false }), true)).toEqual([]);
    expect(pendientesDelIvaDeLaNota(completa(), true)).toEqual([]);
  });
});
