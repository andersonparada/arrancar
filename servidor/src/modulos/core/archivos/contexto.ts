import { configuracion } from '../../../configuracion.js';
import { bd } from '../base-datos/conexion.js';
import type { DependenciasCompartidas } from '../compartido/aplicacion/dependencias-compartidas.js';
import { almacenamiento } from '../compartido/infraestructura/almacenamiento-local.js';
import { AbrirImagen } from './aplicacion/casos-uso/abrir-imagen.js';
import { DepurarArchivosHuerfanos } from './aplicacion/casos-uso/depurar-archivos-huerfanos.js';
import { SubirImagen } from './aplicacion/casos-uso/subir-imagen.js';
import type { RegistroDeTexto } from './aplicacion/puertos/depuracion-de-archivos.js';
import { ArchivosControlador } from './http/archivos.controlador.js';
import { rutasArchivos } from './http/archivos.rutas.js';
import { optimizadorDeImagenes as optimizador } from './infraestructura/documentos-protegidos.js';
import { ExploradorDeArchivosLocal } from './infraestructura/explorador-de-archivos-local.js';
import { RegistroDeRutasDrizzle } from './infraestructura/persistencia/registro-de-rutas.drizzle.js';
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

/** Lo usa el servidor una vez al día: borra los archivos sueltos (sin fila) con más de 24 horas. */
export function crearDepuradorDeArchivosHuerfanos(registroDeTexto: RegistroDeTexto): DepurarArchivosHuerfanos {
  return new DepurarArchivosHuerfanos({
    explorador: new ExploradorDeArchivosLocal(configuracion.RUTA_ALMACENAMIENTO),
    registro: new RegistroDeRutasDrizzle(bd),
    registroDeTexto,
  });
}
