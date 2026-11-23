import type { Operador } from '../../../core/compartido/aplicacion/operador.js';
import type {
  DestinoDeDocumentoDeVenta,
  DocumentoDeVentaParaDestino,
} from '../../../core/contratos/libro-de-ventas.contratos.js';
import type { CausaDeAnulacion, HechosDeUnDocumento } from '../../dominio/baja-de-documento.js';
import type { DestinoDelConsumidorFinal } from '../../dominio/destino-del-documento.js';
import type { DocumentoDeVenta } from '../../dominio/documento-de-venta.js';
import type { ClienteDelDocumento } from '../../dominio/receptor.js';
import type { RegimenDelMes } from '../../dominio/regimen-de-la-empresa.js';
import type { FacturaConNotas, FacturaDeLaNota } from '../../dominio/reglas-de-notas.js';
import type { ClaveDeSistemaDeIngreso } from '../../dominio/concepto-de-ingreso.js';
import type {
  DocumentoDeVentaFichaDto,
  FiltroDeDocumentosDeVenta,
  PaginaDeDocumentosDeVentaDto,
  PaginacionDeDocumentosDeVenta,
} from '../dto/documento-de-venta.dto.js';

/** Lo que identifica un documento repetido: el mismo código (o familia en papel), serie y número, o la misma FEL. */
export interface ClaveDeDocumentoDeVenta {
  tipoOTipoDte: string;
  serie: string | null;
  numero: string;
  autorizacionFel: string | null;
}

/** Un documento guardado, listo para decidir si se anula o se elimina, y como lo ve la pantalla. */
export interface DocumentoGuardadoDeVenta {
  ficha: DocumentoDeVentaFichaDto;
  hechos: HechosDeUnDocumento;
  /** El cliente del documento y el período, para las guardias. */
  clienteId: string | null;
}

/** Los datos de una factura que corrige una nota, con lo que ya corrigieron sus notas vigentes. */
export interface FacturaConNotasGuardada extends FacturaDeLaNota, FacturaConNotas {
  id: string;
  destino: DestinoDeDocumentoDeVenta | null;
}

export interface DatosDeAnulacionGuardada {
  anuladoPor: string;
  motivo: string;
  causa: CausaDeAnulacion;
  fecha: string;
}

/** Guarda y recupera documentos con sus líneas; RLS limita todo a la empresa de la transacción. */
export interface RepositorioDeDocumentosDeVenta {
  agregar(documento: DocumentoDeVenta): Promise<void>;
  buscarRepetido(clave: ClaveDeDocumentoDeVenta): Promise<{ id: string } | null>;
  /** Con `bloquear` toma la fila con `for update`: dos bajas o dos notas a la vez no se pisan. */
  buscar(documentoId: string, bloquear: boolean): Promise<DocumentoGuardadoDeVenta | null>;
  /** La factura con sus notas vigentes sumadas; con `bloquear`, su fila con `for update`. */
  facturaConNotas(facturaId: string, bloquear: boolean): Promise<FacturaConNotasGuardada | null>;
  anular(documentoId: string, datos: DatosDeAnulacionGuardada): Promise<void>;
  /** Borra el documento y, en cascada, sus líneas. */
  eliminar(documentoId: string): Promise<void>;
  marcarProcesado(documentoId: string, procesado: boolean): Promise<void>;
}

export interface ConsultasDeDocumentosDeVenta {
  listar(
    filtro: FiltroDeDocumentosDeVenta,
    paginacion: PaginacionDeDocumentosDeVenta,
  ): Promise<PaginaDeDocumentosDeVentaDto>;
}

export interface ConceptoParaLinea {
  id: string;
  tipo: 'bien' | 'servicio';
  activo: boolean;
  claveDeSistema: ClaveDeSistemaDeIngreso | null;
}

export interface ClienteParaDocumento extends ClienteDelDocumento {
  id: string;
  activo: boolean;
}

/** Lo que el registro lee de otras tablas: clientes, conceptos y localidades (RLS limita todo a la cuenta o empresa). */
export interface CatalogosParaDocumentos {
  cliente(clienteId: string): Promise<ClienteParaDocumento | null>;
  conceptos(ids: readonly string[]): Promise<ConceptoParaLinea[]>;
  localidadExiste(localidadId: string): Promise<boolean>;
}

/** El historial fiscal de la empresa que lleva Libro de compras; solo se lee. */
export interface HistorialFiscalParaVentas {
  /** El régimen vigente en el mes; `null` si la empresa no tiene datos fiscales. `bloquear` toma el historial con `for share`. */
  regimenEn(empresaId: string, periodo: string, bloquear: boolean): Promise<RegimenDelMes | null>;
}

export interface EstadoDelPeriodo {
  declarado: boolean;
  /** Declarado **y** con el control encendido: no admite registrar, anular ni eliminar. */
  bloquea: boolean;
}

/** Qué períodos están declarados (los lleva Libro de compras) y si eso bloquea. Corre dentro de la unidad de trabajo. */
export interface ControlDePeriodosParaVentas {
  estadoDe(periodo: string, bloquear: boolean): Promise<EstadoDelPeriodo>;
}

export interface ConfiguracionDeVentas {
  /** Tasa del IVA en centésimas (12 % → 1200). */
  tasaDeIva: number;
  fechaDeDerogacion: string;
  consumidorFinal: DestinoDelConsumidorFinal;
}

export interface LectorDeConfiguracionDeVentas {
  paraEmpresa(operador: Operador): Promise<ConfiguracionDeVentas>;
}

/** El NIT y la fecha de inicio de la empresa los da Empresas. */
export interface DatosDeLaEmpresaParaVentas {
  nit(operador: Operador): Promise<string | null>;
  fechaDeInicio(operador: Operador): Promise<string | null>;
}

/** El módulo de destino (la cartera) y las órdenes y avisos que se le mandan. */
export interface DestinosDeVenta {
  activos(operador: Operador): Promise<DestinoDeDocumentoDeVenta[]>;
  recibir(
    operador: Operador,
    destino: DestinoDeDocumentoDeVenta,
    documento: DocumentoDeVentaParaDestino,
  ): Promise<string[]>;
  avisarPorAnular(
    operador: Operador,
    aviso: { documentoId: string; destino: DestinoDeDocumentoDeVenta; motivo: string },
  ): Promise<void>;
  avisarPorEliminar(
    operador: Operador,
    aviso: { documentoId: string; destino: DestinoDeDocumentoDeVenta },
  ): Promise<void>;
}
