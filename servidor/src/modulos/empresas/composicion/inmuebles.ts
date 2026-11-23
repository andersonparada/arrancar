import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { rutasDelModulo } from '../../core/modulos-sistema/rutas-del-modulo.js';
import { crearIntercambio } from '../../core/intercambio/contexto.js';
import { validadorDeZod } from '../../core/intercambio/http/rutas-de-intercambio.js';
import { opcionesDe } from '../../core/intercambio/aplicacion/columnas.js';
import { ConsultasLocalidadesDrizzle } from '../infraestructura/persistencia/consultas-localidades.drizzle.js';
import { columnasDeInmuebles } from '../http/inmuebles.columnas.js';
import { esquemaInmuebleConValores } from '../http/inmuebles.valores.esquemas-http.js';
import type { FilaDeInmuebleEnExcel, SolicitudDeInmuebleEnExcel } from '../aplicacion/valores-en-excel.js';
import {
  CrearInmuebleConValores,
  ListarInmueblesConValores,
} from '../aplicacion/casos-uso/inmuebles/inmuebles-en-excel.js';
import { ConsultasValoresDeInmuebleDrizzle } from '../infraestructura/persistencia/consultas-valores-de-inmueble.drizzle.js';
import { casosDeUsoDeValores, dependenciasDeValores, rutasDeValoresDeInmueble } from './valores-de-inmueble.js';
import { ActualizarInmueble } from '../aplicacion/casos-uso/inmuebles/actualizar-inmueble.js';
import { CrearInmueble } from '../aplicacion/casos-uso/inmuebles/crear-inmueble.js';
import { EliminarInmueble } from '../aplicacion/casos-uso/inmuebles/eliminar-inmueble.js';
import { InactivarInmueble } from '../aplicacion/casos-uso/inmuebles/inactivar-inmueble.js';
import { ReactivarInmueble } from '../aplicacion/casos-uso/inmuebles/reactivar-inmueble.js';
import { ListarInmuebles } from '../aplicacion/casos-uso/inmuebles/listar-inmuebles.js';
import { ObtenerInmueble } from '../aplicacion/casos-uso/inmuebles/obtener-inmueble.js';
import { InmueblesControlador } from '../http/inmuebles.controlador.js';
import { rutasInmuebles } from '../http/inmuebles.rutas.js';
import { ConsultasInmueblesDrizzle } from '../infraestructura/persistencia/consultas-inmuebles.drizzle.js';
import { RepositorioInmueblesDrizzle } from '../infraestructura/persistencia/repositorio-inmuebles.drizzle.js';

const dependenciasDeInmuebles = () => ({
  unidadDeTrabajo: dependenciasCompartidas().unidadDeTrabajo,
  auditoria: dependenciasCompartidas().auditoria,
  repositorio: new RepositorioInmueblesDrizzle(),
  consultas: new ConsultasInmueblesDrizzle(),
});

type Dependencias = ReturnType<typeof dependenciasDeInmuebles>;

const casosDeUso = (dependencias: Dependencias) => ({
  listar: new ListarInmuebles(dependencias),
  obtener: new ObtenerInmueble(dependencias),
  crear: new CrearInmueble(dependencias),
  actualizar: new ActualizarInmueble(dependencias),
  inactivar: new InactivarInmueble(dependencias),
  reactivar: new ReactivarInmueble(dependencias),
  eliminar: new EliminarInmueble(dependencias),
});

/** Exportar e importar en Excel; cada fila importada pasa por las mismas reglas que el formulario, con sus valores. */
function intercambioDeInmuebles(casos: ReturnType<typeof casosDeUso>, dependencias: Dependencias) {
  const { unidadDeTrabajo, consultas } = dependencias;
  const listar = new ListarInmueblesConValores({
    unidadDeTrabajo,
    consultas,
    valores: new ConsultasValoresDeInmuebleDrizzle(),
    reloj: dependenciasCompartidas().reloj,
  });
  const crear = new CrearInmuebleConValores({
    unidadDeTrabajo,
    crear: casos.crear,
    registrarValor: casosDeUsoDeValores(dependenciasDeValores()).registrar,
  });
  return crearIntercambio<FilaDeInmuebleEnExcel, SolicitudDeInmuebleEnExcel>({
    nombre: 'Inmuebles',
    columnas: columnasDeInmuebles({ localidadId: opcionesDe(new ConsultasLocalidadesDrizzle(), 'nombre') }),
    validar: validadorDeZod(esquemaInmuebleConValores),
    listar: (operador) => listar.ejecutar(operador),
    crear: (operador, solicitud) => crear.ejecutar(operador, solicitud),
  });
}

/** Raíz de composición de los inmuebles: el único lugar donde se eligen las implementaciones concretas. */
export function rutasDeInmuebles() {
  const dependencias = dependenciasDeInmuebles();
  const casos = casosDeUso(dependencias);
  return rutasDelModulo([
    rutasInmuebles(new InmueblesControlador(casos), intercambioDeInmuebles(casos, dependencias)),
    rutasDeValoresDeInmueble(),
  ]);
}
