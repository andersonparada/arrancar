import type { Tercero } from '../dominio/tercero.js';
import { HayTercerosParecidos } from './errores.js';
import type { ConsultasTerceros } from './puertos/consultas.js';

/**
 * Evita registrar a alguien dos veces: detiene el guardado si hay otro tercero
 * con el mismo NIT, el mismo DPI o un nombre muy parecido, salvo que el usuario
 * ya lo haya confirmado.
 */
export class AvisoDeParecidos {
  constructor(private readonly consultas: ConsultasTerceros) {}

  async exigirQueNoHaya(tercero: Tercero, confirmado: boolean): Promise<void> {
    if (confirmado) return;
    const { id, nit, dpi } = tercero.instantanea();
    const parecidos = await this.consultas.buscarParecidos({
      nombreMostrar: tercero.nombreParaMostrar,
      nit: nit && !nit.esConsumidorFinal() ? nit.valor : null,
      dpi: dpi?.valor ?? null,
      excepto: id.valor,
    });
    if (parecidos.length > 0) throw new HayTercerosParecidos(parecidos);
  }
}
