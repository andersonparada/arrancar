import type { FastifyPluginAsync } from 'fastify';
import '../../core/contratos/empresas.contratos.js';
import { mediador } from '../../core/mediador/contexto.js';
import { RevisarCierreDeCargaEnElLibro } from '../aplicacion/casos-uso/fecha-de-inicio/revisar-cierre-de-carga-en-el-libro.js';

/**
 * Raíz de composición de la revisión del cierre de la carga inicial: registra en el mediador que este módulo responde
 * la pregunta de Empresas (sin rutas propias).
 */
export function respuestasDeCierreDeCargaComponidas(): FastifyPluginAsync {
  const revisar = new RevisarCierreDeCargaEnElLibro();
  mediador.responder('libro-de-compras', 'empresas.revisar_cierre_de_carga', async (datos) => revisar.ejecutar(datos));
  return async () => {};
}
