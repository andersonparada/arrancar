import type { DependenciasCompartidas } from '../compartido/aplicacion/dependencias-compartidas.js';
import { ListarDepartamentos } from './aplicacion/casos-uso/listar-departamentos.js';
import { ListarMunicipios } from './aplicacion/casos-uso/listar-municipios.js';
import { GeografiaControlador } from './http/geografia.controlador.js';
import { rutasGeografia } from './http/geografia.rutas.js';
import { ConsultasGeografiaDrizzle } from './infraestructura/persistencia/consultas-geografia.drizzle.js';

/** Raíz de composición del contexto de geografía. */
export function componerGeografia({ unidadDeTrabajo }: DependenciasCompartidas) {
  const consultas = new ConsultasGeografiaDrizzle();
  const controlador = new GeografiaControlador({
    listarDepartamentos: new ListarDepartamentos({ unidadDeTrabajo, consultas }),
    listarMunicipios: new ListarMunicipios({ unidadDeTrabajo, consultas }),
  });
  return rutasGeografia(controlador);
}
