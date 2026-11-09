import type { FastifyPluginAsync } from 'fastify';
import '../../core/contratos/empresas.contratos.js';
import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { mediador } from '../../core/mediador/contexto.js';
import { ValidarFechaDeInicio } from '../aplicacion/casos-uso/fecha-de-inicio/validar-fecha-de-inicio.js';
import { SaldosInicialesPorFechaDrizzle } from '../infraestructura/persistencia/saldos-iniciales-por-fecha.drizzle.js';

/**
 * Raíz de composición del cambio de la fecha de inicio: registra en el mediador que este módulo escucha el aviso de
 * Empresas (sin rutas propias).
 */
export function escuchasDeFechaDeInicioComponidas(): FastifyPluginAsync {
  const { unidadDeTrabajo } = dependenciasCompartidas();
  const validar = new ValidarFechaDeInicio({ unidadDeTrabajo, saldosIniciales: new SaldosInicialesPorFechaDrizzle() });
  mediador.escuchar('cuentas-por-pagar', 'empresas.fecha_de_inicio_por_cambiar', (aviso, operador) =>
    validar.ejecutar(operador, aviso),
  );
  return async () => {};
}
