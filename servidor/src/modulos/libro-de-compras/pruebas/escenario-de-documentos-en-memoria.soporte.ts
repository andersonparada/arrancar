import {
  AuditoriaEnMemoria,
  PublicadorEventosEnMemoria,
  RelojFijo,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../core/compartido/pruebas/dobles-compartidos.js';
import { DatosFiscalesDeEmpresa } from '../dominio/datos-fiscales-de-empresa.js';
import { CODIGOS_DTE_DE_LA_FAMILIA } from '../dominio/tipos-de-documento.js';
import { FuenteDeLunesAViernes } from '../dominio/calendario-laboral.js';
import type { RetencionesDeUnDocumento } from '../aplicacion/puertos/puertos-de-retenciones.js';
import type { DependenciasDelPreparador } from '../aplicacion/casos-uso/documentos/preparador-de-documento.js';
import type { SolicitudSinResolver } from '../aplicacion/dto/solicitud-de-documento.js';
import type {
  CompletadorDeDpi,
  CompletadorDeNit,
  RepositorioDeDocumentos,
} from '../aplicacion/puertos/puertos-de-documentos.js';
import { DocumentosGuardadosEnMemoria } from './dobles-de-bajas-de-documentos.js';
import { ConsultasDeEnterosEnMemoria, RetencionesDeUnDocumentoEnMemoria } from './dobles-de-retenciones.js';
import { DatosFiscalesDeEmpresaEnMemoria, DatosFiscalesDeProveedorEnMemoria } from './dobles-de-datos-fiscales.js';
import {
  CatalogosEnMemoria,
  CompletadorDeDpiEnMemoria,
  CompletadorDeNitEnMemoria,
  ConfiguracionFiscalEnMemoria,
  ConsultasDeDocumentosEnMemoria,
  ControlDePeriodosEnMemoria,
  DatosDeLaEmpresaEnMemoria,
  DestinosEnMemoria,
  EnlaceConLaBandejaEnMemoria,
  ProveedoresEnMemoria,
  RepositorioDeDocumentosEnMemoria,
} from './dobles-de-documentos.js';

export const operador = operadorDePrueba();
export const NIT_DEL_PROVEEDOR = '576937K';
export const proveedorId = crypto.randomUUID();
export const conceptoId = crypto.randomUUID();
export const combustibleId = crypto.randomUUID();

/** Una solicitud de factura; con FEL lleva el primer código de la SAT de su familia, salvo que se diga otro. */
export const solicitud = (cambios: Partial<SolicitudSinResolver> = {}): SolicitudSinResolver => {
  const completa = solicitudBase(cambios);
  if (completa.tipoDte !== undefined || !completa.autorizacionFel) return completa;
  return { ...completa, tipoDte: CODIGOS_DTE_DE_LA_FAMILIA[completa.tipo ?? 'factura'][0] };
};

const solicitudBase = (cambios: Partial<SolicitudSinResolver>): SolicitudSinResolver => ({
  tipo: 'factura',
  proveedorId,
  destino: 'cuentas-por-pagar',
  nitEmisor: NIT_DEL_PROVEEDOR,
  serie: 'A',
  numero: '1',
  autorizacionFel: crypto.randomUUID(),
  nitReceptor: null,
  motivoFueraDelLibro: null,
  noVinculado: false,
  fechaEmision: '2026-10-01',
  fechaRecepcion: '2026-10-04',
  periodo: null,
  documentoAfectadoId: null,
  ivaDeLaFel: null,
  observaciones: null,
  lineas: [
    {
      conceptoId,
      descripcion: null,
      tipo: null,
      esActivoFijo: null,
      combustibleId: null,
      galones: null,
      total: '1120.00',
      exento: null,
    },
  ],
  ajustesDeRetenciones: [],
  /** Por omisión el proveedor contesta lo de siempre; las pruebas de «faltan datos» pasan `null`. */
  datosFiscalesDelProveedor: { regimenIsr: 'utilidades', esAgenteDeRetencionIva: false },
  confirmarCambioDeRegimen: false,
  ...cambios,
});

/** Todo lo que necesitan los casos de uso de documentos, con dobles en memoria y un proveedor sin NIT. */
export function crearEscenario() {
  const proveedores = new ProveedoresEnMemoria();
  proveedores.filas.set(proveedorId, {
    id: proveedorId,
    nombre: 'Veterinaria',
    nit: null,
    dpi: null,
    tipoDePersona: 'juridica',
    activo: true,
  });
  const catalogos = new CatalogosEnMemoria();
  catalogos.listaDeConceptos.push({
    id: conceptoId,
    nombre: 'Medicinas',
    tipoPorOmision: 'bien',
    esProductoAgropecuario: false,
    esActivoFijo: false,
    activo: true,
  });
  const consultas = new ConsultasDeDocumentosEnMemoria();
  const repositorio = new RepositorioDeDocumentosEnMemoria();
  const destinos = new DestinosEnMemoria();
  const empresa = new DatosDeLaEmpresaEnMemoria();
  const completadorDeNit = new CompletadorDeNitEnMemoria();
  const completadorDeDpi = new CompletadorDeDpiEnMemoria();
  const bandeja = new EnlaceConLaBandejaEnMemoria();
  const datosDeEmpresa = new DatosFiscalesDeEmpresaEnMemoria(DatosFiscalesDeEmpresa.porOmision());
  const datosDeProveedor = new DatosFiscalesDeProveedorEnMemoria();
  const publicadorEventos = new PublicadorEventosEnMemoria();
  const auditoria = new AuditoriaEnMemoria();
  const control = new ControlDePeriodosEnMemoria();
  const guardados = new DocumentosGuardadosEnMemoria();
  const enteros = new ConsultasDeEnterosEnMemoria();
  const retenciones = new RetencionesDeUnDocumentoEnMemoria();
  const dependencias: DependenciasDelPreparador & {
    unidadDeTrabajo: UnidadDeTrabajoEnMemoria;
    repositorio: RepositorioDeDocumentos;
    completadorDeNit: CompletadorDeNit;
    completadorDeDpi: CompletadorDeDpi;
    bandeja: EnlaceConLaBandejaEnMemoria;
    auditoria: AuditoriaEnMemoria;
    publicadorEventos: PublicadorEventosEnMemoria;
    retenciones: RetencionesDeUnDocumento;
  } = {
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    reloj: new RelojFijo('2026-10-04'),
    empresa,
    proveedores,
    datosFiscalesDeEmpresa: datosDeEmpresa,
    datosFiscalesDeProveedor: datosDeProveedor,
    configuracion: new ConfiguracionFiscalEnMemoria(),
    calendario: new FuenteDeLunesAViernes(),
    catalogos,
    consultas,
    destinos,
    control,
    repositorio,
    completadorDeNit,
    completadorDeDpi,
    bandeja,
    auditoria,
    publicadorEventos,
    enteros,
    retenciones,
  };
  return {
    proveedores,
    catalogos,
    consultas,
    repositorio,
    destinos,
    empresa,
    completadorDeNit,
    completadorDeDpi,
    bandeja,
    datosDeEmpresa,
    datosDeProveedor,
    publicadorEventos,
    auditoria,
    control,
    guardados,
    enteros,
    retenciones,
    dependencias,
  };
}

export type EscenarioEnMemoria = ReturnType<typeof crearEscenario>;
