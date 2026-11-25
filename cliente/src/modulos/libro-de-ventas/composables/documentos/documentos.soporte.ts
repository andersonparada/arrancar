import type { DocumentoEnLista, FichaDeDocumento } from '../../servicios/documentos.api';

/** Un documento de lista de prueba; `cambios` pisa lo que haga falta. */
export function documentoEnLista(cambios: Partial<DocumentoEnLista> = {}): DocumentoEnLista {
  return {
    id: 'd1',
    tipo: 'factura',
    tipoDte: 'FACT',
    clienteId: 'c1',
    tipoDeIdentificacion: 'nit',
    nitReceptor: '1234567',
    nombreReceptor: 'Lácteos del Norte',
    serie: 'A',
    numero: '100',
    fechaEmision: '2026-11-10',
    periodo: '2026-11-01',
    destino: 'cuentas-por-cobrar',
    estado: 'vigente',
    muestraEnReportesSat: true,
    documentoAfectadoId: null,
    total: '1120.00',
    iva: '120.00',
    procesado: false,
    puedeAnular: true,
    puedeEliminar: false,
    ...cambios,
  };
}

/** Una ficha de prueba con una línea gravada. */
export function fichaDeDocumento(cambios: Partial<FichaDeDocumento> = {}): FichaDeDocumento {
  return {
    ...documentoEnLista(),
    origen: 'manual',
    autorizacionFel: null,
    localidadId: null,
    regimenIsrDeLaEmpresa: null,
    regimenIvaDeLaEmpresa: 'general',
    facturaAnterior: null,
    moneda: 'GTQ',
    observaciones: null,
    totales: {
      total: '1120.00',
      gravadoBienes: '1000.00',
      gravadoServicios: '0.00',
      exento: '0.00',
      exportacion: '0.00',
      iva: '120.00',
      otrosImpuestos: '0.00',
    },
    lineas: [
      {
        id: 'l1',
        orden: 1,
        conceptoDeIngresoId: 'k1',
        conceptoDeIngresoNombre: 'Venta de bienes',
        tipo: 'bien',
        claseFiscal: 'gravada',
        descripcion: null,
        total: '1120.00',
        base: '1000.00',
        iva: '120.00',
        otrosImpuestos: '0.00',
      },
    ],
    notas: [],
    anulacion: null,
    ...cambios,
  };
}
