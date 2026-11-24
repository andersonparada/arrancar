import type { Readable } from 'node:stream';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { BoletaSinFirmada } from '../../errores-de-boleta-firmada.js';
import { RECURSO_DE_TRASLADOS, type DependenciasDeBoletaFirmada } from './dependencias-de-boleta-firmada.js';

/** El archivo listo para servirse, con un nombre armado por el servidor (nunca el que trajo el usuario). */
export interface BoletaFirmadaAbierta {
  nombre: string;
  tipoMime: string;
  tamanoBytes: number;
  contenido: Readable;
}

const EXTENSIONES: Record<string, string> = { 'application/pdf': 'pdf', 'image/webp': 'webp' };

/** Abre el escaneo firmado de una boleta (también la anulada); solo se llega a él por aquí, con el permiso de ver. */
export class AbrirBoletaFirmada {
  constructor(private readonly dependencias: DependenciasDeBoletaFirmada) {}

  /** @throws BoletaSinFirmada si todavía no tiene archivo o la boleta no es de la empresa (404). */
  ejecutar(operador: Operador, grupoId: string): Promise<BoletaFirmadaAbierta> {
    const { unidadDeTrabajo, boletasFirmadas, documentos } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const archivoId = await boletasFirmadas.archivoDe(grupoId);
      if (archivoId === null) throw new BoletaSinFirmada();
      const { tipoMime, tamanoBytes, contenido } = await documentos.abrir(archivoId, RECURSO_DE_TRASLADOS);
      const nombre = `boleta-firmada.${EXTENSIONES[tipoMime] ?? 'bin'}`;
      return { nombre, tipoMime, tamanoBytes, contenido };
    });
  }
}
