import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { crearIntercambio } from '../../core/intercambio/contexto.js';
import { validadorDeZod } from '../../core/intercambio/http/rutas-de-intercambio.js';
import type { ConceptoDto, SolicitudDeConcepto } from '../aplicacion/dto/concepto.dto.js';
import { columnasDeConceptos } from '../http/conceptos.columnas.js';
import { esquemaConcepto } from '../http/conceptos.esquemas-http.js';
import { ActualizarConcepto } from '../aplicacion/casos-uso/conceptos/actualizar-concepto.js';
import { EliminarConcepto } from '../aplicacion/casos-uso/conceptos/eliminar-concepto.js';
import { CrearConcepto } from '../aplicacion/casos-uso/conceptos/crear-concepto.js';
import { ListarConceptos } from '../aplicacion/casos-uso/conceptos/listar-conceptos.js';
import { ObtenerConcepto } from '../aplicacion/casos-uso/conceptos/obtener-concepto.js';
import { ConceptosControlador } from '../http/conceptos.controlador.js';
import { rutasConceptos } from '../http/conceptos.rutas.js';
import { ConsultasConceptosDrizzle } from '../infraestructura/persistencia/consultas-conceptos.drizzle.js';
import { RepositorioConceptosDrizzle } from '../infraestructura/persistencia/repositorio-conceptos.drizzle.js';

const dependenciasDeConceptos = () => ({
  unidadDeTrabajo: dependenciasCompartidas().unidadDeTrabajo,
  auditoria: dependenciasCompartidas().auditoria,
  repositorio: new RepositorioConceptosDrizzle(),
  consultas: new ConsultasConceptosDrizzle(),
});

type Dependencias = ReturnType<typeof dependenciasDeConceptos>;

const casosDeUso = (dependencias: Dependencias) => ({
  listar: new ListarConceptos(dependencias),
  obtener: new ObtenerConcepto(dependencias),
  crear: new CrearConcepto(dependencias),
  actualizar: new ActualizarConcepto(dependencias),
  eliminar: new EliminarConcepto(dependencias),
});

/** Exportar e importar en Excel; cada fila importada pasa por las mismas reglas que el formulario. */
function intercambioDeConceptos(casos: ReturnType<typeof casosDeUso>, _dependencias: Dependencias) {
  return crearIntercambio<ConceptoDto, SolicitudDeConcepto>({
    nombre: 'Conceptos',
    columnas: columnasDeConceptos(),
    validar: validadorDeZod(esquemaConcepto),
    listar: (operador) => casos.listar.ejecutar(operador),
    crear: (operador, solicitud) => casos.crear.ejecutar(operador, solicitud),
  });
}

/** Raíz de composición de los conceptos: el único lugar donde se eligen las implementaciones concretas. */
export function rutasDeConceptos() {
  const dependencias = dependenciasDeConceptos();
  const casos = casosDeUso(dependencias);
  return rutasConceptos(new ConceptosControlador(casos), intercambioDeConceptos(casos, dependencias));
}
