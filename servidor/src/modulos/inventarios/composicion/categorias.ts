import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { crearIntercambio } from '../../core/intercambio/contexto.js';
import { validadorDeZod } from '../../core/intercambio/http/rutas-de-intercambio.js';
import type { CategoriaDto, SolicitudDeCategoria } from '../aplicacion/dto/categoria.dto.js';
import { columnasDeCategorias } from '../http/categorias.columnas.js';
import { esquemaCategoria } from '../http/categorias.esquemas-http.js';
import { ActualizarCategoria } from '../aplicacion/casos-uso/categorias/actualizar-categoria.js';
import { CrearCategoria } from '../aplicacion/casos-uso/categorias/crear-categoria.js';
import { EliminarCategoria } from '../aplicacion/casos-uso/categorias/eliminar-categoria.js';
import { ListarCategorias } from '../aplicacion/casos-uso/categorias/listar-categorias.js';
import { ObtenerCategoria } from '../aplicacion/casos-uso/categorias/obtener-categoria.js';
import { CategoriasControlador } from '../http/categorias.controlador.js';
import { rutasCategorias } from '../http/categorias.rutas.js';
import { ConsultasCategoriasDrizzle } from '../infraestructura/persistencia/consultas-categorias.drizzle.js';
import { RepositorioCategoriasDrizzle } from '../infraestructura/persistencia/repositorio-categorias.drizzle.js';

const dependenciasDeCategorias = () => ({
  unidadDeTrabajo: dependenciasCompartidas().unidadDeTrabajo,
  auditoria: dependenciasCompartidas().auditoria,
  repositorio: new RepositorioCategoriasDrizzle(),
  consultas: new ConsultasCategoriasDrizzle(),
});

type Dependencias = ReturnType<typeof dependenciasDeCategorias>;

const casosDeUso = (dependencias: Dependencias) => ({
  listar: new ListarCategorias(dependencias),
  obtener: new ObtenerCategoria(dependencias),
  crear: new CrearCategoria(dependencias),
  actualizar: new ActualizarCategoria(dependencias),
  eliminar: new EliminarCategoria(dependencias),
});

/** Exportar e importar en Excel; cada fila importada pasa por las mismas reglas que el formulario. */
function intercambioDeCategorias(casos: ReturnType<typeof casosDeUso>, _dependencias: Dependencias) {
  return crearIntercambio<CategoriaDto, SolicitudDeCategoria>({
    nombre: 'Categorías',
    columnas: columnasDeCategorias(),
    validar: validadorDeZod(esquemaCategoria),
    listar: (operador) => casos.listar.ejecutar(operador),
    crear: (operador, solicitud) => casos.crear.ejecutar(operador, solicitud),
  });
}

/** Raíz de composición de las categorías: el único lugar donde se eligen las implementaciones concretas. */
export function rutasDeCategorias() {
  const dependencias = dependenciasDeCategorias();
  const casos = casosDeUso(dependencias);
  return rutasCategorias(new CategoriasControlador(casos), intercambioDeCategorias(casos, dependencias));
}
