import { opcionesDe } from '../../core/intercambio/aplicacion/columnas.js';
import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { crearIntercambio } from '../../core/intercambio/contexto.js';
import { validadorDeZod } from '../../core/intercambio/http/rutas-de-intercambio.js';
import type { BodegaDto, SolicitudDeBodega } from '../aplicacion/dto/bodega.dto.js';
import { columnasDeBodegas } from '../http/bodegas.columnas.js';
import { esquemaBodega } from '../http/bodegas.esquemas-http.js';
import { ActualizarBodega } from '../aplicacion/casos-uso/bodegas/actualizar-bodega.js';
import { CrearBodega } from '../aplicacion/casos-uso/bodegas/crear-bodega.js';
import { EliminarBodega } from '../aplicacion/casos-uso/bodegas/eliminar-bodega.js';
import { ListarBodegas } from '../aplicacion/casos-uso/bodegas/listar-bodegas.js';
import { ObtenerBodega } from '../aplicacion/casos-uso/bodegas/obtener-bodega.js';
import { BodegasControlador } from '../http/bodegas.controlador.js';
import { rutasBodegas } from '../http/bodegas.rutas.js';
import { ConsultasDeUsoDelKardexDrizzle } from '../infraestructura/persistencia/consultas-de-uso-del-kardex.drizzle.js';
import { ConsultasBodegasDrizzle } from '../infraestructura/persistencia/consultas-bodegas.drizzle.js';
import { ConsultasDeAccesosABodegasDrizzle } from '../infraestructura/persistencia/consultas-de-accesos-a-bodegas.drizzle.js';
import { LocalidadesParaBodegasDrizzle } from '../infraestructura/persistencia/localidades-para-bodegas.drizzle.js';
import { RepositorioBodegasDrizzle } from '../infraestructura/persistencia/repositorio-bodegas.drizzle.js';

const dependenciasDeBodegas = () => ({
  unidadDeTrabajo: dependenciasCompartidas().unidadDeTrabajo,
  auditoria: dependenciasCompartidas().auditoria,
  repositorio: new RepositorioBodegasDrizzle(),
  consultas: new ConsultasBodegasDrizzle(),
  accesos: new ConsultasDeAccesosABodegasDrizzle(),
  uso: new ConsultasDeUsoDelKardexDrizzle(),
});

type Dependencias = ReturnType<typeof dependenciasDeBodegas>;

const casosDeUso = (dependencias: Dependencias) => ({
  listar: new ListarBodegas(dependencias),
  obtener: new ObtenerBodega(dependencias),
  crear: new CrearBodega(dependencias),
  actualizar: new ActualizarBodega(dependencias),
  eliminar: new EliminarBodega(dependencias),
});

/** Exportar e importar en Excel; cada fila importada pasa por las mismas reglas que el formulario. */
function intercambioDeBodegas(casos: ReturnType<typeof casosDeUso>, _dependencias: Dependencias) {
  return crearIntercambio<BodegaDto, SolicitudDeBodega>({
    nombre: 'Bodegas',
    columnas: columnasDeBodegas({ localidadId: opcionesDe(new LocalidadesParaBodegasDrizzle(), 'nombre', 'codigo') }),
    validar: validadorDeZod(esquemaBodega),
    listar: (operador) => casos.listar.ejecutar(operador),
    crear: (operador, solicitud) => casos.crear.ejecutar(operador, solicitud),
    // Al importar no se asigna a quien importa: se reparten desde la ventana de accesos.
    sinAsignarAlCrear: true,
  });
}

/** Raíz de composición de las bodegas: el único lugar donde se eligen las implementaciones concretas. */
export function rutasDeBodegas() {
  const dependencias = dependenciasDeBodegas();
  const casos = casosDeUso(dependencias);
  return rutasBodegas(new BodegasControlador(casos), intercambioDeBodegas(casos, dependencias));
}
