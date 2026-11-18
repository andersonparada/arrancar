import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { ConceptosDeMovimientos } from '../aplicacion/conceptos-de-movimientos.js';
import { ActualizarMovimiento } from '../aplicacion/casos-uso/movimientos/actualizar-movimiento.js';
import { CrearMovimiento } from '../aplicacion/casos-uso/movimientos/crear-movimiento.js';
import { EliminarSaldoGlobal } from '../aplicacion/casos-uso/movimientos/eliminar-saldo-global.js';
import { ListarMovimientos } from '../aplicacion/casos-uso/movimientos/listar-movimientos.js';
import { ReglasDeLaCuenta } from '../aplicacion/reglas-de-la-cuenta.js';
import type { CasosDeUsoDeSaldosGlobales } from '../http/saldos-globales.controlador.js';
import { ConsultasConciliacionesDrizzle } from '../infraestructura/persistencia/consultas-conciliaciones.drizzle.js';
import { ConsultasMovimientosDrizzle } from '../infraestructura/persistencia/consultas-movimientos.drizzle.js';
import { RepositorioConceptosDrizzle } from '../infraestructura/persistencia/repositorio-conceptos.drizzle.js';
import { RepositorioDeMovimientosConSaldoGlobal } from '../infraestructura/persistencia/repositorio-de-saldos-globales.drizzle.js';
import { PoliticaDeSobregiroEnConfiguracion } from '../infraestructura/politica-de-sobregiro.configuracion.js';
import { piezasDeOrigen } from './piezas-de-origen.js';

function dependenciasDeSaldosGlobales() {
  const { unidadDeTrabajo, auditoria, correlativos } = dependenciasCompartidas();
  const consultas = new ConsultasMovimientosDrizzle();
  const conceptos = new ConceptosDeMovimientos(new RepositorioConceptosDrizzle());
  return {
    unidadDeTrabajo,
    auditoria,
    correlativos,
    conceptos,
    ...piezasDeOrigen(conceptos),
    consultas,
    repositorio: new RepositorioDeMovimientosConSaldoGlobal(),
    reglas: new ReglasDeLaCuenta({ consultas, politicaDeSobregiro: new PoliticaDeSobregiroEnConfiguracion() }),
  };
}

/**
 * HEREDADO (hasta BS-5): los casos de uso con los que el cliente actual registra, corrige y elimina el saldo inicial
 * «de antes» de una cuenta (`saldo_global`). Se borra junto con las rutas `saldos-globales.*` cuando el cliente use la
 * pantalla nueva.
 */
export function saldosGlobalesHeredados(): CasosDeUsoDeSaldosGlobales {
  const dependencias = dependenciasDeSaldosGlobales();
  return {
    listar: new ListarMovimientos(dependencias),
    crear: new CrearMovimiento(dependencias),
    actualizar: new ActualizarMovimiento(dependencias),
    eliminar: new EliminarSaldoGlobal({
      ...dependencias,
      consultasConciliaciones: new ConsultasConciliacionesDrizzle(),
    }),
  };
}
