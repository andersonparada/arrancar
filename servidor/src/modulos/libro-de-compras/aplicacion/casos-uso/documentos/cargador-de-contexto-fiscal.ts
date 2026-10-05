import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { Reloj } from '../../../../core/compartido/aplicacion/reloj.js';
import { normalizarNit } from '../../../../core/compartido/dominio/objetos-valor/nit.js';
import type { CalendarioLaboral } from '../../../dominio/calendario-laboral.js';
import { DatosFiscalesDeEmpresa } from '../../../dominio/datos-fiscales-de-empresa.js';
import type { DatosFiscalesDeProveedor } from '../../../dominio/datos-fiscales-de-proveedor.js';
import { resolverDatosFiscalesDelProveedor } from '../../../dominio/datos-fiscales-del-documento.js';
import { EmpresaSinNit, ProveedorInactivo } from '../../../dominio/errores-de-documento.js';
import { periodoPropuesto } from '../../../dominio/periodo-del-libro.js';
import type { SolicitudDeDocumento } from '../../dto/solicitud-de-documento.js';
import type {
  ConfiguracionFiscal,
  DatosDeLaEmpresaParaDocumentos,
  LectorDeConfiguracionFiscal,
  ProveedorParaDocumento,
  ProveedoresParaDocumentos,
} from '../../puertos/puertos-de-documentos.js';
import type {
  RepositorioDeDatosFiscalesDeEmpresa,
  RepositorioDeDatosFiscalesDeProveedor,
} from '../../puertos/repositorios-de-datos-fiscales.js';

/** Todo lo que el cálculo necesita saber del día, la empresa y el proveedor. */
export interface ContextoFiscal {
  hoy: string;
  fechaDeRecepcion: string;
  periodo: string;
  nitDeLaEmpresa: string;
  proveedor: ProveedorParaDocumento;
  datosDeLaEmpresa: DatosFiscalesDeEmpresa;
  /** Con los que se calcula: los guardados, los que llegaron en el cuerpo o los valores por omisión. */
  datosDelProveedor: DatosFiscalesDeProveedor;
  /** El proveedor no tenía fila y llegaron (o se dedujeron) datos nuevos: se guardan al registrar. */
  datosDelProveedorPorGuardar: DatosFiscalesDeProveedor | null;
  calendario: CalendarioLaboral;
  configuracion: ConfiguracionFiscal;
}

export interface DependenciasDelCargador {
  reloj: Reloj;
  empresa: DatosDeLaEmpresaParaDocumentos;
  proveedores: ProveedoresParaDocumentos;
  datosFiscalesDeEmpresa: RepositorioDeDatosFiscalesDeEmpresa;
  datosFiscalesDeProveedor: RepositorioDeDatosFiscalesDeProveedor;
  configuracion: LectorDeConfiguracionFiscal;
  calendario: CalendarioLaboral;
}

/**
 * Reúne el contexto fiscal de un documento. Sin datos fiscales guardados del proveedor usa los que llegan en el
 * cuerpo (obligatorios en una factura del libro si la empresa retiene algo) o los valores por omisión.
 */
export class CargadorDeContextoFiscal {
  constructor(private readonly dependencias: DependenciasDelCargador) {}

  /**
   * @throws EmpresaSinNit si la empresa no tiene NIT.
   * @throws RecursoNoEncontrado si el proveedor no es de la cuenta.
   * @throws ProveedorInactivo si el papel de proveedor (o el tercero) está inactivo.
   * @throws FaltanDatosFiscalesDelProveedor si hacen falta sus datos fiscales y no llegaron.
   */
  async cargar(operador: Operador, solicitud: SolicitudDeDocumento): Promise<ContextoFiscal> {
    const hoy = await this.dependencias.reloj.hoy(operador);
    const fechaDeRecepcion = solicitud.fechaRecepcion ?? hoy;
    const proveedor = await this.proveedor(solicitud.proveedorId);
    const nitDeLaEmpresa = await this.nitDeLaEmpresa(operador);
    const datosDeLaEmpresa = await this.datosDeLaEmpresa(operador);
    const delProveedor = await this.datosDelProveedor(solicitud, datosDeLaEmpresa);
    return {
      hoy,
      fechaDeRecepcion,
      periodo:
        solicitud.periodo ??
        periodoPropuesto({ tipo: solicitud.tipo, fechaDeEmision: solicitud.fechaEmision, fechaDeRecepcion }),
      nitDeLaEmpresa,
      proveedor,
      datosDeLaEmpresa,
      datosDelProveedor: delProveedor.vigentes,
      datosDelProveedorPorGuardar: delProveedor.porGuardar,
      calendario: this.dependencias.calendario,
      configuracion: await this.dependencias.configuracion.paraEmpresa(operador),
    };
  }

  private async datosDeLaEmpresa(operador: Operador): Promise<DatosFiscalesDeEmpresa> {
    const guardados = await this.dependencias.datosFiscalesDeEmpresa.buscar(operador.empresaId);
    return guardados ?? DatosFiscalesDeEmpresa.porOmision();
  }

  private async datosDelProveedor(solicitud: SolicitudDeDocumento, empresa: DatosFiscalesDeEmpresa) {
    return resolverDatosFiscalesDelProveedor({
      tipo: solicitud.tipo,
      enElLibro: solicitud.motivoFueraDelLibro === null,
      empresa,
      guardados: await this.dependencias.datosFiscalesDeProveedor.buscar(solicitud.proveedorId),
      pedidos: solicitud.datosFiscalesDelProveedor,
    });
  }

  private async nitDeLaEmpresa(operador: Operador): Promise<string> {
    const nit = await this.dependencias.empresa.nit(operador);
    if (!nit?.trim()) throw new EmpresaSinNit();
    return normalizarNit(nit);
  }

  private async proveedor(proveedorId: string): Promise<ProveedorParaDocumento> {
    const proveedor = await this.dependencias.proveedores.buscar(proveedorId);
    if (!proveedor) throw new RecursoNoEncontrado('El proveedor');
    if (!proveedor.activo) throw new ProveedorInactivo();
    return proveedor;
  }
}
