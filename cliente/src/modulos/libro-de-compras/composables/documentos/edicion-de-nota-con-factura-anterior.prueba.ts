import { describe, expect, it } from 'vitest';
import {
  cuerpoDeDocumento,
  edicionVacia,
  pendientesDelRegistro,
  type EdicionDeDocumento,
} from './edicion-de-documento';
import { facturaAnteriorVacia } from './edicion-de-factura-anterior';
import { alCambiarElTipo } from './reglas-del-formulario-de-documento';

const HOY = new Date(2026, 9, 18);

/** Una nota completa sobre una factura del sistema anterior. */
function notaSobreFacturaAnterior(cambios: Partial<EdicionDeDocumento> = {}): EdicionDeDocumento {
  const edicion = edicionVacia(HOY);
  Object.assign(edicion, {
    tipoDte: 'NCRE',
    proveedorId: 'p-1',
    destino: 'cuentas-por-pagar',
    numero: '45',
    nitEmisor: '1234567-8',
    autorizacionFel: 'UUID-1',
    origenDeLaFactura: 'anterior',
    facturaAnterior: { ...facturaAnteriorVacia(), numero: 'A-9', fechaEmision: '2026-01-05', total: 560, iva: 60 },
    ...cambios,
  });
  Object.assign(edicion.lineas[0]!, { conceptoId: 'c-1', total: 112 });
  return edicion;
}

describe('nota sobre una factura del sistema anterior', () => {
  it('manda facturaAnterior y no documentoAfectadoId', () => {
    const cuerpo = cuerpoDeDocumento(notaSobreFacturaAnterior({ documentoAfectadoId: 'f-1' }), [], 'registro');
    expect(cuerpo?.documentoAfectadoId).toBeNull();
    expect(cuerpo?.facturaAnterior).toMatchObject({ tipo: 'factura', numero: 'A-9', total: '560.00', iva: '60.00' });
  });

  it('con la factura del libro manda documentoAfectadoId y facturaAnterior en null', () => {
    const nota = notaSobreFacturaAnterior({ origenDeLaFactura: 'libro', documentoAfectadoId: 'f-1' });
    const cuerpo = cuerpoDeDocumento(nota, [], 'registro');
    expect(cuerpo).toMatchObject({ documentoAfectadoId: 'f-1', facturaAnterior: null });
  });

  it('mientras la factura anterior esté a medias no se calcula ni se registra', () => {
    const nota = notaSobreFacturaAnterior({ facturaAnterior: facturaAnteriorVacia() });
    expect(cuerpoDeDocumento(nota, [], 'previa')).toBeNull();
    expect(cuerpoDeDocumento(nota, [], 'registro')).toBeNull();
  });

  it('los pendientes son los de la factura anterior, no «elegir la factura»', () => {
    const nota = notaSobreFacturaAnterior({ facturaAnterior: facturaAnteriorVacia() });
    const pendientes = pendientesDelRegistro(nota);
    expect(pendientes).toContain('escribir el número de la factura del sistema anterior');
    expect(pendientes).not.toContain('elegir la factura que rebaja la nota');
    expect(pendientesDelRegistro(notaSobreFacturaAnterior())).toEqual([]);
  });

  it('un documento que no es nota nunca manda factura anterior', () => {
    const factura = notaSobreFacturaAnterior({ tipoDte: 'FACT' });
    expect(cuerpoDeDocumento(factura, [], 'registro')).toMatchObject({ facturaAnterior: null });
  });

  it('al dejar de ser nota vuelve a la factura del libro', () => {
    const nota = notaSobreFacturaAnterior();
    nota.tipoDte = 'FACT';
    alCambiarElTipo(nota, 'NCRE', { proveedor: undefined, nitDeLaEmpresa: null });
    expect(nota.origenDeLaFactura).toBe('libro');
  });
});

describe('«No dio crédito por otra causa» en una factura', () => {
  const factura = (cambios: Partial<EdicionDeDocumento> = {}) =>
    notaSobreFacturaAnterior({ tipoDte: 'FACT', origenDeLaFactura: 'libro', ...cambios });

  it('viaja en la factura y exige explicarla en las observaciones', () => {
    const conMarca = factura({ otraCausaSinCredito: true });
    expect(cuerpoDeDocumento(conMarca, [], 'registro')?.otraCausaSinCredito).toBe(true);
    expect(pendientesDelRegistro(conMarca)).toEqual(['explicar en las observaciones por qué no dio crédito fiscal']);
    expect(pendientesDelRegistro(factura({ otraCausaSinCredito: true, observaciones: 'Otro NIT' }))).toEqual([]);
  });

  it('sin la marca va en falso', () => {
    expect(cuerpoDeDocumento(factura(), [], 'registro')?.otraCausaSinCredito).toBe(false);
  });

  it('una nota o un recibo nunca la mandan, aunque quedara marcada', () => {
    const nota = notaSobreFacturaAnterior({ otraCausaSinCredito: true });
    expect(cuerpoDeDocumento(nota, [], 'registro')?.otraCausaSinCredito).toBe(false);
  });

  it('al cambiar a una nota se quita la marca', () => {
    const marcada = factura({ otraCausaSinCredito: true });
    marcada.tipoDte = 'NCRE';
    alCambiarElTipo(marcada, 'FACT', { proveedor: undefined, nitDeLaEmpresa: null });
    expect(marcada.otraCausaSinCredito).toBe(false);
  });
});
