import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { crearIntercambio } from '../../core/intercambio/contexto.js';
import { validadorDeZod } from '../../core/intercambio/http/rutas-de-intercambio.js';
import { opcionesDe } from '../../core/intercambio/aplicacion/columnas.js';
import { ConsultasCombustiblesDrizzle } from '../infraestructura/persistencia/consultas-combustibles.drizzle.js';
import type {
  VigenciaDeCombustibleDto,
  SolicitudDeVigenciaDeCombustible,
} from '../aplicacion/dto/vigencia-de-combustible.dto.js';
import { columnasDeVigenciasDeCombustible } from '../http/vigencias-de-combustible.columnas.js';
import { esquemaVigenciaDeCombustible } from '../http/vigencias-de-combustible.esquemas-http.js';
import { ActualizarVigenciaDeCombustible } from '../aplicacion/casos-uso/vigencias-de-combustible/actualizar-vigencia-de-combustible.js';
import { CrearVigenciaDeCombustible } from '../aplicacion/casos-uso/vigencias-de-combustible/crear-vigencia-de-combustible.js';
import { EliminarVigenciaDeCombustible } from '../aplicacion/casos-uso/vigencias-de-combustible/eliminar-vigencia-de-combustible.js';
import { ListarVigenciasDeCombustible } from '../aplicacion/casos-uso/vigencias-de-combustible/listar-vigencias-de-combustible.js';
import { ObtenerVigenciaDeCombustible } from '../aplicacion/casos-uso/vigencias-de-combustible/obtener-vigencia-de-combustible.js';
import { VigenciasDeCombustibleControlador } from '../http/vigencias-de-combustible.controlador.js';
import { rutasVigenciasDeCombustible } from '../http/vigencias-de-combustible.rutas.js';
import { ConsultasVigenciasDeCombustibleDrizzle } from '../infraestructura/persistencia/consultas-vigencias-de-combustible.drizzle.js';
import { RepositorioVigenciasDeCombustibleDrizzle } from '../infraestructura/persistencia/repositorio-vigencias-de-combustible.drizzle.js';

const dependenciasDeVigenciasDeCombustible = () => ({
  unidadDeTrabajo: dependenciasCompartidas().unidadDeTrabajo,
  auditoria: dependenciasCompartidas().auditoria,
  repositorio: new RepositorioVigenciasDeCombustibleDrizzle(),
  consultas: new ConsultasVigenciasDeCombustibleDrizzle(),
});

type Dependencias = ReturnType<typeof dependenciasDeVigenciasDeCombustible>;

const casosDeUso = (dependencias: Dependencias) => ({
  listar: new ListarVigenciasDeCombustible(dependencias),
  obtener: new ObtenerVigenciaDeCombustible(dependencias),
  crear: new CrearVigenciaDeCombustible(dependencias),
  actualizar: new ActualizarVigenciaDeCombustible(dependencias),
  eliminar: new EliminarVigenciaDeCombustible(dependencias),
});

/** Exportar e importar en Excel; cada fila importada pasa por las mismas reglas que el formulario. */
function intercambioDeVigenciasDeCombustible(casos: ReturnType<typeof casosDeUso>, _dependencias: Dependencias) {
  return crearIntercambio<VigenciaDeCombustibleDto, SolicitudDeVigenciaDeCombustible>({
    nombre: 'Vigencias de combustible',
    columnas: columnasDeVigenciasDeCombustible({
      combustibleId: opcionesDe(new ConsultasCombustiblesDrizzle(), 'nombre'),
    }),
    validar: validadorDeZod(esquemaVigenciaDeCombustible),
    listar: (operador) => casos.listar.ejecutar(operador),
    crear: (operador, solicitud) => casos.crear.ejecutar(operador, solicitud),
  });
}

/** Raíz de composición de las vigencias de combustible: el único lugar donde se eligen las implementaciones concretas. */
export function rutasDeVigenciasDeCombustible() {
  const dependencias = dependenciasDeVigenciasDeCombustible();
  const casos = casosDeUso(dependencias);
  return rutasVigenciasDeCombustible(
    new VigenciasDeCombustibleControlador(casos),
    intercambioDeVigenciasDeCombustible(casos, dependencias),
  );
}
