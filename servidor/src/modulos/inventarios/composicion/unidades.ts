import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { crearIntercambio } from '../../core/intercambio/contexto.js';
import { validadorDeZod } from '../../core/intercambio/http/rutas-de-intercambio.js';
import type { UnidadDto, SolicitudDeUnidad } from '../aplicacion/dto/unidad.dto.js';
import { columnasDeUnidades } from '../http/unidades.columnas.js';
import { esquemaUnidad } from '../http/unidades.esquemas-http.js';
import { ActualizarUnidad } from '../aplicacion/casos-uso/unidades/actualizar-unidad.js';
import { CrearUnidad } from '../aplicacion/casos-uso/unidades/crear-unidad.js';
import { EliminarUnidad } from '../aplicacion/casos-uso/unidades/eliminar-unidad.js';
import { ListarUnidades } from '../aplicacion/casos-uso/unidades/listar-unidades.js';
import { ObtenerUnidad } from '../aplicacion/casos-uso/unidades/obtener-unidad.js';
import { UnidadesControlador } from '../http/unidades.controlador.js';
import { rutasUnidades } from '../http/unidades.rutas.js';
import { ConsultasUnidadesDrizzle } from '../infraestructura/persistencia/consultas-unidades.drizzle.js';
import { RepositorioUnidadesDrizzle } from '../infraestructura/persistencia/repositorio-unidades.drizzle.js';

const dependenciasDeUnidades = () => ({
  unidadDeTrabajo: dependenciasCompartidas().unidadDeTrabajo,
  auditoria: dependenciasCompartidas().auditoria,
  repositorio: new RepositorioUnidadesDrizzle(),
  consultas: new ConsultasUnidadesDrizzle(),
});

type Dependencias = ReturnType<typeof dependenciasDeUnidades>;

const casosDeUso = (dependencias: Dependencias) => ({
  listar: new ListarUnidades(dependencias),
  obtener: new ObtenerUnidad(dependencias),
  crear: new CrearUnidad(dependencias),
  actualizar: new ActualizarUnidad(dependencias),
  eliminar: new EliminarUnidad(dependencias),
});

/** Exportar e importar en Excel; cada fila importada pasa por las mismas reglas que el formulario. */
function intercambioDeUnidades(casos: ReturnType<typeof casosDeUso>, _dependencias: Dependencias) {
  return crearIntercambio<UnidadDto, SolicitudDeUnidad>({
    nombre: 'Unidades de medida',
    columnas: columnasDeUnidades(),
    validar: validadorDeZod(esquemaUnidad),
    listar: (operador) => casos.listar.ejecutar(operador),
    crear: (operador, solicitud) => casos.crear.ejecutar(operador, solicitud),
  });
}

/** Raíz de composición de las unidades de medida: el único lugar donde se eligen las implementaciones concretas. */
export function rutasDeUnidades() {
  const dependencias = dependenciasDeUnidades();
  const casos = casosDeUso(dependencias);
  return rutasUnidades(new UnidadesControlador(casos), intercambioDeUnidades(casos, dependencias));
}
