import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { crearIntercambio } from '../../core/intercambio/contexto.js';
import { validadorDeZod } from '../../core/intercambio/http/rutas-de-intercambio.js';
import type { ConceptoDeGastoDto, SolicitudDeConceptoDeGasto } from '../aplicacion/dto/concepto-de-gasto.dto.js';
import { columnasDeConceptosDeGasto } from '../http/conceptos-de-gasto.columnas.js';
import { esquemaConceptoDeGasto } from '../http/conceptos-de-gasto.esquemas-http.js';
import { ActualizarConceptoDeGasto } from '../aplicacion/casos-uso/conceptos-de-gasto/actualizar-concepto-de-gasto.js';
import { CrearConceptoDeGasto } from '../aplicacion/casos-uso/conceptos-de-gasto/crear-concepto-de-gasto.js';
import { ListarConceptosDeGasto } from '../aplicacion/casos-uso/conceptos-de-gasto/listar-conceptos-de-gasto.js';
import { ObtenerConceptoDeGasto } from '../aplicacion/casos-uso/conceptos-de-gasto/obtener-concepto-de-gasto.js';
import { ConceptosDeGastoControlador } from '../http/conceptos-de-gasto.controlador.js';
import { rutasConceptosDeGasto } from '../http/conceptos-de-gasto.rutas.js';
import { ConsultasConceptosDeGastoDrizzle } from '../infraestructura/persistencia/consultas-conceptos-de-gasto.drizzle.js';
import { RepositorioConceptosDeGastoDrizzle } from '../infraestructura/persistencia/repositorio-conceptos-de-gasto.drizzle.js';

const dependenciasDeConceptosDeGasto = () => ({
  unidadDeTrabajo: dependenciasCompartidas().unidadDeTrabajo,
  auditoria: dependenciasCompartidas().auditoria,
  repositorio: new RepositorioConceptosDeGastoDrizzle(),
  consultas: new ConsultasConceptosDeGastoDrizzle(),
});

type Dependencias = ReturnType<typeof dependenciasDeConceptosDeGasto>;

const casosDeUso = (dependencias: Dependencias) => ({
  listar: new ListarConceptosDeGasto(dependencias),
  obtener: new ObtenerConceptoDeGasto(dependencias),
  crear: new CrearConceptoDeGasto(dependencias),
  actualizar: new ActualizarConceptoDeGasto(dependencias),
});

/** Exportar e importar en Excel; cada fila importada pasa por las mismas reglas que el formulario. */
function intercambioDeConceptosDeGasto(casos: ReturnType<typeof casosDeUso>, _dependencias: Dependencias) {
  return crearIntercambio<ConceptoDeGastoDto, SolicitudDeConceptoDeGasto>({
    nombre: 'Conceptos de gasto',
    columnas: columnasDeConceptosDeGasto(),
    validar: validadorDeZod(esquemaConceptoDeGasto),
    listar: (operador) => casos.listar.ejecutar(operador),
    crear: (operador, solicitud) => casos.crear.ejecutar(operador, solicitud),
  });
}

/** Raíz de composición de los conceptos de gasto: el único lugar donde se eligen las implementaciones concretas. */
export function rutasDeConceptosDeGasto() {
  const dependencias = dependenciasDeConceptosDeGasto();
  const casos = casosDeUso(dependencias);
  return rutasConceptosDeGasto(
    new ConceptosDeGastoControlador(casos),
    intercambioDeConceptosDeGasto(casos, dependencias),
  );
}
