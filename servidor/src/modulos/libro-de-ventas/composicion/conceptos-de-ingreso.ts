import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { crearIntercambio } from '../../core/intercambio/contexto.js';
import { validadorDeZod } from '../../core/intercambio/http/rutas-de-intercambio.js';
import type { ConceptoDeIngresoDto, SolicitudDeConceptoDeIngreso } from '../aplicacion/dto/concepto-de-ingreso.dto.js';
import { columnasDeConceptosDeIngreso } from '../http/conceptos-de-ingreso.columnas.js';
import { esquemaConceptoDeIngreso } from '../http/conceptos-de-ingreso.esquemas-http.js';
import { ActualizarConceptoDeIngreso } from '../aplicacion/casos-uso/conceptos-de-ingreso/actualizar-concepto-de-ingreso.js';
import { CrearConceptoDeIngreso } from '../aplicacion/casos-uso/conceptos-de-ingreso/crear-concepto-de-ingreso.js';
import { EliminarConceptoDeIngreso } from '../aplicacion/casos-uso/conceptos-de-ingreso/eliminar-concepto-de-ingreso.js';
import { ListarConceptosDeIngreso } from '../aplicacion/casos-uso/conceptos-de-ingreso/listar-conceptos-de-ingreso.js';
import { ObtenerConceptoDeIngreso } from '../aplicacion/casos-uso/conceptos-de-ingreso/obtener-concepto-de-ingreso.js';
import { ConceptosDeIngresoControlador } from '../http/conceptos-de-ingreso.controlador.js';
import { rutasConceptosDeIngreso } from '../http/conceptos-de-ingreso.rutas.js';
import { ConsultasConceptosDeIngresoDrizzle } from '../infraestructura/persistencia/consultas-conceptos-de-ingreso.drizzle.js';
import { RepositorioConceptosDeIngresoDrizzle } from '../infraestructura/persistencia/repositorio-conceptos-de-ingreso.drizzle.js';

const dependenciasDeConceptosDeIngreso = () => ({
  unidadDeTrabajo: dependenciasCompartidas().unidadDeTrabajo,
  auditoria: dependenciasCompartidas().auditoria,
  repositorio: new RepositorioConceptosDeIngresoDrizzle(),
  consultas: new ConsultasConceptosDeIngresoDrizzle(),
});

type Dependencias = ReturnType<typeof dependenciasDeConceptosDeIngreso>;

const casosDeUso = (dependencias: Dependencias) => ({
  listar: new ListarConceptosDeIngreso(dependencias),
  obtener: new ObtenerConceptoDeIngreso(dependencias),
  crear: new CrearConceptoDeIngreso(dependencias),
  actualizar: new ActualizarConceptoDeIngreso(dependencias),
  eliminar: new EliminarConceptoDeIngreso(dependencias),
});

/** Exportar e importar en Excel; cada fila importada pasa por las mismas reglas que el formulario. */
function intercambioDeConceptosDeIngreso(casos: ReturnType<typeof casosDeUso>, _dependencias: Dependencias) {
  return crearIntercambio<ConceptoDeIngresoDto, SolicitudDeConceptoDeIngreso>({
    nombre: 'Conceptos de ingreso',
    columnas: columnasDeConceptosDeIngreso(),
    validar: validadorDeZod(esquemaConceptoDeIngreso),
    listar: (operador) => casos.listar.ejecutar(operador),
    crear: (operador, solicitud) => casos.crear.ejecutar(operador, solicitud),
  });
}

/** Raíz de composición de los conceptos de ingreso: el único lugar donde se eligen las implementaciones concretas. */
export function rutasDeConceptosDeIngreso() {
  const dependencias = dependenciasDeConceptosDeIngreso();
  const casos = casosDeUso(dependencias);
  return rutasConceptosDeIngreso(
    new ConceptosDeIngresoControlador(casos),
    intercambioDeConceptosDeIngreso(casos, dependencias),
  );
}
