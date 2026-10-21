import '../../core/contratos/cuentas-por-pagar.contratos.js';
import { mediador } from '../../core/mediador/contexto.js';
import type { RecibirDocumento } from '../aplicacion/casos-uso/recibir-documento.js';

interface CasosDeUsoDeLasOrdenes {
  recibir: RecibirDocumento;
}

/**
 * Atiende las órdenes y los avisos que llegan de otros módulos (siempre dentro de la transacción de quien los manda,
 * sin permisos propios: el permiso lo exigió la ruta de origen). Por ahora, `recibir_documento` de Libro de compras.
 */
export function atenderOrdenesDeDocumentos({ recibir }: CasosDeUsoDeLasOrdenes): void {
  mediador.atender('cuentas-por-pagar', 'cuentas-por-pagar.recibir_documento', (documento, operador) =>
    recibir.ejecutar(operador, documento),
  );
}
