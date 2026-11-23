import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { crearIntercambio } from '../../core/intercambio/contexto.js';
import { validadorDeZod } from '../../core/intercambio/http/rutas-de-intercambio.js';
import type { CuentaDto, SolicitudDeCuenta } from '../aplicacion/dto/cuenta.dto.js';
import { columnasDeCuentas } from '../http/cuentas.columnas.js';
import { esquemaCuenta } from '../http/cuentas.esquemas-http.js';
import { ActualizarCuenta } from '../aplicacion/casos-uso/cuentas/actualizar-cuenta.js';
import { CrearCuenta } from '../aplicacion/casos-uso/cuentas/crear-cuenta.js';
import { EliminarCuenta } from '../aplicacion/casos-uso/cuentas/eliminar-cuenta.js';
import { ListarCuentas } from '../aplicacion/casos-uso/cuentas/listar-cuentas.js';
import { ObtenerCuenta } from '../aplicacion/casos-uso/cuentas/obtener-cuenta.js';
import { CuentasControlador } from '../http/cuentas.controlador.js';
import { rutasCuentas } from '../http/cuentas.rutas.js';
import { ConsultasCuentasDrizzle } from '../infraestructura/persistencia/consultas-cuentas.drizzle.js';
import { RepositorioCuentasDrizzle } from '../infraestructura/persistencia/repositorio-cuentas.drizzle.js';
import { RepositorioIniciosDrizzle } from '../infraestructura/persistencia/repositorio-inicios.drizzle.js';

const dependenciasDeCuentas = () => ({
  unidadDeTrabajo: dependenciasCompartidas().unidadDeTrabajo,
  auditoria: dependenciasCompartidas().auditoria,
  repositorio: new RepositorioCuentasDrizzle(),
  consultas: new ConsultasCuentasDrizzle(),
  inicios: new RepositorioIniciosDrizzle(),
});

type Dependencias = ReturnType<typeof dependenciasDeCuentas>;

const casosDeUso = (dependencias: Dependencias) => ({
  listar: new ListarCuentas(dependencias),
  obtener: new ObtenerCuenta(dependencias),
  crear: new CrearCuenta(dependencias),
  actualizar: new ActualizarCuenta(dependencias),
  eliminar: new EliminarCuenta(dependencias),
});

/** Exportar e importar en Excel; cada fila importada pasa por las mismas reglas que el formulario. */
function intercambioDeCuentas(casos: ReturnType<typeof casosDeUso>) {
  return crearIntercambio<CuentaDto, SolicitudDeCuenta>({
    nombre: 'Cuentas',
    columnas: columnasDeCuentas,
    validar: validadorDeZod(esquemaCuenta),
    listar: (operador) => casos.listar.ejecutar(operador),
    crear: (operador, solicitud) => casos.crear.ejecutar(operador, solicitud),
  });
}

/** Raíz de composición de las cuentas: el único lugar donde se eligen las implementaciones concretas. */
export function rutasDeCuentas() {
  const casos = casosDeUso(dependenciasDeCuentas());
  return rutasCuentas(new CuentasControlador(casos), intercambioDeCuentas(casos));
}
