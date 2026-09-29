import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { crearIntercambio } from '../../core/intercambio/contexto.js';
import { validadorDeZod } from '../../core/intercambio/http/rutas-de-intercambio.js';
import { opcionesDe } from '../../core/intercambio/aplicacion/columnas.js';
import { ConsultasTiposDeLocalidadDrizzle } from '../infraestructura/persistencia/consultas-tipos-de-localidad.drizzle.js';
import type { LocalidadDto, SolicitudDeLocalidad } from '../aplicacion/dto/localidad.dto.js';
import { columnasDeLocalidades } from '../http/localidades.columnas.js';
import { esquemaLocalidad } from '../http/localidades.esquemas-http.js';
import { ActualizarLocalidad } from '../aplicacion/casos-uso/localidades/actualizar-localidad.js';
import { CrearLocalidad } from '../aplicacion/casos-uso/localidades/crear-localidad.js';
import { EliminarLocalidad } from '../aplicacion/casos-uso/localidades/eliminar-localidad.js';
import { ListarLocalidades } from '../aplicacion/casos-uso/localidades/listar-localidades.js';
import { ObtenerLocalidad } from '../aplicacion/casos-uso/localidades/obtener-localidad.js';
import { LocalidadesControlador } from '../http/localidades.controlador.js';
import { rutasLocalidades } from '../http/localidades.rutas.js';
import { ConsultasDeAccesosALocalidadesDrizzle } from '../infraestructura/persistencia/consultas-de-accesos-a-localidades.drizzle.js';
import { ConsultasLocalidadesDrizzle } from '../infraestructura/persistencia/consultas-localidades.drizzle.js';
import { RepositorioLocalidadesDrizzle } from '../infraestructura/persistencia/repositorio-localidades.drizzle.js';

const dependenciasDeLocalidades = () => ({
  unidadDeTrabajo: dependenciasCompartidas().unidadDeTrabajo,
  auditoria: dependenciasCompartidas().auditoria,
  repositorio: new RepositorioLocalidadesDrizzle(),
  consultas: new ConsultasLocalidadesDrizzle(),
  accesos: new ConsultasDeAccesosALocalidadesDrizzle(),
});

type Dependencias = ReturnType<typeof dependenciasDeLocalidades>;

const casosDeUso = (dependencias: Dependencias) => ({
  listar: new ListarLocalidades(dependencias),
  obtener: new ObtenerLocalidad(dependencias),
  crear: new CrearLocalidad(dependencias),
  actualizar: new ActualizarLocalidad(dependencias),
  eliminar: new EliminarLocalidad(dependencias),
});

/** Exportar e importar en Excel; cada fila importada pasa por las mismas reglas que el formulario. */
function intercambioDeLocalidades(casos: ReturnType<typeof casosDeUso>, _dependencias: Dependencias) {
  return crearIntercambio<LocalidadDto, SolicitudDeLocalidad>({
    nombre: 'Localidades',
    columnas: columnasDeLocalidades({ tipoId: opcionesDe(new ConsultasTiposDeLocalidadDrizzle(), 'nombre') }),
    validar: validadorDeZod(esquemaLocalidad),
    listar: (operador) => casos.listar.ejecutar(operador),
    crear: (operador, solicitud) => casos.crear.ejecutar(operador, solicitud),
    // Al importar no se asigna a quien importa: se reparten desde la ventana de accesos.
    sinAsignarAlCrear: true,
  });
}

/** Raíz de composición de las localidades: el único lugar donde se eligen las implementaciones concretas. */
export function rutasDeLocalidades() {
  const dependencias = dependenciasDeLocalidades();
  const casos = casosDeUso(dependencias);
  return rutasLocalidades(new LocalidadesControlador(casos), intercambioDeLocalidades(casos, dependencias));
}
