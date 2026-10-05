import type { ContextoEmpresa } from '../../../core/compartido/aplicacion/contexto-empresa.js';
import type { Operador } from '../../../core/compartido/aplicacion/operador.js';
import type { DocumentoParaDestino } from '../../../core/contratos/libro-de-compras.contratos.js';
import type { DestinoDeDocumento } from '../../dominio/destinos-de-documento.js';
import type { DocumentoDeCompra } from '../../dominio/documento-de-compra.js';
import type { DocumentoAnuladoConRetenciones } from '../../dominio/retencion-practicada.js';
import type { ConfiguracionDeRetenciones } from '../../dominio/retencion-propuesta.js';
import type { MotivoSinCredito, TipoDeDocumento } from '../../dominio/tipos-de-documento.js';

/** El proveedor de la cuenta con lo que el libro necesita de Terceros. */
export interface ProveedorParaDocumento {
  id: string;
  nombre: string;
  /** NIT normalizado; `null` si el tercero no tiene. */
  nit: string | null;
  tipoDePersona: 'individual' | 'juridica';
  /** El papel de proveedor y el tercero siguen activos. */
  activo: boolean;
}

/** Lee proveedores de la cuenta de la transacción (RLS por cuenta). */
export interface ProveedoresParaDocumentos {
  buscar(proveedorId: string): Promise<ProveedorParaDocumento | null>;
}

export interface ConceptoParaLinea {
  id: string;
  nombre: string;
  tipoPorOmision: 'bien' | 'servicio';
  esProductoAgropecuario: boolean;
  esActivoFijo: boolean;
  activo: boolean;
}

/** Un combustible de la empresa con la tasa de IDP que rige en una fecha; `vigencia` es `null` si no hay tasa. */
export interface CombustibleConTasa {
  combustibleId: string;
  nombre: string;
  activo: boolean;
  vigencia: { id: string; idpPorGalon: string; porcentajeDeEtanol: string } | null;
}

/** Catálogos de la empresa que usan las líneas. */
export interface CatalogosParaDocumentos {
  conceptos(ids: readonly string[]): Promise<ConceptoParaLinea[]>;
  combustiblesConTasa(ids: readonly string[], fecha: string): Promise<CombustibleConTasa[]>;
}

/** La factura que rebaja una nota de crédito, con lo ya rebajado por las notas vigentes. Montos en centavos. */
export interface FacturaParaNota {
  id: string;
  tipo: TipoDeDocumento;
  estado: 'vigente' | 'anulado';
  proveedorId: string;
  destino: DestinoDeDocumento;
  motivoSinCredito: MotivoSinCredito | null;
  fechaEmision: string;
  total: number;
  iva: number;
  totalDeNotas: number;
  ivaDeNotas: number;
}

/** La clave con que se busca un documento ya registrado en la empresa. */
export interface ClaveDeDocumento {
  tipo: TipoDeDocumento;
  proveedorId: string;
  muestraEnReportesSat: boolean;
  nitEmisor: string | null;
  serie: string | null;
  numero: string;
  autorizacionFel: string | null;
}

/** Guarda documentos nuevos y busca repetidos; RLS limita todo a la empresa de la transacción. */
export interface RepositorioDeDocumentos {
  agregar(documento: DocumentoDeCompra): Promise<void>;
  /** Un documento vigente de la empresa activa que choca con la clave (SAT, FEL o del proveedor). */
  buscarRepetido(clave: ClaveDeDocumento): Promise<{ id: string } | null>;
}

/** Consultas de apoyo al registrar y al armar el formulario. */
export interface ConsultasDeDocumentos {
  /** La factura vigente o no; con `bloquear` la fila queda bloqueada hasta el fin de la transacción. */
  buscarFacturaParaNota(id: string, bloquear: boolean): Promise<FacturaParaNota | null>;
  /** El destino del último documento que la empresa registró con ese proveedor. */
  ultimoDestinoDelProveedor(proveedorId: string): Promise<DestinoDeDocumento | null>;
  /**
   * El documento anulado más reciente de la empresa con la misma autorización FEL (o el mismo NIT del emisor, tipo,
   * serie y número) que retuvo algo; `null` si no hay. Solo trae las retenciones con monto mayor que cero.
   */
  buscarAnuladoConRetenciones(clave: ClaveDeDocumento): Promise<DocumentoAnuladoConRetenciones | null>;
}

/** Destinos de los documentos: Cuentas por pagar y los demás módulos que los reciben (por el mediador). */
export interface DestinosDeDocumentos {
  /** Los destinos cuyo módulo está activo en la cuenta del operador. */
  activos(operador: Operador): Promise<DestinoDeDocumento[]>;
  /** Orden `<destino>.recibir_documento`, dentro de la transacción en curso. */
  recibir(operador: Operador, destino: DestinoDeDocumento, documento: DocumentoParaDestino): Promise<void>;
  /** Aviso `documento_por_anular`, antes de anular: el destino revierte lo suyo o lanza su error. */
  avisarPorAnular(operador: Operador, aviso: AvisoDeBaja & { motivo: string }): Promise<void>;
  /** Aviso `documento_por_eliminar`, antes de eliminar: el destino borra lo suyo o lanza su error. */
  avisarPorEliminar(operador: Operador, aviso: AvisoDeBaja): Promise<void>;
}

/** A qué destino y de qué documento se avisa una baja. */
export interface AvisoDeBaja {
  documentoId: string;
  destino: DestinoDeDocumento;
}

/** Datos de la empresa activa que guarda el módulo de Empresas. */
export interface DatosDeLaEmpresaParaDocumentos {
  /** El NIT de la empresa, tal como está escrito; `null` si no tiene. */
  nit(operador: Operador): Promise<string | null>;
}

/** Pone el NIT del emisor al proveedor que no tiene (orden `terceros.completar_nit`). */
export interface CompletadorDeNit {
  completar(operador: Operador, proveedorId: string, nit: string): Promise<void>;
}

/** Tasas, mínimos y plazos fiscales resueltos para la empresa (empresa, cuenta, instalación o por omisión). */
export interface ConfiguracionFiscal {
  /** Tasa del IVA en centésimas (12 % → 1200). */
  tasaDeIva: number;
  retenciones: ConfiguracionDeRetenciones;
  diasHabilesIva: number;
  diasHabilesIsr: number;
}

export interface LectorDeConfiguracionFiscal {
  paraEmpresa(contexto: ContextoEmpresa): Promise<ConfiguracionFiscal>;
}

/** Períodos declarados (L5). Hoy ninguna implementación bloquea. */
export interface ControlDePeriodos {
  /** @throws si el período ya está declarado y el control está encendido. */
  exigirAbierto(periodo: string): Promise<void>;
}
