import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { crearIntercambio } from '../../core/intercambio/contexto.js';
import { validadorDeZod } from '../../core/intercambio/http/rutas-de-intercambio.js';
import type { TipoDeLocalidadDto, SolicitudDeTipoDeLocalidad } from '../aplicacion/dto/tipo-de-localidad.dto.js';
import { columnasDeTiposDeLocalidad } from '../http/tipos-de-localidad.columnas.js';
import { esquemaTipoDeLocalidad } from '../http/tipos-de-localidad.esquemas-http.js';
import { ActualizarTipoDeLocalidad } from '../aplicacion/casos-uso/tipos-de-localidad/actualizar-tipo-de-localidad.js';
import { EliminarTipoDeLocalidad } from '../aplicacion/casos-uso/tipos-de-localidad/eliminar-tipo-de-localidad.js';
import { CrearTipoDeLocalidad } from '../aplicacion/casos-uso/tipos-de-localidad/crear-tipo-de-localidad.js';
import { ListarTiposDeLocalidad } from '../aplicacion/casos-uso/tipos-de-localidad/listar-tipos-de-localidad.js';
import { ObtenerTipoDeLocalidad } from '../aplicacion/casos-uso/tipos-de-localidad/obtener-tipo-de-localidad.js';
import { TiposDeLocalidadControlador } from '../http/tipos-de-localidad.controlador.js';
import { rutasTiposDeLocalidad } from '../http/tipos-de-localidad.rutas.js';
import { ConsultasTiposDeLocalidadDrizzle } from '../infraestructura/persistencia/consultas-tipos-de-localidad.drizzle.js';
import { RepositorioTiposDeLocalidadDrizzle } from '../infraestructura/persistencia/repositorio-tipos-de-localidad.drizzle.js';

const dependenciasDeTiposDeLocalidad = () => ({
  unidadDeTrabajo: dependenciasCompartidas().unidadDeTrabajo,
  auditoria: dependenciasCompartidas().auditoria,
  repositorio: new RepositorioTiposDeLocalidadDrizzle(),
  consultas: new ConsultasTiposDeLocalidadDrizzle(),
});

type Dependencias = ReturnType<typeof dependenciasDeTiposDeLocalidad>;

const casosDeUso = (dependencias: Dependencias) => ({
  listar: new ListarTiposDeLocalidad(dependencias),
  obtener: new ObtenerTipoDeLocalidad(dependencias),
  crear: new CrearTipoDeLocalidad(dependencias),
  actualizar: new ActualizarTipoDeLocalidad(dependencias),
  eliminar: new EliminarTipoDeLocalidad(dependencias),
});

/** Exportar e importar en Excel; cada fila importada pasa por las mismas reglas que el formulario. */
function intercambioDeTiposDeLocalidad(casos: ReturnType<typeof casosDeUso>, _dependencias: Dependencias) {
  return crearIntercambio<TipoDeLocalidadDto, SolicitudDeTipoDeLocalidad>({
    nombre: 'Tipos de localidad',
    columnas: columnasDeTiposDeLocalidad(),
    validar: validadorDeZod(esquemaTipoDeLocalidad),
    listar: (operador) => casos.listar.ejecutar(operador),
    crear: (operador, solicitud) => casos.crear.ejecutar(operador, solicitud),
  });
}

/** Raíz de composición de los tipos de localidad: el único lugar donde se eligen las implementaciones concretas. */
export function rutasDeTiposDeLocalidad() {
  const dependencias = dependenciasDeTiposDeLocalidad();
  const casos = casosDeUso(dependencias);
  return rutasTiposDeLocalidad(
    new TiposDeLocalidadControlador(casos),
    intercambioDeTiposDeLocalidad(casos, dependencias),
  );
}
