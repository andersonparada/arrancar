import { describe, expect, it } from 'vitest';
import type { LineaDeSolicitudDeDte, SolicitudDeDte } from '../../servicios/dte-recibidos.api';
import { cuerpoDeDocumento } from './edicion-de-documento';
import { edicionDesdeSolicitud, lineaDesdeSolicitud, pendientesDeLaPrecarga } from './edicion-desde-solicitud';

const HOY = new Date(2026, 10, 8);

const linea = (cambios: Partial<LineaDeSolicitudDeDte> = {}): LineaDeSolicitudDeDte => ({
  conceptoId: 'c-1',
  descripcion: 'Concentrado',
  tipo: 'bien',
  esActivoFijo: false,
  combustibleId: null,
  galones: null,
  total: '112.00',
  exento: null,
  otrosImpuestos: null,
  idpEscrito: null,
  ...cambios,
});

const solicitud = (cambios: Partial<SolicitudDeDte> = {}): SolicitudDeDte => ({
  tipoDte: 'FACT',
  proveedorId: 'p-1',
  destino: 'cuentas-por-pagar',
  nitEmisor: '1234567',
  serie: 'A1',
  numero: '55',
  autorizacionFel: 'AUT-1',
  nitReceptor: null,
  motivoFueraDelLibro: null,
  noVinculado: false,
  fechaEmision: '2026-10-30',
  fechaRecepcion: null,
  periodo: '2026-11-01',
  documentoAfectadoId: null,
  ivaDeLaFel: '12.00',
  observaciones: null,
  lineas: [linea()],
  ajustesDeRetenciones: [],
  datosFiscalesDelProveedor: null,
  confirmarCambioDeRegimen: false,
  ...cambios,
});

describe('edicionDesdeSolicitud', () => {
  it('llena el encabezado y las líneas con lo propuesto', () => {
    const edicion = edicionDesdeSolicitud(solicitud(), HOY);
    expect(edicion).toMatchObject({
      tipoDte: 'FACT',
      proveedorId: 'p-1',
      destino: 'cuentas-por-pagar',
      numero: '55',
      serie: 'A1',
      autorizacionFel: 'AUT-1',
      fechaEmision: '2026-10-30',
      fechaRecepcion: '',
      periodo: '2026-11',
      muestraEnReportesSat: true,
    });
    expect(edicion.lineas).toHaveLength(1);
    expect(edicion.lineas[0]).toMatchObject({ conceptoId: 'c-1', total: '112.00', exento: '' });
  });

  it('deja vacío el proveedor, el destino y el concepto que faltan', () => {
    const edicion = edicionDesdeSolicitud(
      solicitud({ proveedorId: null, destino: null, lineas: [linea({ conceptoId: null })] }),
      HOY,
    );
    expect(edicion.proveedorId).toBeNull();
    expect(edicion.destino).toBeNull();
    expect(edicion.lineas[0]?.conceptoId).toBeNull();
  });

  it('sin líneas deja una en blanco', () => {
    expect(edicionDesdeSolicitud(solicitud({ lineas: [] }), HOY).lineas).toHaveLength(1);
  });

  it('un documento fuera del libro desmarca la casilla y conserva el motivo', () => {
    const edicion = edicionDesdeSolicitud(solicitud({ motivoFueraDelLibro: 'fel_a_consumidor_final' }), HOY);
    expect(edicion.muestraEnReportesSat).toBe(false);
    expect(edicion.motivoFueraDelLibro).toBe('fel_a_consumidor_final');
  });

  it('sin código de la SAT usa el de la familia, y un recibo usa RECIBO', () => {
    expect(edicionDesdeSolicitud(solicitud({ tipoDte: undefined, tipo: 'nota_de_credito' }), HOY).tipoDte).toBe('NCRE');
    expect(edicionDesdeSolicitud(solicitud({ tipoDte: undefined, tipo: 'recibo' }), HOY).tipoDte).toBe('RECIBO');
  });

  it('el combustible con IDP escrito activa el IDP de la factura', () => {
    const convertida = lineaDesdeSolicitud(linea({ combustibleId: 'g-1', galones: '10.000', idpEscrito: '5.00' }));
    expect(convertida).toMatchObject({ esCombustible: true, escribeIdp: true, idpEscrito: '5.00', galones: '10.000' });
  });

  it('lo propuesto completo se puede registrar tal cual', () => {
    const cuerpo = cuerpoDeDocumento(edicionDesdeSolicitud(solicitud(), HOY), [], 'registro');
    expect(cuerpo).toMatchObject({ proveedorId: 'p-1', numero: '55', periodo: '2026-11-01', ivaDeLaFel: '12.00' });
    expect(cuerpo?.lineas[0]).toMatchObject({ conceptoId: 'c-1', total: '112.00' });
  });

  it('sin proveedor todavía no hay con qué registrar', () => {
    const edicion = edicionDesdeSolicitud(solicitud({ proveedorId: null }), HOY);
    expect(cuerpoDeDocumento(edicion, [], 'registro')).toBeNull();
  });
});

describe('pendientesDeLaPrecarga', () => {
  const faltante = () =>
    edicionDesdeSolicitud(solicitud({ proveedorId: null, destino: null, lineas: [linea({ conceptoId: null })] }), HOY);

  it('suma lo que falta elegir', () => {
    const pendientes = pendientesDeLaPrecarga(faltante(), '1234567');
    expect(pendientes).toHaveLength(3);
    expect(pendientes[0]).toContain('1234567');
  });

  it('lo que el usuario elige después deja de aparecer', () => {
    const edicion = faltante();
    edicion.destino = 'cuentas-por-pagar';
    expect(pendientesDeLaPrecarga(edicion, null)).not.toContain('Elija el destino del documento.');
    edicion.proveedorId = 'p-1';
    edicion.lineas[0]!.conceptoId = 'c-1';
    expect(pendientesDeLaPrecarga(edicion, null)).toEqual([]);
  });

  it('con todo elegido no suma nada', () => {
    expect(pendientesDeLaPrecarga(edicionDesdeSolicitud(solicitud(), HOY), '1234567')).toEqual([]);
  });
});
