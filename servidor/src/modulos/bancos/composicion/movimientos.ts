import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { opcionesDe } from '../../core/intercambio/aplicacion/columnas.js';
import { crearIntercambio } from '../../core/intercambio/contexto.js';
import { validadorDeZod } from '../../core/intercambio/http/rutas-de-intercambio.js';
import { ActualizarMovimiento } from '../aplicacion/casos-uso/movimientos/actualizar-movimiento.js';
import { AnularMovimiento } from '../aplicacion/casos-uso/movimientos/anular-movimiento.js';
import { CrearMovimiento } from '../aplicacion/casos-uso/movimientos/crear-movimiento.js';
import { ListarMovimientos } from '../aplicacion/casos-uso/movimientos/listar-movimientos.js';
import { ObtenerMovimiento } from '../aplicacion/casos-uso/movimientos/obtener-movimiento.js';
import type { MovimientoDto, SolicitudDeMovimiento } from '../aplicacion/dto/movimiento.dto.js';
import { ReglasDeLaCuenta } from '../aplicacion/reglas-de-la-cuenta.js';
import { columnasDeMovimientos } from '../http/movimientos.columnas.js';
import { MovimientosControlador } from '../http/movimientos.controlador.js';
import { esquemaMovimiento } from '../http/movimientos.esquemas-http.js';
import { rutasMovimientos } from '../http/movimientos.rutas.js';
import { ConsultasCuentasBancariasDrizzle } from '../infraestructura/persistencia/consultas-cuentas-bancarias.drizzle.js';
import { ConsultasMovimientosDrizzle } from '../infraestructura/persistencia/consultas-movimientos.drizzle.js';
import { RepositorioMovimientosDrizzle } from '../infraestructura/persistencia/repositorio-movimientos.drizzle.js';
import { PoliticaDeSobregiroEnConfiguracion } from '../infraestructura/politica-de-sobregiro.configuracion.js';

function dependenciasDeMovimientos() {
  const { unidadDeTrabajo, auditoria } = dependenciasCompartidas();
  const consultas = new ConsultasMovimientosDrizzle();
  const politicaDeSobregiro = new PoliticaDeSobregiroEnConfiguracion();
  return {
    unidadDeTrabajo,
    auditoria,
    consultas,
    repositorio: new RepositorioMovimientosDrizzle(),
    reglas: new ReglasDeLaCuenta({ consultas, politicaDeSobregiro }),
  };
}

type Dependencias = ReturnType<typeof dependenciasDeMovimientos>;

const casosDeUso = (dependencias: Dependencias) => ({
  listar: new ListarMovimientos(dependencias),
  obtener: new ObtenerMovimiento(dependencias),
  crear: new CrearMovimiento(dependencias),
  actualizar: new ActualizarMovimiento(dependencias),
  anular: new AnularMovimiento(dependencias),
});

/** Exportar e importar en Excel (así se cargan los saldos iniciales); cada fila pasa por las mismas reglas que la ventana. */
function intercambioDeMovimientos(casos: ReturnType<typeof casosDeUso>) {
  return crearIntercambio<MovimientoDto, SolicitudDeMovimiento>({
    nombre: 'Movimientos',
    columnas: columnasDeMovimientos({ cuentaBancariaId: opcionesDe(new ConsultasCuentasBancariasDrizzle(), 'nombre') }),
    validar: validadorDeZod(esquemaMovimiento),
    listar: (operador) => casos.listar.ejecutar(operador),
    crear: (operador, solicitud) => casos.crear.ejecutar(operador, solicitud),
  });
}

/** Raíz de composición de los movimientos: el único lugar donde se eligen las implementaciones concretas. */
export function rutasDeMovimientos() {
  const casos = casosDeUso(dependenciasDeMovimientos());
  return rutasMovimientos(new MovimientosControlador(casos), intercambioDeMovimientos(casos));
}
