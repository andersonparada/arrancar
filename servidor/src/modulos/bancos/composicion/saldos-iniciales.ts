import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { opcionesDe } from '../../core/intercambio/aplicacion/columnas.js';
import { crearIntercambio } from '../../core/intercambio/contexto.js';
import { validadorDeZod } from '../../core/intercambio/http/rutas-de-intercambio.js';
import { ActualizarMovimiento } from '../aplicacion/casos-uso/movimientos/actualizar-movimiento.js';
import { CrearMovimiento } from '../aplicacion/casos-uso/movimientos/crear-movimiento.js';
import { EliminarSaldoInicial } from '../aplicacion/casos-uso/movimientos/eliminar-saldo-inicial.js';
import { ListarMovimientos } from '../aplicacion/casos-uso/movimientos/listar-movimientos.js';
import type { MovimientoDto } from '../aplicacion/dto/movimiento.dto.js';
import { ReglasDeLaCuenta } from '../aplicacion/reglas-de-la-cuenta.js';
import { columnasDeSaldosIniciales } from '../http/saldos-iniciales.columnas.js';
import { SaldosInicialesControlador } from '../http/saldos-iniciales.controlador.js';
import { esquemaSaldoInicial, type SaldoInicialSolicitado } from '../http/saldos-iniciales.esquemas-http.js';
import { rutasSaldosIniciales } from '../http/saldos-iniciales.rutas.js';
import { ConsultasConciliacionesDrizzle } from '../infraestructura/persistencia/consultas-conciliaciones.drizzle.js';
import { ConsultasCuentasBancariasDrizzle } from '../infraestructura/persistencia/consultas-cuentas-bancarias.drizzle.js';
import { ConsultasMovimientosDrizzle } from '../infraestructura/persistencia/consultas-movimientos.drizzle.js';
import { RepositorioMovimientosDrizzle } from '../infraestructura/persistencia/repositorio-movimientos.drizzle.js';
import { PoliticaDeSobregiroEnConfiguracion } from '../infraestructura/politica-de-sobregiro.configuracion.js';

function dependenciasDeSaldosIniciales() {
  const { unidadDeTrabajo, auditoria } = dependenciasCompartidas();
  const consultas = new ConsultasMovimientosDrizzle();
  const politicaDeSobregiro = new PoliticaDeSobregiroEnConfiguracion();
  return {
    unidadDeTrabajo,
    auditoria,
    consultas,
    repositorio: new RepositorioMovimientosDrizzle(),
    reglas: new ReglasDeLaCuenta({ consultas, politicaDeSobregiro }),
    consultasConciliaciones: new ConsultasConciliacionesDrizzle(),
  };
}

type Dependencias = ReturnType<typeof dependenciasDeSaldosIniciales>;

const casosDeUso = (dependencias: Dependencias) => ({
  listar: new ListarMovimientos(dependencias),
  crear: new CrearMovimiento(dependencias),
  actualizar: new ActualizarMovimiento(dependencias),
  eliminar: new EliminarSaldoInicial(dependencias),
});

/** Exportar e importar en Excel los saldos iniciales vigentes; cada fila pasa por las mismas reglas que la ventana. */
function intercambioDeSaldosIniciales(casos: ReturnType<typeof casosDeUso>) {
  return crearIntercambio<MovimientoDto, SaldoInicialSolicitado>({
    nombre: 'Saldos iniciales',
    columnas: columnasDeSaldosIniciales({
      cuentaBancariaId: opcionesDe(new ConsultasCuentasBancariasDrizzle(), 'nombre'),
    }),
    validar: validadorDeZod(esquemaSaldoInicial),
    listar: (operador) => casos.listar.ejecutar(operador, { clase: 'saldosIniciales' }),
    crear: (operador, solicitud) =>
      casos.crear.ejecutar(operador, { ...solicitud, beneficiario: null, saldoInicial: true }),
  });
}

/** Raíz de composición de los saldos iniciales: comparten dominio con Movimientos, pero solo el saldo inicial. */
export function rutasDeSaldosIniciales() {
  const casos = casosDeUso(dependenciasDeSaldosIniciales());
  return rutasSaldosIniciales(new SaldosInicialesControlador(casos), intercambioDeSaldosIniciales(casos));
}
