import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import type { DependenciasDeValores } from '../aplicacion/casos-uso/inmuebles/valores/dependencias-de-valores.js';
import { EliminarValorDeInmueble } from '../aplicacion/casos-uso/inmuebles/valores/eliminar-valor-de-inmueble.js';
import { ListarValoresDeInmueble } from '../aplicacion/casos-uso/inmuebles/valores/listar-valores-de-inmueble.js';
import { RegistrarValorDeInmueble } from '../aplicacion/casos-uso/inmuebles/valores/registrar-valor-de-inmueble.js';
import { ValoresDeInmuebleControlador } from '../http/valores-de-inmueble.controlador.js';
import { rutasValoresDeInmueble } from '../http/valores-de-inmueble.rutas.js';
import { AvisosDeEmpresaEnMediador } from '../infraestructura/avisos-de-empresa-en-mediador.js';
import { ConsultasValoresDeInmuebleDrizzle } from '../infraestructura/persistencia/consultas-valores-de-inmueble.drizzle.js';
import { RepositorioInmueblesDrizzle } from '../infraestructura/persistencia/repositorio-inmuebles.drizzle.js';
import { RepositorioValoresDeInmuebleDrizzle } from '../infraestructura/persistencia/repositorio-valores-de-inmueble.drizzle.js';

export const dependenciasDeValores = (): DependenciasDeValores => ({
  unidadDeTrabajo: dependenciasCompartidas().unidadDeTrabajo,
  auditoria: dependenciasCompartidas().auditoria,
  inmuebles: new RepositorioInmueblesDrizzle(),
  repositorio: new RepositorioValoresDeInmuebleDrizzle(),
  consultas: new ConsultasValoresDeInmuebleDrizzle(),
  avisos: new AvisosDeEmpresaEnMediador(),
});

export const casosDeUsoDeValores = (dependencias: DependenciasDeValores) => ({
  listar: new ListarValoresDeInmueble(dependencias),
  registrar: new RegistrarValorDeInmueble(dependencias),
  eliminar: new EliminarValorDeInmueble(dependencias),
});

/** Raíz de composición de los valores del inmueble. */
export function rutasDeValoresDeInmueble() {
  return rutasValoresDeInmueble(new ValoresDeInmuebleControlador(casosDeUsoDeValores(dependenciasDeValores())));
}
