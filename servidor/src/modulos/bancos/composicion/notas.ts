import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { ActualizarMovimiento } from '../aplicacion/casos-uso/movimientos/actualizar-movimiento.js';
import { AnularMovimiento } from '../aplicacion/casos-uso/movimientos/anular-movimiento.js';
import { CrearMovimiento } from '../aplicacion/casos-uso/movimientos/crear-movimiento.js';
import { EliminarMovimiento } from '../aplicacion/casos-uso/movimientos/eliminar-movimiento.js';
import { ListarMovimientos } from '../aplicacion/casos-uso/movimientos/listar-movimientos.js';
import { ObtenerMovimiento } from '../aplicacion/casos-uso/movimientos/obtener-movimiento.js';
import { ReglasDeLaCuenta } from '../aplicacion/reglas-de-la-cuenta.js';
import { NotasControlador } from '../http/notas.controlador.js';
import { rutasNotas } from '../http/notas.rutas.js';
import { ConsultasMovimientosDrizzle } from '../infraestructura/persistencia/consultas-movimientos.drizzle.js';
import { RepositorioMovimientosDrizzle } from '../infraestructura/persistencia/repositorio-movimientos.drizzle.js';
import { PoliticaDeMismaFechaEnAnulacionEnConfiguracion } from '../infraestructura/politica-de-misma-fecha-en-anulacion.configuracion.js';
import { PoliticaDeSobregiroEnConfiguracion } from '../infraestructura/politica-de-sobregiro.configuracion.js';

function dependenciasDeNotas() {
  const { unidadDeTrabajo, auditoria } = dependenciasCompartidas();
  const consultas = new ConsultasMovimientosDrizzle();
  const politicaDeSobregiro = new PoliticaDeSobregiroEnConfiguracion();
  return {
    unidadDeTrabajo,
    auditoria,
    consultas,
    repositorio: new RepositorioMovimientosDrizzle(),
    reglas: new ReglasDeLaCuenta({ consultas, politicaDeSobregiro }),
    politicaDeMismaFecha: new PoliticaDeMismaFechaEnAnulacionEnConfiguracion(),
  };
}

/** Raíz de composición de las notas: comparten dominio con Movimientos, pero solo notas (no el saldo inicial). */
export function rutasDeNotas() {
  const dependencias = dependenciasDeNotas();
  const casos = {
    listar: new ListarMovimientos(dependencias),
    obtener: new ObtenerMovimiento(dependencias),
    crear: new CrearMovimiento(dependencias),
    actualizar: new ActualizarMovimiento(dependencias),
    anular: new AnularMovimiento(dependencias),
    eliminar: new EliminarMovimiento(dependencias),
  };
  return rutasNotas(new NotasControlador(casos));
}
