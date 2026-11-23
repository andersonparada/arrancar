import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { crearIntercambio } from '../../core/intercambio/contexto.js';
import { validadorDeZod } from '../../core/intercambio/http/rutas-de-intercambio.js';
import type { TipoDeParcelaDto, SolicitudDeTipoDeParcela } from '../aplicacion/dto/tipo-de-parcela.dto.js';
import { columnasDeTiposDeParcela } from '../http/tipos-de-parcela.columnas.js';
import { esquemaTipoDeParcela } from '../http/tipos-de-parcela.esquemas-http.js';
import { ActualizarTipoDeParcela } from '../aplicacion/casos-uso/tipos-de-parcela/actualizar-tipo-de-parcela.js';
import { CrearTipoDeParcela } from '../aplicacion/casos-uso/tipos-de-parcela/crear-tipo-de-parcela.js';
import { EliminarTipoDeParcela } from '../aplicacion/casos-uso/tipos-de-parcela/eliminar-tipo-de-parcela.js';
import { ListarTiposDeParcela } from '../aplicacion/casos-uso/tipos-de-parcela/listar-tipos-de-parcela.js';
import { ObtenerTipoDeParcela } from '../aplicacion/casos-uso/tipos-de-parcela/obtener-tipo-de-parcela.js';
import { TiposDeParcelaControlador } from '../http/tipos-de-parcela.controlador.js';
import { rutasTiposDeParcela } from '../http/tipos-de-parcela.rutas.js';
import { ConsultasTiposDeParcelaDrizzle } from '../infraestructura/persistencia/consultas-tipos-de-parcela.drizzle.js';
import { RepositorioTiposDeParcelaDrizzle } from '../infraestructura/persistencia/repositorio-tipos-de-parcela.drizzle.js';

const dependenciasDeTiposDeParcela = () => ({
  unidadDeTrabajo: dependenciasCompartidas().unidadDeTrabajo,
  auditoria: dependenciasCompartidas().auditoria,
  repositorio: new RepositorioTiposDeParcelaDrizzle(),
  consultas: new ConsultasTiposDeParcelaDrizzle(),
});

type Dependencias = ReturnType<typeof dependenciasDeTiposDeParcela>;

const casosDeUso = (dependencias: Dependencias) => ({
  listar: new ListarTiposDeParcela(dependencias),
  obtener: new ObtenerTipoDeParcela(dependencias),
  crear: new CrearTipoDeParcela(dependencias),
  actualizar: new ActualizarTipoDeParcela(dependencias),
  eliminar: new EliminarTipoDeParcela(dependencias),
});

/** Exportar e importar en Excel; cada fila importada pasa por las mismas reglas que el formulario. */
function intercambioDeTiposDeParcela(casos: ReturnType<typeof casosDeUso>, _dependencias: Dependencias) {
  return crearIntercambio<TipoDeParcelaDto, SolicitudDeTipoDeParcela>({
    nombre: 'Tipos de parcela',
    columnas: columnasDeTiposDeParcela(),
    validar: validadorDeZod(esquemaTipoDeParcela),
    listar: (operador) => casos.listar.ejecutar(operador),
    crear: (operador, solicitud) => casos.crear.ejecutar(operador, solicitud),
  });
}

/** Raíz de composición de los tipos de parcela: el único lugar donde se eligen las implementaciones concretas. */
export function rutasDeTiposDeParcela() {
  const dependencias = dependenciasDeTiposDeParcela();
  const casos = casosDeUso(dependencias);
  return rutasTiposDeParcela(new TiposDeParcelaControlador(casos), intercambioDeTiposDeParcela(casos, dependencias));
}
