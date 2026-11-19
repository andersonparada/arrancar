import type { Readable } from 'node:stream';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { SaldoInicialSinEvidencia } from '../../errores-de-estado-de-cuenta.js';
import { RECURSO_DE_SALDOS_INICIALES, type DependenciasDeSaldosIniciales } from './dependencias-de-saldos-iniciales.js';

/** El archivo listo para servirse, con un nombre armado por el servidor (nunca el que trajo el usuario). */
export interface EvidenciaAbierta {
  nombre: string;
  tipoMime: string;
  tamanoBytes: number;
  contenido: Readable;
}

const EXTENSIONES: Record<string, string> = { 'application/pdf': 'pdf', 'image/webp': 'webp' };

/** Abre la evidencia de la apertura de una cuenta; solo se llega a ella por aquí, con el permiso de ver. */
export class AbrirEvidenciaDeApertura {
  constructor(private readonly dependencias: DependenciasDeSaldosIniciales) {}

  /** @throws SaldoInicialSinEvidencia si no tiene archivo; RecursoNoEncontrado si la cuenta no es de la empresa. */
  ejecutar(operador: Operador, cuentaBancariaId: string): Promise<EvidenciaAbierta> {
    const { unidadDeTrabajo, consultas, documentos } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const archivoId = await consultas.archivoDeLaEvidencia(cuentaBancariaId);
      if (archivoId === null) throw new SaldoInicialSinEvidencia();
      const { tipoMime, tamanoBytes, contenido } = await documentos.abrir(archivoId, RECURSO_DE_SALDOS_INICIALES);
      const nombre = `evidencia-de-apertura.${EXTENSIONES[tipoMime] ?? 'bin'}`;
      return { nombre, tipoMime, tamanoBytes, contenido };
    });
  }
}
