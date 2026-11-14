import type { Readable } from 'node:stream';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { ConciliacionSinEstadoDeCuenta } from '../../errores-de-estado-de-cuenta.js';
import {
  conciliacionExistente,
  RECURSO_DE_ESTADOS_DE_CUENTA,
  type DependenciasDeConciliaciones,
} from './dependencias-de-conciliaciones.js';

/** El archivo listo para servirse, con un nombre armado por el servidor (nunca el que trajo el usuario). */
export interface EstadoDeCuentaAbierto {
  nombre: string;
  tipoMime: string;
  tamanoBytes: number;
  contenido: Readable;
}

const EXTENSIONES: Record<string, string> = { 'application/pdf': 'pdf', 'image/webp': 'webp' };

/** Abre el estado de cuenta de una conciliación; solo se llega a él por aquí, con el permiso de ver. */
export class AbrirEstadoDeCuenta {
  constructor(private readonly dependencias: DependenciasDeConciliaciones) {}

  /** @throws ConciliacionSinEstadoDeCuenta si no tiene archivo; RecursoNoEncontrado si no existe o es de otra empresa. */
  ejecutar(operador: Operador, conciliacionId: string): Promise<EstadoDeCuentaAbierto> {
    const { unidadDeTrabajo, repositorio, documentos } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const conciliacion = await conciliacionExistente(repositorio, conciliacionId);
      const { estadoDeCuentaArchivoId, anio, mes } = conciliacion.instantanea();
      if (estadoDeCuentaArchivoId === null) throw new ConciliacionSinEstadoDeCuenta();
      const archivo = await documentos.abrir(estadoDeCuentaArchivoId, RECURSO_DE_ESTADOS_DE_CUENTA);
      const { tipoMime, tamanoBytes, contenido } = archivo;
      const extension = EXTENSIONES[tipoMime] ?? 'bin';
      const nombre = `estado-de-cuenta-${anio}-${String(mes).padStart(2, '0')}.${extension}`;
      return { nombre, tipoMime, tamanoBytes, contenido };
    });
  }
}
