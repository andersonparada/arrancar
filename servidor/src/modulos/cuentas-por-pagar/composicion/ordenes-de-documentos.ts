import '../../core/contratos/cuentas-por-pagar.contratos.js';
import { mediador } from '../../core/mediador/contexto.js';
import '../../core/contratos/libro-de-compras.contratos.js';
import type { AnularPorAviso } from '../aplicacion/casos-uso/bajas/anular-por-aviso.js';
import type { EliminarPorAviso } from '../aplicacion/casos-uso/bajas/eliminar-por-aviso.js';
import type { RecibirDocumento } from '../aplicacion/casos-uso/recibir-documento.js';

interface CasosDeUsoDeLasOrdenes {
  recibir: RecibirDocumento;
  anularPorAviso: AnularPorAviso;
  eliminarPorAviso: EliminarPorAviso;
}

/**
 * Atiende las órdenes y los avisos que llegan de otros módulos (siempre dentro de la transacción de quien los manda,
 * sin permisos propios: el permiso lo exigió la ruta de origen). Hoy, de Libro de compras: la orden `recibir_documento` y
 * los avisos de que un documento se va a anular o a eliminar.
 */
export function atenderOrdenesDeDocumentos({
  recibir,
  anularPorAviso,
  eliminarPorAviso,
}: CasosDeUsoDeLasOrdenes): void {
  const modulo = 'cuentas-por-pagar';
  mediador.atender(modulo, 'cuentas-por-pagar.recibir_documento', (documento, operador) =>
    recibir.ejecutar(operador, documento),
  );
  mediador.escuchar(modulo, 'libro-de-compras.documento_por_anular', (aviso, operador) =>
    anularPorAviso.ejecutar(operador, aviso),
  );
  mediador.escuchar(modulo, 'libro-de-compras.documento_por_eliminar', (aviso, operador) =>
    eliminarPorAviso.ejecutar(operador, aviso),
  );
}
