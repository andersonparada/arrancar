import type { EnlaceConLaBandeja } from '../../puertos/puertos-de-la-bandeja.js';
import type { RepositorioDeDteRecibidos } from '../../puertos/repositorio-de-dte-recibidos.js';

/**
 * Lo que une la bandeja con el registro a mano. Registrar un documento con FEL pasa a `registrado` la fila con esa
 * autorización (también una descartada o bloqueada: el usuario decidió registrarla); anular o eliminar el documento la
 * devuelve a `pendiente`. Quien nunca importa no paga nada: no hay fila que enlazar. Corre dentro de la transacción del
 * documento, con la fila bloqueada.
 */
export class EnlaceDeLaBandeja implements EnlaceConLaBandeja {
  constructor(private readonly filas: RepositorioDeDteRecibidos) {}

  async enlazar(autorizacionFel: string, documentoId: string): Promise<void> {
    const fila = await this.filas.buscarPorAutorizacion(autorizacionFel, true);
    if (!fila || fila.estado === 'registrado') return;
    fila.registrar(documentoId);
    await this.filas.guardar(fila);
  }

  async soltar(documentoId: string): Promise<void> {
    const fila = await this.filas.buscarPorDocumento(documentoId, true);
    if (!fila) return;
    fila.devolverAPendiente();
    await this.filas.guardar(fila);
  }
}
