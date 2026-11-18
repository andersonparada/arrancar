import type { Readable } from 'node:stream';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { SinBalanceDeApertura } from '../../errores-de-cierre.js';
import { RECURSO_DE_BALANCES_DE_APERTURA, type DependenciasDelBalanceDeApertura } from './dependencias.js';

/** El PDF listo para servirse, con un nombre armado por el servidor (nunca el que trajo quien lo subió). */
export interface BalanceDeAperturaAbierto {
  nombre: string;
  tipoMime: string;
  tamanoBytes: number;
  contenido: Readable;
}

/** Abre el balance de apertura; solo se llega a él por aquí, con el permiso de ver los cierres. */
export class AbrirBalanceDeApertura {
  constructor(private readonly dependencias: DependenciasDelBalanceDeApertura) {}

  /** @throws SinBalanceDeApertura si no hay balance (404); RecursoNoEncontrado si la empresa no es de la cuenta. */
  ejecutar(operador: Operador, empresaId: string): Promise<BalanceDeAperturaAbierto> {
    const { ejecutorEnEmpresa, consultas, documentos } = this.dependencias;
    return ejecutorEnEmpresa.ejecutar(operador, empresaId, async () => {
      const archivoId = await consultas.archivoDelBalanceDeApertura(empresaId);
      if (archivoId === null) throw new SinBalanceDeApertura();
      const { fechaDeInicio } = await consultas.cargaInicial(empresaId);
      const { tipoMime, tamanoBytes, contenido } = await documentos.abrir(archivoId, RECURSO_DE_BALANCES_DE_APERTURA);
      return { nombre: `balance-de-apertura-${fechaDeInicio}.pdf`, tipoMime, tamanoBytes, contenido };
    });
  }
}
