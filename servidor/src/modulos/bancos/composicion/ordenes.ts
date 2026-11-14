import type { FastifyPluginAsync } from 'fastify';
import '../../core/contratos/bancos.contratos.js';
import { mediador } from '../../core/mediador/contexto.js';
import { AnularCheque } from '../aplicacion/casos-uso/cheques/anular-cheque.js';
import { EmitirCheque } from '../aplicacion/casos-uso/cheques/emitir-cheque.js';
import { AnularMovimiento } from '../aplicacion/casos-uso/movimientos/anular-movimiento.js';
import { CrearMovimiento } from '../aplicacion/casos-uso/movimientos/crear-movimiento.js';
import { AnularMovimientoDeOrigen } from '../aplicacion/casos-uso/ordenes/anular-movimiento-de-origen.js';
import { EmitirChequeDeOrigen } from '../aplicacion/casos-uso/ordenes/emitir-cheque-de-origen.js';
import { FijarDesgloseDeConceptos } from '../aplicacion/casos-uso/ordenes/fijar-desglose-de-conceptos.js';
import { MediosDePagoDeBancos } from '../aplicacion/casos-uso/ordenes/medios-de-pago.js';
import { RegistrarNotaDeOrigen } from '../aplicacion/casos-uso/ordenes/registrar-nota-de-origen.js';
import { ConsultasChequerasDrizzle } from '../infraestructura/persistencia/consultas-chequeras.drizzle.js';
import { ConsultasChequesDrizzle } from '../infraestructura/persistencia/consultas-cheques.drizzle.js';
import { ConsultasCuentasBancariasDrizzle } from '../infraestructura/persistencia/consultas-cuentas-bancarias.drizzle.js';
import { dependenciasDeCheques } from './cheques.js';
import { dependenciasDeNotas } from './notas.js';

const MODULO = 'bancos';

/**
 * Atiende por el mediador las órdenes de Bancos (`core/contratos/bancos.contratos.ts`): cada una corre el mismo caso de
 * uso que la pantalla, con el origen y los conceptos ya resueltos. Bancos no pide permiso propio: el permiso lo exige la
 * ruta del módulo que origina la orden.
 */
function atenderOrdenes(): void {
  const deCheques = dependenciasDeCheques();
  const deNotas = dependenciasDeNotas();
  const { mediosDePago, emitirCheque } = casosDeCheques(deCheques);
  const { registrarNota, anular, fijarDesglose } = casosDeMovimientos(deCheques, deNotas);

  mediador.atender(MODULO, 'bancos.medios_de_pago', (datos, operador) => mediosDePago.ejecutar(operador, datos));
  mediador.atender(MODULO, 'bancos.emitir_cheque_de_origen', (datos, operador) =>
    emitirCheque.ejecutar(operador, datos),
  );
  mediador.atender(MODULO, 'bancos.registrar_nota_de_origen', (datos, operador) =>
    registrarNota.ejecutar(operador, datos),
  );
  mediador.atender(MODULO, 'bancos.anular_movimiento_de_origen', (datos, operador) => anular.ejecutar(operador, datos));
  mediador.atender(MODULO, 'bancos.fijar_desglose_de_conceptos', (datos, operador) =>
    fijarDesglose.ejecutar(operador, datos),
  );
}

function casosDeCheques(deCheques: ReturnType<typeof dependenciasDeCheques>) {
  const { unidadDeTrabajo, consultasMovimientos } = deCheques;
  const cheques = new ConsultasChequesDrizzle();
  return {
    mediosDePago: new MediosDePagoDeBancos({
      unidadDeTrabajo,
      movimientos: consultasMovimientos,
      cuentas: new ConsultasCuentasBancariasDrizzle(),
      chequeras: new ConsultasChequerasDrizzle(),
      cheques,
    }),
    emitirCheque: new EmitirChequeDeOrigen({
      unidadDeTrabajo,
      consultas: cheques,
      emitir: new EmitirCheque(deCheques),
    }),
  };
}

function casosDeMovimientos(
  deCheques: ReturnType<typeof dependenciasDeCheques>,
  deNotas: ReturnType<typeof dependenciasDeNotas>,
) {
  const { unidadDeTrabajo, consultas, repositorio, desglose } = deNotas;
  return {
    registrarNota: new RegistrarNotaDeOrigen(new CrearMovimiento(deNotas)),
    anular: new AnularMovimientoDeOrigen({
      unidadDeTrabajo,
      consultas,
      repositorio,
      anularCheque: new AnularCheque(deCheques),
      anularMovimiento: new AnularMovimiento(deNotas),
    }),
    fijarDesglose: new FijarDesgloseDeConceptos({ unidadDeTrabajo, consultas, repositorio, desglose }),
  };
}

/** Sin rutas HTTP: las órdenes de Bancos solo llegan por el mediador, nunca por la API. */
export function ordenesDeBancos(): FastifyPluginAsync {
  atenderOrdenes();
  return async () => {};
}
