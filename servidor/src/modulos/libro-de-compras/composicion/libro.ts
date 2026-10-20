import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { ConsultarAnuladosDelLibro, ConsultarLibro } from '../aplicacion/casos-uso/libro/consultar-libro.js';
import { LibroControlador } from '../http/libro.controlador.js';
import { rutasDelLibro } from '../http/libro.rutas.js';
import { ConsultasDelLibroDrizzle } from '../infraestructura/persistencia/consultas-del-libro.drizzle.js';
import { RepositorioDeDatosFiscalesDeEmpresaDrizzle } from '../infraestructura/persistencia/repositorio-de-datos-fiscales-de-empresa.drizzle.js';
import { IdentidadDeLaEmpresaEnMediador } from '../infraestructura/vecinos-en-mediador.js';

/** Raíz de composición del libro: el único lugar donde se eligen las implementaciones concretas. */
export function rutasDeLibro() {
  const dependencias = {
    unidadDeTrabajo: dependenciasCompartidas().unidadDeTrabajo,
    consultas: new ConsultasDelLibroDrizzle(),
    identidad: new IdentidadDeLaEmpresaEnMediador(),
    datosFiscalesDeEmpresa: new RepositorioDeDatosFiscalesDeEmpresaDrizzle(),
  };
  return rutasDelLibro(
    new LibroControlador({
      consultar: new ConsultarLibro(dependencias),
      anulados: new ConsultarAnuladosDelLibro(dependencias),
    }),
  );
}
