import type { FastifyPluginAsync } from 'fastify';
import '../../core/contratos/libro-de-compras.contratos.js';
import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { mediador } from '../../core/mediador/contexto.js';
import { EvaluarBancarizacion } from '../aplicacion/casos-uso/bancarizacion/evaluar-bancarizacion.js';
import {
  BloqueoDeBancarizacionDrizzle,
  PagadoAlProveedorEnMediador,
  UmbralDeBancarizacionEnConfiguracion,
} from '../infraestructura/bancarizacion-compartida.js';
import { EfectosFiscalesDeDocumentosDrizzle } from '../infraestructura/persistencia/efectos-fiscales-de-documentos.drizzle.js';

/**
 * Raíz de composición de la bancarización compartida: atiende la orden `libro-de-compras.evaluar_bancarizacion`, que los
 * módulos que pagan en efectivo llaman antes de pagar (sin rutas propias).
 */
export function ordenDeBancarizacionComponida(): FastifyPluginAsync {
  const evaluar = new EvaluarBancarizacion({
    unidadDeTrabajo: dependenciasCompartidas().unidadDeTrabajo,
    bloqueo: new BloqueoDeBancarizacionDrizzle(),
    umbral: new UmbralDeBancarizacionEnConfiguracion(),
    pagado: new PagadoAlProveedorEnMediador(),
    efectos: new EfectosFiscalesDeDocumentosDrizzle(),
  });
  mediador.atender('libro-de-compras', 'libro-de-compras.evaluar_bancarizacion', (datos, operador) =>
    evaluar.ejecutar(operador, datos),
  );
  return async () => {};
}
