import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import { ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';
import type {
  DestinoDeDocumentoDeVenta,
  DocumentoDeVentaParaDestino,
} from '../../core/contratos/libro-de-ventas.contratos.js';
import type {
  CatalogosParaDocumentos,
  ClienteParaDocumento,
  ConceptoParaLinea,
  ConfiguracionDeVentas,
  ControlDePeriodosParaVentas,
  DatosDeLaEmpresaParaVentas,
  DestinosDeVenta,
  EstadoDelPeriodo,
  HistorialFiscalParaVentas,
  LectorDeConfiguracionDeVentas,
} from '../aplicacion/puertos/puertos-de-documentos.js';
import type { RegimenDelMes } from '../dominio/regimen-de-la-empresa.js';

/** La cartera falsa rechaza lo que se le pide cuando se le dice, como una que ya tiene cobros. */
export class CarteraRechaza extends ReglaDeNegocioInfringida {
  readonly codigo = 'cartera_rechaza';

  constructor() {
    super('La cartera no acepta el cambio.');
  }
}

/** Clientes, conceptos y localidades que el escenario da de alta a mano. */
export class CatalogosEnMemoria implements CatalogosParaDocumentos {
  readonly clientes = new Map<string, ClienteParaDocumento>();
  readonly conceptosDeIngreso = new Map<string, ConceptoParaLinea>();
  readonly localidades = new Set<string>();

  async cliente(clienteId: string) {
    return this.clientes.get(clienteId) ?? null;
  }

  async conceptos(ids: readonly string[]) {
    return ids.flatMap((id) => this.conceptosDeIngreso.get(id) ?? []);
  }

  async localidadExiste(localidadId: string) {
    return this.localidades.has(localidadId);
  }
}

export class HistorialFiscalEnMemoria implements HistorialFiscalParaVentas {
  constructor(public regimen: RegimenDelMes | null = { regimenIva: 'general', regimenIsr: 'utilidades' }) {}
  /** Los meses (primer día) para los que se pidió el régimen y si se bloqueó. */
  readonly consultas: Array<{ periodo: string; bloquear: boolean }> = [];

  async regimenEn(_empresaId: string, periodo: string, bloquear: boolean) {
    this.consultas.push({ periodo, bloquear });
    return this.regimen;
  }

  /** El régimen de una vigencia con fecha para los meses anteriores a la fecha de inicio; por omisión no hay historial. */
  regimenConVigencia: RegimenDelMes | null = null;

  async regimenConVigenciaEn() {
    return this.regimenConVigencia;
  }
}

export class ControlDePeriodosEnMemoria implements ControlDePeriodosParaVentas {
  readonly declarados = new Set<string>();
  bloquea = false;

  async estadoDe(periodo: string): Promise<EstadoDelPeriodo> {
    const declarado = this.declarados.has(periodo);
    return { declarado, bloquea: declarado && this.bloquea };
  }
}

export class ConfiguracionDeVentasEnMemoria implements LectorDeConfiguracionDeVentas {
  constructor(
    public configuracion: ConfiguracionDeVentas = {
      tasaDeIva: 1200,
      fechaDeDerogacion: '2025-07-09',
      consumidorFinal: 'sin_cartera',
    },
  ) {}

  async paraEmpresa(_operador: Operador) {
    return this.configuracion;
  }
}

export class DatosDeLaEmpresaEnMemoria implements DatosDeLaEmpresaParaVentas {
  constructor(
    public datos: { nit: string | null; fechaDeInicio: string | null } = { nit: '12345679', fechaDeInicio: null },
  ) {}

  async nit() {
    return this.datos.nit;
  }

  async fechaDeInicio() {
    return this.datos.fechaDeInicio;
  }
}

/** La cartera falsa: guarda lo que recibe y los avisos de baja; puede rechazar. */
export class DestinosEnMemoria implements DestinosDeVenta {
  activosDeLaCuenta: DestinoDeDocumentoDeVenta[] = [];
  rechazar = false;
  readonly recibidos: DocumentoDeVentaParaDestino[] = [];
  readonly avisosDeBaja: Array<{ aviso: 'anular' | 'eliminar'; documentoId: string; motivo?: string }> = [];

  async activos() {
    return this.activosDeLaCuenta;
  }

  async recibir(_operador: Operador, _destino: DestinoDeDocumentoDeVenta, documento: DocumentoDeVentaParaDestino) {
    this.recibidos.push(documento);
    if (this.rechazar) throw new CarteraRechaza();
    return ['La cartera avisa algo.'];
  }

  async avisarPorAnular(_operador: Operador, aviso: { documentoId: string; motivo: string }) {
    this.avisosDeBaja.push({ aviso: 'anular', documentoId: aviso.documentoId, motivo: aviso.motivo });
    if (this.rechazar) throw new CarteraRechaza();
  }

  async avisarPorEliminar(_operador: Operador, aviso: { documentoId: string }) {
    this.avisosDeBaja.push({ aviso: 'eliminar', documentoId: aviso.documentoId });
    if (this.rechazar) throw new CarteraRechaza();
  }
}
