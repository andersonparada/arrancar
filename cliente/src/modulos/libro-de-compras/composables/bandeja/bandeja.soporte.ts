import type { DteRecibido, PropuestaDeDte } from '../../servicios/dte-recibidos.api';

/** Una propuesta de prueba, con todo lo que el servidor propone. */
export function propuesta(cambios: Partial<PropuestaDeDte> = {}): PropuestaDeDte {
  return {
    proveedorId: 'p1',
    conceptoId: 'c1',
    destino: 'cuentas-por-pagar',
    fechaRecepcion: '2026-10-12',
    recepcionObligatoria: false,
    periodo: '2026-10-01',
    avisoDelPeriodo: null,
    ...cambios,
  };
}

/** Una fila pendiente de prueba con proveedor y propuesta completos; lo que se pase pisa lo de omisión. */
export function filaDte(cambios: Partial<DteRecibido> = {}): DteRecibido {
  return {
    id: 'f1',
    autorizacionFel: 'AAAA-1111',
    tipoDte: 'FACT',
    serie: 'A',
    numero: '123',
    fechaEmision: '2026-10-12',
    nitEmisor: '1234567',
    nombreEmisor: 'Ferretería La Paz',
    nitReceptor: '7654321',
    total: '112.00',
    iva: '12.00',
    idp: '0.00',
    otrosImpuestos: '0.00',
    otrosImpuestosDetalle: {},
    estadoSat: 'vigente',
    anuladoEnLaSatEl: null,
    loteId: 'l1',
    estado: 'pendiente',
    documentoId: null,
    motivoDeDescarte: null,
    descartadoEn: null,
    motivoDeBloqueo: null,
    borrador: {
      proveedorId: null,
      conceptoId: null,
      destino: null,
      fechaRecepcion: null,
      periodo: null,
      noVinculado: false,
      documentoAfectadoId: null,
    },
    propuesta: propuesta(),
    anteriorALaFechaDeInicio: false,
    enPlazoDeCredito: false,
    ...cambios,
  };
}
