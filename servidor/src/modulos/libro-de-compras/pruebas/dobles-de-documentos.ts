import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import type { DocumentoParaDestino } from '../../core/contratos/libro-de-compras.contratos.js';
import type {
  AvisoDeBaja,
  CatalogosParaDocumentos,
  ClaveDeDocumento,
  CombustibleConTasa,
  CompletadorDeDpi,
  CompletadorDeNit,
  ConceptoParaLinea,
  ConfiguracionFiscal,
  ConsultasDeDocumentos,
  DatosDeLaEmpresaParaDocumentos,
  DestinosDeDocumentos,
  FacturaParaNota,
  LectorDeConfiguracionFiscal,
  ProveedorParaDocumento,
  ProveedoresParaDocumentos,
  RepositorioDeDocumentos,
} from '../aplicacion/puertos/puertos-de-documentos.js';
import type { EnlaceConLaBandeja } from '../aplicacion/puertos/puertos-de-la-bandeja.js';
import type { ControlDePeriodos, EstadoDelPeriodo, ModoDeControl } from '../aplicacion/puertos/puertos-de-periodos.js';
import { configuracionDelLibroDeCompras } from '../configuracion.js';
import { aCentesimasDeConfiguracion } from '../dominio/aritmetica-fiscal.js';
import { configuracionDeRetenciones } from '../dominio/configuracion-de-retenciones.js';
import type { DestinoDeDocumento } from '../dominio/destinos-de-documento.js';
import type { DeclaracionCitada } from '../dominio/periodos/avisos-de-periodos.js';
import type { DocumentoDeCompra } from '../dominio/documento-de-compra.js';
import type { DocumentoAnuladoConRetenciones } from '../dominio/retencion-practicada.js';

export class ProveedoresEnMemoria implements ProveedoresParaDocumentos {
  readonly filas = new Map<string, ProveedorParaDocumento>();

  async buscar(proveedorId: string): Promise<ProveedorParaDocumento | null> {
    return this.filas.get(proveedorId) ?? null;
  }

  async buscarPorNit(nit: string): Promise<ProveedorParaDocumento | null> {
    return [...this.filas.values()].find((proveedor) => proveedor.nit === nit) ?? null;
  }
}

export class CatalogosEnMemoria implements CatalogosParaDocumentos {
  readonly listaDeConceptos: ConceptoParaLinea[] = [];
  readonly listaDeCombustibles: CombustibleConTasa[] = [];

  async conceptos(ids: readonly string[]): Promise<ConceptoParaLinea[]> {
    return this.listaDeConceptos.filter((concepto) => ids.includes(concepto.id));
  }

  async combustiblesConTasa(ids: readonly string[], _fecha: string): Promise<CombustibleConTasa[]> {
    return this.listaDeCombustibles.filter((combustible) => ids.includes(combustible.combustibleId));
  }
}

export class ConsultasDeDocumentosEnMemoria implements ConsultasDeDocumentos {
  readonly facturas = new Map<string, FacturaParaNota>();
  ultimoDestino: DestinoDeDocumento | null = null;
  /** El documento anulado con la misma FEL que ya retuvo algo; `null`: ninguno. */
  anuladoConRetenciones: DocumentoAnuladoConRetenciones | null = null;
  readonly clavesBuscadas: ClaveDeDocumento[] = [];

  async buscarFacturaParaNota(id: string, _bloquear: boolean): Promise<FacturaParaNota | null> {
    return this.facturas.get(id) ?? null;
  }

  async ultimoDestinoDelProveedor(_proveedorId: string): Promise<DestinoDeDocumento | null> {
    return this.ultimoDestino;
  }

  async buscarAnuladoConRetenciones(clave: ClaveDeDocumento): Promise<DocumentoAnuladoConRetenciones | null> {
    this.clavesBuscadas.push(clave);
    return this.anuladoConRetenciones;
  }
}

export class RepositorioDeDocumentosEnMemoria implements RepositorioDeDocumentos {
  readonly agregados: DocumentoDeCompra[] = [];

  async agregar(documento: DocumentoDeCompra): Promise<void> {
    this.agregados.push(documento);
  }

  async buscarRepetido(clave: ClaveDeDocumento): Promise<{ id: string } | null> {
    return (
      this.agregados.find(
        (documento) =>
          documento.proveedorId === clave.proveedorId &&
          documento.tipo === clave.tipo &&
          documento.numero === clave.numero &&
          (documento.serie ?? '') === (clave.serie ?? ''),
      ) ?? null
    );
  }
}

/** El destino de prueba: guarda lo que recibe y puede rechazarlo lanzando `fallo`. */
export class DestinosEnMemoria implements DestinosDeDocumentos {
  readonly recibidos: DocumentoParaDestino[] = [];
  instalados: DestinoDeDocumento[] = ['cuentas-por-pagar'];
  fallo: Error | null = null;
  readonly avisosDeAnular: Array<AvisoDeBaja & { motivo: string }> = [];
  readonly avisosDeEliminar: AvisoDeBaja[] = [];
  falloAlAnular: Error | null = null;
  falloAlEliminar: Error | null = null;

  async activos(_operador: Operador): Promise<DestinoDeDocumento[]> {
    return this.instalados;
  }

  async recibir(_operador: Operador, _destino: DestinoDeDocumento, documento: DocumentoParaDestino): Promise<void> {
    if (this.fallo) throw this.fallo;
    this.recibidos.push(documento);
  }

  async avisarPorAnular(_operador: Operador, aviso: AvisoDeBaja & { motivo: string }): Promise<void> {
    if (this.falloAlAnular) throw this.falloAlAnular;
    this.avisosDeAnular.push(aviso);
  }

  async avisarPorEliminar(_operador: Operador, aviso: AvisoDeBaja): Promise<void> {
    if (this.falloAlEliminar) throw this.falloAlEliminar;
    this.avisosDeEliminar.push(aviso);
  }
}

export class DatosDeLaEmpresaEnMemoria implements DatosDeLaEmpresaParaDocumentos {
  nitDeLaEmpresa: string | null = '12345679';

  async nit(_operador: Operador): Promise<string | null> {
    return this.nitDeLaEmpresa;
  }
}

export class CompletadorDeNitEnMemoria implements CompletadorDeNit {
  readonly llamadas: Array<{ proveedorId: string; nit: string }> = [];

  async completar(_operador: Operador, proveedorId: string, nit: string): Promise<void> {
    this.llamadas.push({ proveedorId, nit });
  }
}

export class CompletadorDeDpiEnMemoria implements CompletadorDeDpi {
  readonly llamadas: Array<{ proveedorId: string; dpi: string }> = [];

  async completar(_operador: Operador, proveedorId: string, dpi: string): Promise<void> {
    this.llamadas.push({ proveedorId, dpi });
  }
}

/** La configuración por omisión del módulo, como la resolvería el panel sin ningún cambio. */
export class ConfiguracionFiscalEnMemoria implements LectorDeConfiguracionFiscal {
  private readonly valores = new Map(
    configuracionDelLibroDeCompras.map((variable) => [
      variable.clave,
      variable.predeterminado as number | boolean | string,
    ]),
  );

  async paraEmpresa(): Promise<ConfiguracionFiscal> {
    const valor = (clave: string) => this.valores.get(clave) ?? 0;
    return {
      tasaDeIva: aCentesimasDeConfiguracion(Number(valor('libro-de-compras.iva.tasa'))),
      retenciones: configuracionDeRetenciones(valor),
      diasHabilesIva: Number(valor('libro-de-compras.plazos.dias_habiles_entero_iva')),
      diasHabilesIsr: Number(valor('libro-de-compras.plazos.dias_habiles_entero_isr')),
      fechaDeDerogacion: String(valor('libro-de-compras.regimenes.fecha_de_derogacion')),
    };
  }
}

/** El control de períodos en memoria: por omisión nada está declarado; las pruebas declaran períodos a mano. */
export class ControlDePeriodosEnMemoria implements ControlDePeriodos {
  /** Los períodos que se consultaron, en orden. */
  readonly consultados: string[] = [];
  /** Períodos declarados y su última declaración. */
  readonly declarados = new Map<string, DeclaracionCitada>();
  /** El bloqueo está encendido. */
  bloqueo = false;

  async estadoDe(periodo: string, _modo: ModoDeControl): Promise<EstadoDelPeriodo> {
    this.consultados.push(periodo);
    const ultimaDeclaracion = this.declarados.get(periodo) ?? null;
    return {
      periodo,
      declarado: ultimaDeclaracion !== null,
      bloquea: this.bloqueo && ultimaDeclaracion !== null,
      ultimaDeclaracion,
    };
  }

  async bloqueados(): Promise<string[]> {
    return this.bloqueo ? [...this.declarados.keys()].sort() : [];
  }
}

/** La bandeja de DTE en memoria: solo recuerda los enlaces y las bajas que le avisaron. */
export class EnlaceConLaBandejaEnMemoria implements EnlaceConLaBandeja {
  readonly enlazados: Array<{ autorizacionFel: string; documentoId: string }> = [];
  readonly soltados: string[] = [];

  async enlazar(autorizacionFel: string, documentoId: string): Promise<void> {
    this.enlazados.push({ autorizacionFel, documentoId });
  }

  async soltar(documentoId: string): Promise<void> {
    this.soltados.push(documentoId);
  }
}
