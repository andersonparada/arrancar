import type { DependenciasCompartidas } from '../compartido/aplicacion/dependencias-compartidas.js';
import { almacenamiento } from '../compartido/infraestructura/almacenamiento-local.js';
import { AbrirImagen } from './aplicacion/casos-uso/abrir-imagen.js';
import { SubirImagen } from './aplicacion/casos-uso/subir-imagen.js';
import { ArchivosControlador } from './http/archivos.controlador.js';
import { rutasArchivos } from './http/archivos.rutas.js';
import { optimizadorDeImagenes as optimizador } from './infraestructura/documentos-protegidos.js';
import { RepositorioArchivosDrizzle } from './infraestructura/persistencia/repositorio-archivos.drizzle.js';

/** Raíz de composición del contexto de archivos. */
export function componerArchivos({ unidadDeTrabajo }: DependenciasCompartidas) {
  const repositorio = new RepositorioArchivosDrizzle();
  const controlador = new ArchivosControlador({
    subir: new SubirImagen({ unidadDeTrabajo, repositorio, almacenamiento, optimizador }),
    abrir: new AbrirImagen({ unidadDeTrabajo, repositorio, almacenamiento }),
  });
  return rutasArchivos(controlador);
}
