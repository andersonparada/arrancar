import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { crearIntercambio } from '../../core/intercambio/contexto.js';
import { validadorDeZod } from '../../core/intercambio/http/rutas-de-intercambio.js';
import type { CombustibleDto, SolicitudDeCombustible } from '../aplicacion/dto/combustible.dto.js';
import { columnasDeCombustibles } from '../http/combustibles.columnas.js';
import { esquemaCombustible } from '../http/combustibles.esquemas-http.js';
import { ActualizarCombustible } from '../aplicacion/casos-uso/combustibles/actualizar-combustible.js';
import { CrearCombustible } from '../aplicacion/casos-uso/combustibles/crear-combustible.js';
import { ListarCombustibles } from '../aplicacion/casos-uso/combustibles/listar-combustibles.js';
import { ObtenerCombustible } from '../aplicacion/casos-uso/combustibles/obtener-combustible.js';
import { CombustiblesControlador } from '../http/combustibles.controlador.js';
import { rutasCombustibles } from '../http/combustibles.rutas.js';
import { ConsultasCombustiblesDrizzle } from '../infraestructura/persistencia/consultas-combustibles.drizzle.js';
import { RepositorioCombustiblesDrizzle } from '../infraestructura/persistencia/repositorio-combustibles.drizzle.js';

const dependenciasDeCombustibles = () => ({
  unidadDeTrabajo: dependenciasCompartidas().unidadDeTrabajo,
  auditoria: dependenciasCompartidas().auditoria,
  repositorio: new RepositorioCombustiblesDrizzle(),
  consultas: new ConsultasCombustiblesDrizzle(),
});

type Dependencias = ReturnType<typeof dependenciasDeCombustibles>;

const casosDeUso = (dependencias: Dependencias) => ({
  listar: new ListarCombustibles(dependencias),
  obtener: new ObtenerCombustible(dependencias),
  crear: new CrearCombustible(dependencias),
  actualizar: new ActualizarCombustible(dependencias),
});

/** Exportar e importar en Excel; cada fila importada pasa por las mismas reglas que el formulario. */
function intercambioDeCombustibles(casos: ReturnType<typeof casosDeUso>, _dependencias: Dependencias) {
  return crearIntercambio<CombustibleDto, SolicitudDeCombustible>({
    nombre: 'Combustibles',
    columnas: columnasDeCombustibles(),
    validar: validadorDeZod(esquemaCombustible),
    listar: (operador) => casos.listar.ejecutar(operador),
    crear: (operador, solicitud) => casos.crear.ejecutar(operador, solicitud),
  });
}

/** Raíz de composición de los combustibles: el único lugar donde se eligen las implementaciones concretas. */
export function rutasDeCombustibles() {
  const dependencias = dependenciasDeCombustibles();
  const casos = casosDeUso(dependencias);
  return rutasCombustibles(new CombustiblesControlador(casos), intercambioDeCombustibles(casos, dependencias));
}
