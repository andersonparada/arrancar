import { describe, expect, it } from 'vitest';
import type { RetencionDeDocumento } from '../../servicios/documentos.api';
import {
  cuerpoDeDocumento,
  edicionVacia,
  pendientesDelRegistro,
  type EdicionDeDocumento,
} from './edicion-de-documento';
import { lineaVacia } from './lineas-del-documento';

const HOY = new Date(2026, 9, 18);

const retencion = (cambios: Partial<RetencionDeDocumento> = {}): RetencionDeDocumento => ({
  impuesto: 'iva',
  regla: 'iva_contribuyente_especial',
  base: '100.00',
  porcentaje: '15.00',
  montoPropuesto: '15.00',
  monto: '15.00',
  motivoDelAjuste: null,
  fecha: '2026-10-18',
  ...cambios,
});

/** Una factura completa en el libro, lista para registrar. */
function facturaCompleta(cambios: Partial<EdicionDeDocumento> = {}): EdicionDeDocumento {
  const edicion = edicionVacia(HOY);
  Object.assign(edicion, {
    proveedorId: 'p-1',
    destino: 'cuentas-por-pagar',
    numero: ' 123 ',
    serie: 'A',
    nitEmisor: '1234567-8',
    autorizacionFel: 'UUID-1',
    ...cambios,
  });
  Object.assign(edicion.lineas[0]!, { conceptoId: 'c-1', total: 112 });
  return edicion;
}

describe('edicionVacia', () => {
  it('empieza con una factura en el libro, emitida hoy y con una línea en blanco', () => {
    const edicion = edicionVacia(HOY);
    expect(edicion).toMatchObject({ tipoDte: 'FACT', fechaEmision: '2026-10-18', muestraEnReportesSat: true });
    expect(edicion.lineas).toHaveLength(1);
    expect(edicion.periodo).toBe('');
  });
});

describe('cuerpoDeDocumento', () => {
  it('arma el cuerpo con los montos como texto y los vacíos como null', () => {
    const cuerpo = cuerpoDeDocumento(facturaCompleta(), [], 'registro');
    expect(cuerpo).toMatchObject({
      tipoDte: 'FACT',
      proveedorId: 'p-1',
      destino: 'cuentas-por-pagar',
      numero: '123',
      serie: 'A',
      nitEmisor: '1234567-8',
      autorizacionFel: 'UUID-1',
      motivoFueraDelLibro: null,
      fechaRecepcion: null,
      periodo: null,
      ivaDeLaFel: null,
      documentoAfectadoId: null,
      ajustesDeRetenciones: [],
      datosFiscalesDelProveedor: null,
      confirmarCambioDeRegimen: false,
    });
    expect(cuerpo?.lineas).toEqual([
      {
        conceptoId: 'c-1',
        descripcion: null,
        tipo: 'bien',
        esActivoFijo: false,
        combustibleId: null,
        galones: null,
        total: '112.00',
        exento: null,
      },
    ]);
  });

  it('manda el período como el primer día del mes elegido', () => {
    expect(cuerpoDeDocumento(facturaCompleta({ periodo: '2026-09' }), [], 'registro')?.periodo).toBe('2026-09-01');
  });

  it('fuera del libro manda el motivo y no el NIT del emisor; sin FEL tampoco la autorización', () => {
    const edicion = facturaCompleta({ muestraEnReportesSat: false, motivoFueraDelLibro: 'sin_fel' });
    expect(cuerpoDeDocumento(edicion, [], 'registro')).toMatchObject({
      motivoFueraDelLibro: 'sin_fel',
      nitEmisor: null,
      autorizacionFel: null,
      nitReceptor: null,
    });
  });

  it('con FEL a otro NIT manda la autorización y el receptor', () => {
    const edicion = facturaCompleta({
      muestraEnReportesSat: false,
      motivoFueraDelLibro: 'fel_a_otro_nit',
      nitReceptor: '7654321-0',
    });
    expect(cuerpoDeDocumento(edicion, [], 'registro')).toMatchObject({
      motivoFueraDelLibro: 'fel_a_otro_nit',
      autorizacionFel: 'UUID-1',
      nitReceptor: '7654321-0',
    });
  });

  it('solo una nota de crédito lleva la factura afectada', () => {
    const factura = facturaCompleta({ documentoAfectadoId: 'f-1' });
    expect(cuerpoDeDocumento(factura, [], 'registro')?.documentoAfectadoId).toBeNull();
    const nota = facturaCompleta({ tipoDte: 'NCRE', documentoAfectadoId: 'f-1' });
    expect(cuerpoDeDocumento(nota, [], 'registro')?.documentoAfectadoId).toBe('f-1');
  });

  it('manda el código de la SAT sin la familia cuando hay FEL', () => {
    const cuerpo = cuerpoDeDocumento(facturaCompleta({ tipoDte: 'FARP' }), [], 'registro');
    expect(cuerpo?.tipoDte).toBe('FARP');
    expect(cuerpo).not.toHaveProperty('tipo');
  });

  it('un recibo manda la familia y ningún código; sin FEL tampoco se manda el código', () => {
    const recibo = facturaCompleta({ tipoDte: 'RECIBO', muestraEnReportesSat: false, motivoFueraDelLibro: 'sin_fel' });
    expect(cuerpoDeDocumento(recibo, [], 'registro')).toMatchObject({ tipo: 'recibo' });
    expect(cuerpoDeDocumento(recibo, [], 'registro')).not.toHaveProperty('tipoDte');
    const sinFel = facturaCompleta({ tipoDte: 'FCAM', muestraEnReportesSat: false, motivoFueraDelLibro: 'sin_fel' });
    expect(cuerpoDeDocumento(sinFel, [], 'registro')).toMatchObject({ tipo: 'factura' });
    expect(cuerpoDeDocumento(sinFel, [], 'registro')).not.toHaveProperty('tipoDte');
  });

  it('sin tipo elegido no se calcula y falta elegirlo', () => {
    const sinTipo = facturaCompleta({ tipoDte: '' });
    expect(cuerpoDeDocumento(sinTipo, [], 'previa')).toBeNull();
    expect(pendientesDelRegistro(sinTipo)).toContain('elegir el tipo de documento');
  });

  it('las filas en blanco no viajan', () => {
    const edicion = facturaCompleta();
    edicion.lineas.push(lineaVacia());
    expect(cuerpoDeDocumento(edicion, [], 'registro')?.lineas).toHaveLength(1);
  });

  it('para registrar no acepta una línea a medias; la vista previa simplemente no la cuenta', () => {
    const edicion = facturaCompleta();
    edicion.lineas.push({ ...lineaVacia(), total: 50 });
    expect(cuerpoDeDocumento(edicion, [], 'registro')).toBeNull();
    expect(cuerpoDeDocumento(edicion, [], 'previa')?.lineas).toHaveLength(1);
  });

  it('sin proveedor, número, fecha o líneas no hay cuerpo', () => {
    expect(cuerpoDeDocumento(facturaCompleta({ proveedorId: null }), [], 'previa')).toBeNull();
    expect(cuerpoDeDocumento(facturaCompleta({ numero: '  ' }), [], 'previa')).toBeNull();
    expect(cuerpoDeDocumento(facturaCompleta({ fechaEmision: '' }), [], 'previa')).toBeNull();
    expect(cuerpoDeDocumento(edicionVacia(HOY), [], 'previa')).toBeNull();
  });

  it('la vista previa funciona sin destino; registrar lo exige', () => {
    const sinDestino = facturaCompleta({ destino: null });
    expect(cuerpoDeDocumento(sinDestino, [], 'previa')).not.toBeNull();
    expect(cuerpoDeDocumento(sinDestino, [], 'registro')).toBeNull();
  });

  it('manda los ajustes de retenciones, y en la vista previa omite los que aún no tienen motivo', () => {
    const edicion = facturaCompleta({ ajustes: { iva_contribuyente_especial: { monto: '10', motivo: '' } } });
    expect(cuerpoDeDocumento(edicion, [retencion()], 'previa')?.ajustesDeRetenciones).toEqual([]);
    edicion.ajustes.iva_contribuyente_especial!.motivo = ' Retención parcial ';
    expect(cuerpoDeDocumento(edicion, [retencion()], 'registro')?.ajustesDeRetenciones).toEqual([
      { regla: 'iva_contribuyente_especial', monto: '10.00', motivo: 'Retención parcial' },
    ]);
  });

  it('manda las respuestas sobre el proveedor cuando están completas', () => {
    const edicion = facturaCompleta({ respuestasFiscales: { regimenIsr: 'general', esAgenteDeRetencionIva: 'false' } });
    expect(cuerpoDeDocumento(edicion, [], 'registro')?.datosFiscalesDelProveedor).toEqual({
      regimenIsr: 'general',
      esAgenteDeRetencionIva: false,
    });
  });
});

describe('pendientesDelRegistro', () => {
  it('dice en palabras del usuario lo que falta', () => {
    expect(pendientesDelRegistro(edicionVacia(HOY))).toEqual([
      'elegir el proveedor',
      'escribir el número del documento',
      'escribir al menos una línea',
    ]);
  });

  it('una nota pide la factura que rebaja', () => {
    expect(pendientesDelRegistro(facturaCompleta({ tipoDte: 'NCRE' }))).toEqual([
      'elegir la factura que rebaja la nota',
    ]);
  });

  it('fuera del libro pide el motivo', () => {
    expect(pendientesDelRegistro(facturaCompleta({ muestraEnReportesSat: false }))).toEqual([
      'decir por qué no se muestra en reportes SAT',
    ]);
  });

  it('una línea a medias pide completarla; una en blanco no estorba', () => {
    const edicion = facturaCompleta();
    edicion.lineas.push(lineaVacia());
    expect(pendientesDelRegistro(edicion)).toEqual([]);
    edicion.lineas.push({ ...lineaVacia(), conceptoId: 'c-2' });
    expect(pendientesDelRegistro(edicion)).toEqual(['completar las líneas (concepto y total)']);
  });

  it('una factura completa no tiene pendientes', () => {
    expect(pendientesDelRegistro(facturaCompleta())).toEqual([]);
  });
});

describe('factura especial', () => {
  const especial = (cambios: Partial<EdicionDeDocumento> = {}) =>
    facturaCompleta({ tipoDte: 'FESP', nitEmisor: '', nitReceptor: '2345678901234', ...cambios });

  it('manda el vendedor como receptor y ningún emisor, con la casilla marcada', () => {
    const cuerpo = cuerpoDeDocumento(especial({ nitEmisor: '999' }), [], 'registro');
    expect(cuerpo).toMatchObject({
      tipoDte: 'FESP',
      nitEmisor: null,
      nitReceptor: '2345678901234',
      autorizacionFel: 'UUID-1',
      motivoFueraDelLibro: null,
    });
  });

  it('pide vendedor, serie y autorización', () => {
    const pendientes = pendientesDelRegistro(especial({ nitReceptor: ' ', serie: '', autorizacionFel: '' }));
    expect(pendientes).toEqual([
      'escribir el NIT o CUI del vendedor',
      'escribir la serie de la factura especial',
      'escribir la autorización de la FEL',
    ]);
    expect(pendientesDelRegistro(especial())).toEqual([]);
  });

  it('una factura común no pide vendedor', () => {
    expect(pendientesDelRegistro(facturaCompleta())).toEqual([]);
  });
});
