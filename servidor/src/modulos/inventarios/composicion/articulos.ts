import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { crearIntercambio } from '../../core/intercambio/contexto.js';
import { validadorDeZod } from '../../core/intercambio/http/rutas-de-intercambio.js';
import { opcionesDe } from '../../core/intercambio/aplicacion/columnas.js';
import { AlmacenDeConversionesDrizzle } from '../infraestructura/persistencia/almacen-de-conversiones.drizzle.js';
import { AlmacenDeLotesDrizzle } from '../infraestructura/persistencia/almacen-de-lotes.drizzle.js';
import { ConceptosParaArticulosDrizzle } from '../infraestructura/persistencia/conceptos-para-articulos.drizzle.js';
import { PrefijoEnConfiguracion } from '../infraestructura/prefijo-en-configuracion.js';
import { ConsultasCategoriasDrizzle } from '../infraestructura/persistencia/consultas-categorias.drizzle.js';
import { ConsultasUnidadesDrizzle } from '../infraestructura/persistencia/consultas-unidades.drizzle.js';
import type { ArticuloDto, SolicitudDeArticulo } from '../aplicacion/dto/articulo.dto.js';
import { columnasDeArticulos } from '../http/articulos.columnas.js';
import { esquemaArticulo } from '../http/articulos.esquemas-http.js';
import { ActualizarArticulo } from '../aplicacion/casos-uso/articulos/actualizar-articulo.js';
import { CrearLoteDeArticulo } from '../aplicacion/casos-uso/articulos/crear-lote-de-articulo.js';
import { EliminarArticulo } from '../aplicacion/casos-uso/articulos/eliminar-articulo.js';
import { ListarConversionesDeArticulo } from '../aplicacion/casos-uso/articulos/listar-conversiones-de-articulo.js';
import { ListarConceptosParaArticulos } from '../aplicacion/casos-uso/articulos/listar-conceptos-para-articulos.js';
import { ListarLotesDeArticulo } from '../aplicacion/casos-uso/articulos/listar-lotes-de-articulo.js';
import { ProponerCodigoDeArticulo } from '../aplicacion/casos-uso/articulos/proponer-codigo-de-articulo.js';
import { ReemplazarConversionesDeArticulo } from '../aplicacion/casos-uso/articulos/reemplazar-conversiones-de-articulo.js';
import { CrearArticulo } from '../aplicacion/casos-uso/articulos/crear-articulo.js';
import { ListarArticulos } from '../aplicacion/casos-uso/articulos/listar-articulos.js';
import { ObtenerArticulo } from '../aplicacion/casos-uso/articulos/obtener-articulo.js';
import { ArticulosControlador } from '../http/articulos.controlador.js';
import { rutasArticulos } from '../http/articulos.rutas.js';
import { ConsultasArticulosDrizzle } from '../infraestructura/persistencia/consultas-articulos.drizzle.js';
import { RepositorioArticulosDrizzle } from '../infraestructura/persistencia/repositorio-articulos.drizzle.js';

const dependenciasDeArticulos = () => ({
  unidadDeTrabajo: dependenciasCompartidas().unidadDeTrabajo,
  auditoria: dependenciasCompartidas().auditoria,
  repositorio: new RepositorioArticulosDrizzle(),
  consultas: new ConsultasArticulosDrizzle(),
  conversiones: new AlmacenDeConversionesDrizzle(),
  lotes: new AlmacenDeLotesDrizzle(),
  correlativos: dependenciasCompartidas().correlativos,
  reloj: dependenciasCompartidas().reloj,
  prefijo: new PrefijoEnConfiguracion(),
});

type Dependencias = ReturnType<typeof dependenciasDeArticulos>;

const casosDeUso = (dependencias: Dependencias) => ({
  listar: new ListarArticulos(dependencias),
  obtener: new ObtenerArticulo(dependencias),
  crear: new CrearArticulo(dependencias),
  actualizar: new ActualizarArticulo(dependencias),
  eliminar: new EliminarArticulo(dependencias),
  proponerCodigo: new ProponerCodigoDeArticulo(dependencias),
  listarConceptos: new ListarConceptosParaArticulos({
    ...dependencias,
    conceptos: new ConceptosParaArticulosDrizzle(),
  }),
  listarConversiones: new ListarConversionesDeArticulo(dependencias),
  reemplazarConversiones: new ReemplazarConversionesDeArticulo(dependencias),
  listarLotes: new ListarLotesDeArticulo(dependencias),
  crearLote: new CrearLoteDeArticulo(dependencias),
});

/** Exportar e importar en Excel; cada fila importada pasa por las mismas reglas que el formulario. */
function intercambioDeArticulos(casos: ReturnType<typeof casosDeUso>, _dependencias: Dependencias) {
  return crearIntercambio<ArticuloDto, SolicitudDeArticulo>({
    nombre: 'Artículos',
    columnas: columnasDeArticulos({
      categoriaId: opcionesDe(new ConsultasCategoriasDrizzle(), 'nombre'),
      unidadBaseId: opcionesDe(new ConsultasUnidadesDrizzle(), 'nombre'),
      conceptoDeGastoId: opcionesDe(new ConceptosParaArticulosDrizzle(), 'nombre'),
    }),
    validar: validadorDeZod(esquemaArticulo),
    listar: (operador) => casos.listar.ejecutar(operador),
    crear: (operador, solicitud) => casos.crear.ejecutar(operador, solicitud),
  });
}

/** Raíz de composición de los artículos: el único lugar donde se eligen las implementaciones concretas. */
export function rutasDeArticulos() {
  const dependencias = dependenciasDeArticulos();
  const casos = casosDeUso(dependencias);
  return rutasArticulos(new ArticulosControlador(casos), intercambioDeArticulos(casos, dependencias));
}
