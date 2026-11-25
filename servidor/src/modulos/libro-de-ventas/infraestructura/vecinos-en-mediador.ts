import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import '../../core/contratos/cuentas-por-cobrar.contratos.js';
import '../../core/contratos/empresas.contratos.js';
import type {
  DestinoDeDocumentoDeVenta,
  DocumentoDeVentaParaDestino,
} from '../../core/contratos/libro-de-ventas.contratos.js';
import { mediador } from '../../core/mediador/contexto.js';
import type { ModulosActivosDeLaCuenta } from '../../core/mediador/aplicacion/puertos/modulos-activos-de-la-cuenta.js';
import type { DatosDeLaEmpresaParaVentas, DestinosDeVenta } from '../aplicacion/puertos/puertos-de-documentos.js';
import { DESTINOS_DE_DOCUMENTO } from '../dominio/destino-del-documento.js';

/** El NIT de la empresa activa y su fecha de inicio los da Empresas (órdenes `obtener_datos_de_empresa` y `obtener_carga_inicial`). */
export class DatosDeLaEmpresaEnMediador implements DatosDeLaEmpresaParaVentas {
  async nit(operador: Operador): Promise<string | null> {
    const datos = await mediador.enviar(operador, 'empresas.obtener_datos_de_empresa', {
      empresaId: operador.empresaId,
    });
    return datos.nit;
  }

  async fechaDeInicio(operador: Operador): Promise<string | null> {
    const carga = await mediador.enviar(operador, 'empresas.obtener_carga_inicial', { empresaId: operador.empresaId });
    return carga.fechaDeInicio;
  }
}

/**
 * El destino es un módulo que depende de este: su clave se lee de los módulos activos de la cuenta y la orden
 * `<destino>.recibir_documento` va por el mediador, dentro de la transacción en curso.
 */
export class DestinosDeVentaEnMediador implements DestinosDeVenta {
  constructor(private readonly modulosActivos: ModulosActivosDeLaCuenta) {}

  async activos({ cuentaId }: Operador): Promise<DestinoDeDocumentoDeVenta[]> {
    const activos = await this.modulosActivos.activosPara(cuentaId);
    return DESTINOS_DE_DOCUMENTO.filter((destino) => activos.has(destino));
  }

  async recibir(
    operador: Operador,
    destino: DestinoDeDocumentoDeVenta,
    documento: DocumentoDeVentaParaDestino,
  ): Promise<string[]> {
    const { avisos } = await mediador.enviar(operador, `${destino}.recibir_documento`, documento);
    return avisos;
  }

  avisarPorAnular(
    operador: Operador,
    aviso: { documentoId: string; destino: DestinoDeDocumentoDeVenta; motivo: string },
  ): Promise<void> {
    return mediador.avisar(operador, 'libro-de-ventas.documento_por_anular', aviso);
  }

  avisarPorEliminar(
    operador: Operador,
    aviso: { documentoId: string; destino: DestinoDeDocumentoDeVenta },
  ): Promise<void> {
    return mediador.avisar(operador, 'libro-de-ventas.documento_por_eliminar', aviso);
  }
}
