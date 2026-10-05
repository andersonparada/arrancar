import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import '../../core/contratos/cuentas-por-pagar.contratos.js';
import type { DocumentoParaDestino } from '../../core/contratos/libro-de-compras.contratos.js';
import { mediador } from '../../core/mediador/contexto.js';
import type { ModulosActivosDeLaCuenta } from '../../core/mediador/aplicacion/puertos/modulos-activos-de-la-cuenta.js';
import type { AvisoDeBaja, DestinosDeDocumentos } from '../aplicacion/puertos/puertos-de-documentos.js';
import { DESTINOS_DE_DOCUMENTO, type DestinoDeDocumento } from '../dominio/destinos-de-documento.js';

/**
 * Los destinos son módulos que dependen de este: sus claves se leen de los módulos activos de la cuenta y la orden
 * `<destino>.recibir_documento` va por el mediador, dentro de la transacción en curso. Cada destino que se instale
 * declara su orden en `core/contratos/<destino>.contratos.ts`; todas llevan los mismos datos.
 */
export class DestinosDeDocumentosEnMediador implements DestinosDeDocumentos {
  constructor(private readonly modulosActivos: ModulosActivosDeLaCuenta) {}

  async activos({ cuentaId }: Operador): Promise<DestinoDeDocumento[]> {
    const activos = await this.modulosActivos.activosPara(cuentaId);
    return DESTINOS_DE_DOCUMENTO.filter((destino) => activos.has(destino));
  }

  recibir(operador: Operador, destino: DestinoDeDocumento, documento: DocumentoParaDestino): Promise<void> {
    // Solo `cuentas-por-pagar` está declarada hoy; las demás se agregan con su módulo y comparten estos datos.
    return mediador.enviar(
      operador,
      `${destino}.recibir_documento` as 'cuentas-por-pagar.recibir_documento',
      documento,
    );
  }

  avisarPorAnular(operador: Operador, aviso: AvisoDeBaja & { motivo: string }): Promise<void> {
    return mediador.avisar(operador, 'libro-de-compras.documento_por_anular', aviso);
  }

  avisarPorEliminar(operador: Operador, aviso: AvisoDeBaja): Promise<void> {
    return mediador.avisar(operador, 'libro-de-compras.documento_por_eliminar', aviso);
  }
}
