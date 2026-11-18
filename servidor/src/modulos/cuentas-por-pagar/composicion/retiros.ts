import type { FastifyPluginAsync } from 'fastify';
import '../../core/contratos/bancos.contratos.js';
import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { mediador } from '../../core/mediador/contexto.js';
import { AnularRetiro } from '../aplicacion/casos-uso/retiros/anular-retiro.js';
import { AtenderMovimientoDeRetiroPorCambiar } from '../aplicacion/casos-uso/retiros/atender-movimiento-de-retiro-por-cambiar.js';
import { ListarRetiros, ObtenerRetiro } from '../aplicacion/casos-uso/retiros/consultas-de-retiros.js';
import type { DependenciasDeRetiros } from '../aplicacion/casos-uso/retiros/dependencias-de-retiros.js';
import { LiquidarRetiro } from '../aplicacion/casos-uso/retiros/liquidar-retiro.js';
import { ReabrirRetiro } from '../aplicacion/casos-uso/retiros/reabrir-retiro.js';
import { RegistrarRetiroDeEfectivo } from '../aplicacion/casos-uso/retiros/registrar-retiro-de-efectivo.js';
import { RetirosControlador } from '../http/retiros.controlador.js';
import { rutasDeRetiros } from '../http/retiros.rutas.js';
import { PagosEnBancosEnMediador } from '../infraestructura/pagos-en-bancos-en-mediador.js';
import { ConsultasDeRetirosDrizzle } from '../infraestructura/persistencia/consultas-de-retiros.drizzle.js';
import { CustodiosDeRetirosDrizzle } from '../infraestructura/persistencia/custodios-de-retiros.drizzle.js';
import { MovimientosDePagosDrizzle } from '../infraestructura/persistencia/movimientos-de-pagos.drizzle.js';
import { DatosFiscalesDeLaEmpresaDrizzle } from '../infraestructura/persistencia/lecturas-del-libro.drizzle.js';
import { RepositorioDeRetirosDrizzle } from '../infraestructura/persistencia/repositorio-de-retiros.drizzle.js';
import { UmbralDeBancarizacionEnConfiguracion } from '../infraestructura/umbral-de-bancarizacion-en-configuracion.js';

/**
 * Raíz de composición de los retiros de efectivo para pagos. También atiende el aviso de Bancos antes de cambiar el
 * cheque o la nota de un retiro, o el depósito de su devolución.
 */
export function rutasDeRetirosComponidas(): FastifyPluginAsync {
  const dependencias = dependenciasDeRetiros();
  const atender = new AtenderMovimientoDeRetiroPorCambiar(dependencias);
  mediador.escuchar('cuentas-por-pagar', 'bancos.movimiento_por_cambiar', (aviso, operador) =>
    atender.ejecutar(operador, aviso),
  );
  return rutasDeRetiros(
    new RetirosControlador({
      registrar: new RegistrarRetiroDeEfectivo(dependencias),
      listar: new ListarRetiros(dependencias),
      obtener: new ObtenerRetiro(dependencias),
      liquidar: new LiquidarRetiro(dependencias),
      reabrir: new ReabrirRetiro(dependencias),
      anular: new AnularRetiro(dependencias),
    }),
  );
}

function dependenciasDeRetiros(): DependenciasDeRetiros {
  const { unidadDeTrabajo, reloj, correlativos, auditoria, publicadorEventos } = dependenciasCompartidas();
  const movimientos = new MovimientosDePagosDrizzle();
  return {
    unidadDeTrabajo,
    retiros: new RepositorioDeRetirosDrizzle(),
    consultas: new ConsultasDeRetirosDrizzle(),
    custodios: new CustodiosDeRetirosDrizzle(),
    bancos: new PagosEnBancosEnMediador(movimientos),
    movimientos,
    fiscal: new DatosFiscalesDeLaEmpresaDrizzle(),
    umbral: new UmbralDeBancarizacionEnConfiguracion(),
    correlativos,
    auditoria,
    publicadorEventos,
    reloj,
  };
}
