import type { Bitacora } from '../puertos/bitacora.js';

export interface EntradaDeSoporte {
  usuarioId: string;
  empresaId: string;
  direccionIp: string | null;
}

/** Deja constancia de que soporte entró a una empresa de la que no es miembro. */
export class RegistrarEntradaDeSoporte {
  constructor(private readonly dependencias: { bitacora: Bitacora }) {}

  ejecutar(entrada: EntradaDeSoporte): Promise<void> {
    return this.dependencias.bitacora.registrar({ ...entrada, accion: 'entrada_empresa' });
  }
}
