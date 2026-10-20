import type { DependenciasCompartidas } from '../../core/compartido/aplicacion/dependencias-compartidas.js';
import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { crearLibroDeExcel } from '../../core/intercambio/contexto.js';
import { ConsultarAnuladosDelLibro, ConsultarLibro } from '../aplicacion/casos-uso/libro/consultar-libro.js';
import {
  AbrirEmisionDelLibro,
  GenerarBorradorDelLibro,
  ListarEmisionesDelLibro,
} from '../aplicacion/casos-uso/libro/consultas-de-emisiones.js';
import { CorregirUltimoFolio } from '../aplicacion/casos-uso/libro/corregir-ultimo-folio.js';
import { EmitirLibroFoliado } from '../aplicacion/casos-uso/libro/emitir-libro-foliado.js';
import { ExportarLibro } from '../aplicacion/casos-uso/libro/exportar-libro.js';
import { LibroControlador } from '../http/libro.controlador.js';
import { rutasDelLibro } from '../http/libro.rutas.js';
import { GeneradorPdfkitDelLibro } from '../infraestructura/pdf/generador-pdfkit-del-libro.js';
import { ConsultasDelLibroDrizzle } from '../infraestructura/persistencia/consultas-del-libro.drizzle.js';
import {
  RepositorioDeEmisionesDelLibroDrizzle,
  RepositorioDeFoliacionDrizzle,
} from '../infraestructura/persistencia/repositorio-de-emisiones-del-libro.drizzle.js';
import { RepositorioDeDatosFiscalesDeEmpresaDrizzle } from '../infraestructura/persistencia/repositorio-de-datos-fiscales-de-empresa.drizzle.js';
import { IdentidadDeLaEmpresaEnMediador } from '../infraestructura/vecinos-en-mediador.js';

/** Uno solo para todo el proceso: dibujar bloquea, así que se hace una generación a la vez. */
const generadorDePdf = new GeneradorPdfkitDelLibro();

function dependenciasDeConsulta(compartidas: DependenciasCompartidas) {
  return {
    unidadDeTrabajo: compartidas.unidadDeTrabajo,
    consultas: new ConsultasDelLibroDrizzle(),
    identidad: new IdentidadDeLaEmpresaEnMediador(),
    datosFiscalesDeEmpresa: new RepositorioDeDatosFiscalesDeEmpresaDrizzle(),
  };
}

function casosDeUsoDeFolios(compartidas: DependenciasCompartidas) {
  const folios = {
    ...dependenciasDeConsulta(compartidas),
    emisiones: new RepositorioDeEmisionesDelLibroDrizzle(),
    foliacion: new RepositorioDeFoliacionDrizzle(),
    generador: generadorDePdf,
    documentos: compartidas.documentos,
    auditoria: compartidas.auditoria,
  };
  return {
    borrador: new GenerarBorradorDelLibro(folios),
    emitir: new EmitirLibroFoliado(folios),
    emisiones: new ListarEmisionesDelLibro(folios),
    copia: new AbrirEmisionDelLibro(folios),
    corregirFolio: new CorregirUltimoFolio(folios),
  };
}

/** Raíz de composición del libro: el único lugar donde se eligen las implementaciones concretas. */
export function rutasDeLibro() {
  const compartidas = dependenciasCompartidas();
  const dependencias = dependenciasDeConsulta(compartidas);
  return rutasDelLibro(
    new LibroControlador({
      consultar: new ConsultarLibro(dependencias),
      anulados: new ConsultarAnuladosDelLibro(dependencias),
      exportar: new ExportarLibro({ ...dependencias, excel: crearLibroDeExcel() }),
      ...casosDeUsoDeFolios(compartidas),
    }),
  );
}
