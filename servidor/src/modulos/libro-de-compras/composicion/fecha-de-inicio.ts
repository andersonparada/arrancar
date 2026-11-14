import type { FastifyPluginAsync } from 'fastify';
import '../../core/contratos/empresas.contratos.js';
import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { mediador } from '../../core/mediador/contexto.js';
import { ValidarFechaDeInicio } from '../aplicacion/casos-uso/fecha-de-inicio/validar-fecha-de-inicio.js';
import { NotasPorFechaDeInicioDrizzle } from '../infraestructura/persistencia/notas-por-fecha-de-inicio.drizzle.js';

/**
 * Raíz de composición del cambio de la fecha de inicio: registra en el mediador que este módulo escucha el aviso de
 * Empresas (sin rutas propias).
 */
export function escuchasDeFechaDeInicioComponidas(): FastifyPluginAsync {
  const { unidadDeTrabajo } = dependenciasCompartidas();
  const validar = new ValidarFechaDeInicio({ unidadDeTrabajo, notas: new NotasPorFechaDeInicioDrizzle() });
  mediador.escuchar('libro-de-compras', 'empresas.fecha_de_inicio_por_cambiar', (aviso, operador) =>
    validar.ejecutar(operador, aviso),
  );
  return async () => {};
}
