import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { normalizarNit } from '../../../../core/compartido/dominio/objetos-valor/nit.js';
import type { ContextoDelArmado, FacturaAfectada } from '../../../dominio/armado-del-documento.js';
import { EmpresaSinDatosFiscales, EmpresaSinNit } from '../../../dominio/errores-de-documento.js';
import { primerDiaDelMes } from '../../../dominio/fechas-del-libro.js';
import type { RegimenDelMes } from '../../../dominio/regimen-de-la-empresa.js';
import type { SolicitudDeDocumentoDeVenta } from '../../dto/solicitud-de-documento.js';
import { ClienteInactivo } from '../../errores.js';
import type {
  CatalogosParaDocumentos,
  DatosDeLaEmpresaParaVentas,
  DestinosDeVenta,
  HistorialFiscalParaVentas,
  LectorDeConfiguracionDeVentas,
  RepositorioDeDocumentosDeVenta,
} from '../../puertos/puertos-de-documentos.js';

export interface DependenciasDelCargador {
  empresa: DatosDeLaEmpresaParaVentas;
  historial: HistorialFiscalParaVentas;
  configuracion: LectorDeConfiguracionDeVentas;
  catalogos: CatalogosParaDocumentos;
  repositorio: Pick<RepositorioDeDocumentosDeVenta, 'facturaConNotas'>;
  destinos: DestinosDeVenta;
}

/**
 * Reúne todo lo que el armado del documento necesita saber: el régimen de la empresa **en el mes del documento**
 * (no el de hoy), su NIT y fecha de inicio, la configuración, el cliente, la factura que corrige una nota y los
 * destinos activos. Al registrar bloquea el historial fiscal con `for share`: quien lo cambia espera a que termine el
 * registro, o el registro espera al cambio, y la foto del régimen nunca queda a medias.
 */
export class CargadorDeContexto {
  constructor(private readonly dependencias: DependenciasDelCargador) {}

  /**
   * @throws EmpresaSinNit, EmpresaSinDatosFiscales, RecursoNoEncontrado (cliente, factura o localidad que no existen)
   *   o ClienteInactivo.
   */
  async cargar(operador: Operador, solicitud: SolicitudDeDocumentoDeVenta): Promise<ContextoDelArmado> {
    const { empresa, configuracion, destinos } = this.dependencias;
    const periodo = primerDiaDelMes(solicitud.fechaEmision);
    const regimen = await this.regimenDelMes(operador, periodo);
    const nit = await empresa.nit(operador);
    if (!nit?.trim() || !normalizarNit(nit)) throw new EmpresaSinNit();
    const { tasaDeIva, fechaDeDerogacion, consumidorFinal } = await configuracion.paraEmpresa(operador);
    await this.exigirLocalidad(solicitud.localidadId);
    return {
      empresaId: operador.empresaId,
      fechaDeInicio: await empresa.fechaDeInicio(operador),
      regimen,
      regimenDeLaFacturaAnterior: await this.regimenDeLaFacturaAnterior(operador, solicitud),
      tasaDeIva,
      fechaDeDerogacion,
      consumidorFinal,
      cliente: await this.cliente(solicitud.clienteId),
      facturaAfectada: await this.facturaAfectada(solicitud.documentoAfectadoId),
      destinosActivos: await destinos.activos(operador),
    };
  }

  private async regimenDelMes(operador: Operador, periodo: string): Promise<RegimenDelMes> {
    const regimen = await this.dependencias.historial.regimenEn(operador.empresaId, periodo, true);
    if (!regimen) throw new EmpresaSinDatosFiscales();
    return regimen;
  }

  /** El régimen en el mes de la factura del sistema anterior, si la nota cita una y hay historial de ese mes. */
  private async regimenDeLaFacturaAnterior(
    operador: Operador,
    solicitud: SolicitudDeDocumentoDeVenta,
  ): Promise<RegimenDelMes | null> {
    if (!solicitud.facturaAnterior) return null;
    const periodo = primerDiaDelMes(solicitud.facturaAnterior.fecha);
    return this.dependencias.historial.regimenEn(operador.empresaId, periodo, false);
  }

  private async exigirLocalidad(localidadId: string | null): Promise<void> {
    if (localidadId === null) return;
    if (!(await this.dependencias.catalogos.localidadExiste(localidadId)))
      throw new RecursoNoEncontrado('La localidad');
  }

  private async cliente(clienteId: string | null): Promise<ContextoDelArmado['cliente']> {
    if (clienteId === null) return null;
    const cliente = await this.dependencias.catalogos.cliente(clienteId);
    if (!cliente) throw new RecursoNoEncontrado('El cliente');
    if (!cliente.activo) throw new ClienteInactivo();
    return cliente;
  }

  /** La factura de una nota, con su fila bloqueada: dos notas a la vez no pasan del total. */
  private async facturaAfectada(documentoAfectadoId: string | null): Promise<FacturaAfectada | null> {
    if (documentoAfectadoId === null) return null;
    const factura = await this.dependencias.repositorio.facturaConNotas(documentoAfectadoId, true);
    if (!factura) throw new RecursoNoEncontrado('La factura que corrige la nota');
    return factura;
  }
}
