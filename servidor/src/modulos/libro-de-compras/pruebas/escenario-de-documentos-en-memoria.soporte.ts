import {
  AuditoriaEnMemoria,
  PublicadorEventosEnMemoria,
  RelojFijo,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../core/compartido/pruebas/dobles-compartidos.js';
import type { DependenciasDelPreparador } from '../aplicacion/casos-uso/documentos/preparador-de-documento.js';
import type { SolicitudDeDocumento } from '../aplicacion/dto/solicitud-de-documento.js';
import type { CompletadorDeNit, RepositorioDeDocumentos } from '../aplicacion/puertos/puertos-de-documentos.js';
import { DatosFiscalesDeEmpresaEnMemoria, DatosFiscalesDeProveedorEnMemoria } from './dobles-de-datos-fiscales.js';
import {
  CatalogosEnMemoria,
  CompletadorDeNitEnMemoria,
  ConfiguracionFiscalEnMemoria,
  ConsultasDeDocumentosEnMemoria,
  ControlDePeriodosEnMemoria,
  DatosDeLaEmpresaEnMemoria,
  DestinosEnMemoria,
  ProveedoresEnMemoria,
  RepositorioDeDocumentosEnMemoria,
} from './dobles-de-documentos.js';

export const operador = operadorDePrueba();
export const NIT_DEL_PROVEEDOR = '576937K';
export const proveedorId = crypto.randomUUID();
export const conceptoId = crypto.randomUUID();
export const combustibleId = crypto.randomUUID();

export const solicitud = (cambios: Partial<SolicitudDeDocumento> = {}): SolicitudDeDocumento => ({
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
  ...cambios,
});

/** Todo lo que necesitan los casos de uso de documentos, con dobles en memoria y un proveedor sin NIT. */
export function crearEscenario() {
  const proveedores = new ProveedoresEnMemoria();
  proveedores.filas.set(proveedorId, {
    id: proveedorId,
    nombre: 'Veterinaria',
    nit: null,
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
  const datosDeEmpresa = new DatosFiscalesDeEmpresaEnMemoria();
  const publicadorEventos = new PublicadorEventosEnMemoria();
  const auditoria = new AuditoriaEnMemoria();
  const dependencias: DependenciasDelPreparador & {
    unidadDeTrabajo: UnidadDeTrabajoEnMemoria;
    repositorio: RepositorioDeDocumentos;
    completadorDeNit: CompletadorDeNit;
    auditoria: AuditoriaEnMemoria;
    publicadorEventos: PublicadorEventosEnMemoria;
  } = {
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    reloj: new RelojFijo('2026-10-04'),
    empresa,
    proveedores,
    datosFiscalesDeEmpresa: datosDeEmpresa,
    datosFiscalesDeProveedor: new DatosFiscalesDeProveedorEnMemoria(),
    configuracion: new ConfiguracionFiscalEnMemoria(),
    catalogos,
    consultas,
    destinos,
    control: new ControlDePeriodosEnMemoria(),
    repositorio,
    completadorDeNit,
    auditoria,
    publicadorEventos,
  };
  return {
    proveedores,
    catalogos,
    consultas,
    repositorio,
    destinos,
    empresa,
    completadorDeNit,
    datosDeEmpresa,
    publicadorEventos,
    auditoria,
    dependencias,
  };
}

export type EscenarioEnMemoria = ReturnType<typeof crearEscenario>;
