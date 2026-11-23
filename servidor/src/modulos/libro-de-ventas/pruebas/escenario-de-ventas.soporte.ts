import {
  AuditoriaEnMemoria,
  PublicadorEventosEnMemoria,
  RelojFijo,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../core/compartido/pruebas/dobles-compartidos.js';
import { AnularDocumentoDeVenta } from '../aplicacion/casos-uso/documentos/anular-documento-de-venta.js';
import { ObtenerDocumentoDeVenta } from '../aplicacion/casos-uso/documentos/consultar-documentos-de-venta.js';
import { EliminarDocumentoDeVenta } from '../aplicacion/casos-uso/documentos/eliminar-documento-de-venta.js';
import { MarcarDocumentoDeVentaProcesado } from '../aplicacion/casos-uso/documentos/marcar-documento-de-venta-procesado.js';
import { RegistrarDocumentoDeVenta } from '../aplicacion/casos-uso/documentos/registrar-documento-de-venta.js';
import type { SolicitudDeDocumentoDeVenta } from '../aplicacion/dto/solicitud-de-documento.js';
import { FuenteDeLunesAViernes } from '../dominio/calendario-laboral.js';
import { RepositorioDeDocumentosDeVentaEnMemoria } from './dobles-de-documentos-de-venta.soporte.js';
import {
  CatalogosEnMemoria,
  ConfiguracionDeVentasEnMemoria,
  ControlDePeriodosEnMemoria,
  DatosDeLaEmpresaEnMemoria,
  DestinosEnMemoria,
  HistorialFiscalEnMemoria,
} from './vecinos-de-ventas-en-memoria.soporte.js';

export const CLIENTE = '44444444-4444-4444-8444-444444444444';
export const CONCEPTO = '22222222-2222-4222-8222-222222222222';
export const NIT_DEL_CLIENTE = '576937K';

/** Todo lo que necesitan los casos de uso de documentos de venta, en memoria, con un cliente y un concepto dados de alta. */
export function armarEscenarioDeVentas() {
  const operador = operadorDePrueba();
  const dependencias = {
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    publicadorEventos: new PublicadorEventosEnMemoria(),
    auditoria: new AuditoriaEnMemoria(),
    reloj: new RelojFijo('2026-04-20'),
    repositorio: new RepositorioDeDocumentosDeVentaEnMemoria(),
    catalogos: new CatalogosEnMemoria(),
    historial: new HistorialFiscalEnMemoria(),
    control: new ControlDePeriodosEnMemoria(),
    configuracion: new ConfiguracionDeVentasEnMemoria(),
    empresa: new DatosDeLaEmpresaEnMemoria(),
    destinos: new DestinosEnMemoria(),
    calendario: new FuenteDeLunesAViernes(),
  };
  dependencias.catalogos.clientes.set(CLIENTE, {
    id: CLIENTE,
    nombre: 'Distribuidora Quiroa',
    nit: NIT_DEL_CLIENTE,
    dpi: null,
    activo: true,
  });
  dependencias.catalogos.conceptosDeIngreso.set(CONCEPTO, {
    id: CONCEPTO,
    tipo: 'bien',
    activo: true,
    claveDeSistema: null,
  });
  return {
    operador,
    ...dependencias,
    registrar: new RegistrarDocumentoDeVenta(dependencias),
    anular: new AnularDocumentoDeVenta(dependencias),
    eliminar: new EliminarDocumentoDeVenta(dependencias),
    obtener: new ObtenerDocumentoDeVenta(dependencias),
    marcarProcesado: new MarcarDocumentoDeVentaProcesado(dependencias),
  };
}

export type EscenarioDeVentas = ReturnType<typeof armarEscenarioDeVentas>;

let consecutivo = 0;

/** Una factura válida a un cliente (una línea de Q112.00 con IVA, del 15 de marzo); `cambios` la ajusta. */
export function solicitudDeVenta(cambios: Partial<SolicitudDeDocumentoDeVenta> = {}): SolicitudDeDocumentoDeVenta {
  consecutivo += 1;
  return {
    tipo: 'factura',
    tipoDte: null,
    clienteId: CLIENTE,
    tipoDeIdentificacion: null,
    nitReceptor: null,
    nombreReceptor: null,
    serie: 'A',
    numero: String(consecutivo),
    autorizacionFel: null,
    localidadId: null,
    fechaEmision: '2026-03-15',
    documentoAfectadoId: null,
    facturaAnterior: null,
    destino: undefined,
    ivaDelDte: null,
    observaciones: null,
    lineas: [
      {
        conceptoDeIngresoId: CONCEPTO,
        tipo: null,
        claseFiscal: null,
        descripcion: null,
        total: '112.00',
        otrosImpuestos: null,
      },
    ],
    ...cambios,
  };
}
