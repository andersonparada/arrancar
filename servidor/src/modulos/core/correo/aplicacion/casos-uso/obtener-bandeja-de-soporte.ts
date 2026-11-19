import { ESTADOS_DE_CORREO, type EstadoDeCorreo } from '../../dominio/estado-de-correo.js';
import type { BandejaDeSoporteDto } from '../dto/bandeja-de-soporte.dto.js';
import type { ConteoPorEstado, EstadoDeLaBandeja } from '../puertos/estado-de-la-bandeja.js';

/** Cuántos fallidos recientes muestra el panel. */
export const FALLIDOS_EN_EL_PANEL = 50;

/** El estado global de la bandeja para el panel de Soporte. */
export class ObtenerBandejaDeSoporte {
  constructor(private readonly estado: EstadoDeLaBandeja) {}

  async ejecutar(): Promise<BandejaDeSoporteDto> {
    const [conteos, fallidosRecientes] = await Promise.all([
      this.estado.conteos(),
      this.estado.fallidosRecientes(FALLIDOS_EN_EL_PANEL),
    ]);
    return {
      conteos: conteosCompletos(conteos),
      pendienteMasAntiguoDesde: masAntiguoPendiente(conteos),
      fallidosRecientes,
    };
  }
}

function conteosCompletos(conteos: readonly ConteoPorEstado[]): Record<EstadoDeCorreo, number> {
  const todos = Object.fromEntries(ESTADOS_DE_CORREO.map((estado) => [estado, 0])) as Record<EstadoDeCorreo, number>;
  for (const { estado, total } of conteos) todos[estado] = total;
  return todos;
}

function masAntiguoPendiente(conteos: readonly ConteoPorEstado[]): Date | null {
  return conteos.find((conteo) => conteo.estado === 'pendiente')?.masAntiguo ?? null;
}
