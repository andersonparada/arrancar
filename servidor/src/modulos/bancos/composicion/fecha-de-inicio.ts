import type { FastifyPluginAsync } from 'fastify';
import '../../core/contratos/empresas.contratos.js';
import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { mediador } from '../../core/mediador/contexto.js';
import { ValidarFechaDeInicioEnBancos } from '../aplicacion/casos-uso/saldos-iniciales/validar-fecha-de-inicio-en-bancos.js';
import { ConsultasDeSaldosInicialesDrizzle } from '../infraestructura/persistencia/consultas-de-saldos-iniciales.drizzle.js';

/**
 * Raíz de composición del cambio de la fecha de inicio: registra en el mediador que Bancos escucha el aviso de
 * Empresas (sin rutas propias).
 */
export function escuchasDeFechaDeInicioDeBancos(): FastifyPluginAsync {
  const { unidadDeTrabajo } = dependenciasCompartidas();
  const validar = new ValidarFechaDeInicioEnBancos({
    unidadDeTrabajo,
    consultas: new ConsultasDeSaldosInicialesDrizzle(),
  });
  mediador.escuchar('bancos', 'empresas.fecha_de_inicio_por_cambiar', (aviso, operador) =>
    validar.ejecutar(operador, aviso),
  );
  return async () => {};
}
