import type { ArchivoDescargado } from '../servicios/cliente-http';

/** Hace que el navegador guarde el archivo, como si se hubiera tocado un enlace de descarga. */
export function guardarArchivo({ contenido, nombre }: ArchivoDescargado): void {
  const direccion = URL.createObjectURL(contenido);
  const enlace = document.createElement('a');
  enlace.href = direccion;
  enlace.download = nombre;
  enlace.click();
  URL.revokeObjectURL(direccion);
}
