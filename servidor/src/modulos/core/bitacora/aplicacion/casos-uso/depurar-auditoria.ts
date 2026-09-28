import { DESTINO_INSTALACION } from '../../../configuracion/dominio/destino.js';
import type { DepuradorDeAuditoria } from '../puertos/depurador-de-auditoria.js';

/** Variable de instalación: cuántos meses se conserva la auditoría. */
export const MESES_DE_AUDITORIA = 'core.auditoria.meses_de_conservacion';

interface Dependencias {
  depurador: DepuradorDeAuditoria;
  configuracion: { obtener<Valor>(clave: string, destino: typeof DESTINO_INSTALACION): Promise<Valor> };
}

/** Borra la auditoría más vieja que lo que dice la instalación; el servidor lo hace una vez al día. */
export class DepurarAuditoria {
  constructor(private readonly dependencias: Dependencias) {}

  /** @returns cuántas entradas se borraron. */
  async ejecutar(): Promise<number> {
    const meses = await this.dependencias.configuracion.obtener<number>(MESES_DE_AUDITORIA, DESTINO_INSTALACION);
    return this.dependencias.depurador.borrarAnterioresA(meses);
  }
}
