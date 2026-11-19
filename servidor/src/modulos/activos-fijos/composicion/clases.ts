import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { crearIntercambio } from '../../core/intercambio/contexto.js';
import { validadorDeZod } from '../../core/intercambio/http/rutas-de-intercambio.js';
import type { ClaseDto, SolicitudDeClase } from '../aplicacion/dto/clase.dto.js';
import { columnasDeClases } from '../http/clases.columnas.js';
import { esquemaClase } from '../http/clases.esquemas-http.js';
import { ActualizarClase } from '../aplicacion/casos-uso/clases/actualizar-clase.js';
import { CrearClase } from '../aplicacion/casos-uso/clases/crear-clase.js';
import { EliminarClase } from '../aplicacion/casos-uso/clases/eliminar-clase.js';
import { ListarConceptosDeClase } from '../aplicacion/casos-uso/clases/listar-conceptos-de-clase.js';
import { ListarClases } from '../aplicacion/casos-uso/clases/listar-clases.js';
import { ObtenerClase } from '../aplicacion/casos-uso/clases/obtener-clase.js';
import { ReemplazarConceptosDeClase } from '../aplicacion/casos-uso/clases/reemplazar-conceptos-de-clase.js';
import { ClasesControlador } from '../http/clases.controlador.js';
import { rutasClases } from '../http/clases.rutas.js';
import { ConsultasClasesDrizzle } from '../infraestructura/persistencia/consultas-clases.drizzle.js';
import { RelacionClasesConceptosDrizzle } from '../infraestructura/persistencia/relacion-clases-conceptos.drizzle.js';
import { TopesEnConfiguracion } from '../infraestructura/topes-en-configuracion.js';
import { RepositorioClasesDrizzle } from '../infraestructura/persistencia/repositorio-clases.drizzle.js';

const dependenciasDeClases = () => ({
  unidadDeTrabajo: dependenciasCompartidas().unidadDeTrabajo,
  auditoria: dependenciasCompartidas().auditoria,
  repositorio: new RepositorioClasesDrizzle(),
  consultas: new ConsultasClasesDrizzle(),
  topes: new TopesEnConfiguracion(),
  relacion: new RelacionClasesConceptosDrizzle(),
});

type Dependencias = ReturnType<typeof dependenciasDeClases>;

const casosDeUso = (dependencias: Dependencias) => ({
  listar: new ListarClases(dependencias),
  obtener: new ObtenerClase(dependencias),
  crear: new CrearClase(dependencias),
  actualizar: new ActualizarClase(dependencias),
  eliminar: new EliminarClase(dependencias),
  listarConceptos: new ListarConceptosDeClase(dependencias),
  reemplazarConceptos: new ReemplazarConceptosDeClase(dependencias),
});

/** Exportar e importar en Excel; cada fila importada pasa por las mismas reglas que el formulario. */
function intercambioDeClases(casos: ReturnType<typeof casosDeUso>, _dependencias: Dependencias) {
  return crearIntercambio<ClaseDto, SolicitudDeClase>({
    nombre: 'Clases de activos',
    columnas: columnasDeClases(),
    validar: validadorDeZod(esquemaClase),
    listar: (operador) => casos.listar.ejecutar(operador),
    crear: (operador, solicitud) => casos.crear.ejecutar(operador, solicitud),
  });
}

/** Raíz de composición de las clases de activos: el único lugar donde se eligen las implementaciones concretas. */
export function rutasDeClases() {
  const dependencias = dependenciasDeClases();
  const casos = casosDeUso(dependencias);
  return rutasClases(new ClasesControlador(casos), intercambioDeClases(casos, dependencias));
}
