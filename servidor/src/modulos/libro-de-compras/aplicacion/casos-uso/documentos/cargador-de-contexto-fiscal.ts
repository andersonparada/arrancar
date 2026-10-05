import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { Reloj } from '../../../../core/compartido/aplicacion/reloj.js';
import { normalizarNit } from '../../../../core/compartido/dominio/objetos-valor/nit.js';
import { DatosFiscalesDeEmpresa } from '../../../dominio/datos-fiscales-de-empresa.js';
import { DatosFiscalesDeProveedor } from '../../../dominio/datos-fiscales-de-proveedor.js';
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
  datosDelProveedor: DatosFiscalesDeProveedor;
  /** No hay fila guardada: se usaron los valores por omisión. */
  proveedorSinDatosFiscales: boolean;
  configuracion: ConfiguracionFiscal;
}

export interface DependenciasDelCargador {
  reloj: Reloj;
  empresa: DatosDeLaEmpresaParaDocumentos;
  proveedores: ProveedoresParaDocumentos;
  datosFiscalesDeEmpresa: RepositorioDeDatosFiscalesDeEmpresa;
  datosFiscalesDeProveedor: RepositorioDeDatosFiscalesDeProveedor;
  configuracion: LectorDeConfiguracionFiscal;
}

/** Reúne el contexto fiscal de un documento; sin datos fiscales guardados usa los valores por omisión. */
export class CargadorDeContextoFiscal {
  constructor(private readonly dependencias: DependenciasDelCargador) {}

  /**
   * @throws EmpresaSinNit si la empresa no tiene NIT.
   * @throws RecursoNoEncontrado si el proveedor no es de la cuenta.
   * @throws ProveedorInactivo si el papel de proveedor (o el tercero) está inactivo.
   */
  async cargar(operador: Operador, solicitud: SolicitudDeDocumento): Promise<ContextoFiscal> {
    const hoy = await this.dependencias.reloj.hoy(operador);
    const fechaDeRecepcion = solicitud.fechaRecepcion ?? hoy;
    const proveedor = await this.proveedor(solicitud.proveedorId);
    const guardadosDeEmpresa = await this.dependencias.datosFiscalesDeEmpresa.buscar(operador.empresaId);
    const guardadosDelProveedor = await this.dependencias.datosFiscalesDeProveedor.buscar(proveedor.id);
    return {
      hoy,
      fechaDeRecepcion,
      periodo:
        solicitud.periodo ??
        periodoPropuesto({ tipo: solicitud.tipo, fechaDeEmision: solicitud.fechaEmision, fechaDeRecepcion }),
      nitDeLaEmpresa: await this.nitDeLaEmpresa(operador),
      proveedor,
      datosDeLaEmpresa: guardadosDeEmpresa ?? DatosFiscalesDeEmpresa.porOmision(),
      datosDelProveedor: guardadosDelProveedor ?? DatosFiscalesDeProveedor.porOmision(),
      proveedorSinDatosFiscales: guardadosDelProveedor === null,
      configuracion: await this.dependencias.configuracion.paraEmpresa(operador),
    };
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
