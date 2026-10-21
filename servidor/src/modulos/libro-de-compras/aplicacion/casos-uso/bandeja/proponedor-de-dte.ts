import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { DteRecibido } from '../../../dominio/dte-recibido.js';
import type { DestinoDeDocumento } from '../../../dominio/destinos-de-documento.js';
import { primerDiaDelMes } from '../../../dominio/periodo-del-libro.js';
import { FAMILIA_DEL_TIPO_DTE } from '../../../dominio/tipos-de-documento.js';
import type { PropuestaDeDteDto } from '../../dto/dte-recibido.dto.js';
import type {
  ConsultasDeDocumentos,
  DestinosDeDocumentos,
  ProveedoresParaDocumentos,
} from '../../puertos/puertos-de-documentos.js';
import type { ConsultasDeLaBandeja } from '../../puertos/puertos-de-la-bandeja.js';
import type { RepositorioDeDatosFiscalesDeEmpresa } from '../../puertos/repositorios-de-datos-fiscales.js';
import { type GuardiaDelPeriodo, type PeriodoElegido } from '../documentos/guardia-del-periodo.js';

export interface DependenciasDelProponedor {
  proveedores: ProveedoresParaDocumentos;
  consultas: ConsultasDeDocumentos;
  consultasDeLaBandeja: ConsultasDeLaBandeja;
  destinos: DestinosDeDocumentos;
  datosFiscalesDeEmpresa: RepositorioDeDatosFiscalesDeEmpresa;
  guardiaDelPeriodo: GuardiaDelPeriodo;
}

/** Lo que se sabe de un proveedor por lo que ya se le registró. */
interface HistorialDelProveedor {
  conceptoId: string | null;
  destino: DestinoDeDocumento | null;
}

const SIN_HISTORIAL: HistorialDelProveedor = { conceptoId: null, destino: null };

/**
 * Calcula, para una fila de la bandeja, lo que se usaría si el usuario no completa nada: proveedor por NIT, el último
 * concepto y destino de ese proveedor, la recepción igual a la emisión y el período de siempre. Se crea uno por
 * solicitud: guarda en memoria lo ya consultado (proveedores, destinos activos, meses) para no repetir consultas.
 */
export class ProponedorDeDte {
  private readonly proveedoresPorNit = new Map<string, Promise<string | null>>();
  private readonly historiales = new Map<string, Promise<HistorialDelProveedor>>();
  private readonly obligatoriedades = new Map<string, Promise<boolean>>();
  private destinosActivos: Promise<DestinoDeDocumento[]> | null = null;

  constructor(
    private readonly dependencias: DependenciasDelProponedor,
    private readonly operador: Operador,
  ) {}

  async proponer(dte: DteRecibido): Promise<PropuestaDeDteDto> {
    const datos = dte.instantanea();
    const proveedorId = datos.proveedorId ?? (await this.proveedorDelNit(datos.nitEmisor));
    const historial = proveedorId ? await this.historialDe(proveedorId) : SIN_HISTORIAL;
    const periodo = await this.periodoDe(dte);
    return {
      proveedorId,
      ...historial,
      fechaRecepcion: datos.fechaEmision,
      recepcionObligatoria: await this.recepcionObligatoria(datos.fechaEmision),
      periodo: periodo.periodo,
      avisoDelPeriodo: periodo.aviso,
    };
  }

  /** El proveedor activo de ese NIT, o `null` si no existe o está inactivo (hay que crearlo o reactivarlo). */
  private proveedorDelNit(nit: string): Promise<string | null> {
    const guardado = this.proveedoresPorNit.get(nit);
    if (guardado) return guardado;
    const nuevo = this.dependencias.proveedores.buscarPorNit(nit).then((p) => (p?.activo ? p.id : null));
    this.proveedoresPorNit.set(nit, nuevo);
    return nuevo;
  }

  private historialDe(proveedorId: string): Promise<HistorialDelProveedor> {
    const guardado = this.historiales.get(proveedorId);
    if (guardado) return guardado;
    const nuevo = this.leerHistorial(proveedorId);
    this.historiales.set(proveedorId, nuevo);
    return nuevo;
  }

  private async leerHistorial(proveedorId: string): Promise<HistorialDelProveedor> {
    const { consultasDeLaBandeja, consultas } = this.dependencias;
    const ultimo = await consultas.ultimoDestinoDelProveedor(proveedorId);
    const activos = await this.destinosActivosDeLaCuenta();
    return {
      conceptoId: await consultasDeLaBandeja.ultimoConceptoDelProveedor(proveedorId),
      destino: ultimo && activos.includes(ultimo) ? ultimo : null,
    };
  }

  private destinosActivosDeLaCuenta(): Promise<DestinoDeDocumento[]> {
    this.destinosActivos ??= this.dependencias.destinos.activos(this.operador);
    return this.destinosActivos;
  }

  private periodoDe(dte: DteRecibido): Promise<PeriodoElegido> {
    const { fechaEmision, fechaRecepcion, tipoDte } = dte.instantanea();
    const pedido = { tipo: FAMILIA_DEL_TIPO_DTE[tipoDte], fechaEmision, periodo: null };
    return this.dependencias.guardiaDelPeriodo.elegir(this.operador, pedido, fechaRecepcion ?? fechaEmision);
  }

  /** La empresa es agente de retención del IVA en el mes de la emisión. */
  private recepcionObligatoria(fechaEmision: string): Promise<boolean> {
    const mes = primerDiaDelMes(fechaEmision);
    const guardada = this.obligatoriedades.get(mes);
    if (guardada) return guardada;
    const nueva = this.dependencias.datosFiscalesDeEmpresa
      .vigenteEn(this.operador.empresaId, mes)
      .then((datos) => (datos?.instantanea().agenteDeRetencionIva ?? 'ninguno') !== 'ninguno');
    this.obligatoriedades.set(mes, nueva);
    return nueva;
  }
}
