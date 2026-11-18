import type {
  CambioDelServidor,
  EntradaDeSoporte,
  ServidorDeCorreoRepositorio,
  ServidorGuardado,
} from '../aplicacion/puertos/servidor-de-correo-repositorio.js';
import type { ResultadoDeEnvio } from '../aplicacion/transporte-de-correo.js';

/** Repositorio en memoria: guarda lo que se le pide y anota las entradas de bitácora. */
export class ServidorDeCorreoEnMemoria implements ServidorDeCorreoRepositorio {
  guardado: ServidorGuardado | null = null;
  readonly bitacora: EntradaDeSoporte[] = [];

  async obtener(): Promise<ServidorGuardado | null> {
    return this.guardado;
  }

  async guardar({ datos, contrasena }: CambioDelServidor, entrada: EntradaDeSoporte): Promise<void> {
    this.guardado = {
      ultimaPruebaEn: null,
      ultimaPruebaResultado: null,
      ...this.guardado,
      ...datos,
      contrasena: contrasena ?? this.guardado?.contrasena ?? null,
      actualizadoEn: new Date(),
    };
    this.bitacora.push(entrada);
  }

  async registrarPrueba(resultado: ResultadoDeEnvio, entrada: EntradaDeSoporte): Promise<void> {
    if (this.guardado)
      this.guardado = { ...this.guardado, ultimaPruebaEn: new Date(), ultimaPruebaResultado: resultado };
    this.bitacora.push(entrada);
  }
}
