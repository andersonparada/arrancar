import type { Reintegro } from '../../../dominio/reintegros.js';
import { dtoDelReintegro, type EtiquetaDeNota } from '../../dto/dto-de-reintegros.js';
import type { MovimientoDelReintegroDto, ReintegroDto } from '../../dto/reintegros.dto.js';
import type { DependenciasDeReintegros } from './dependencias-de-reintegros.js';

type Dependencias = Pick<DependenciasDeReintegros, 'consultas' | 'lecturas' | 'movimientos'>;

/**
 * Arma el `ReintegroDto` de un reintegro ya guardado, vigente o anulado: sirve para auditarlo como estaba antes de
 * anularlo y para responder cómo quedó.
 */
export class LectorDelReintegro {
  constructor(private readonly dependencias: Dependencias) {}

  async leer(reintegro: Reintegro, avisos: readonly string[] = []): Promise<ReintegroDto> {
    const proveedor = await this.dependencias.lecturas.proveedor(reintegro.proveedorId);
    return dtoDelReintegro({
      reintegro,
      proveedor: { id: reintegro.proveedorId, nombre: proveedor?.nombre ?? '', nit: proveedor?.nit ?? null },
      etiquetas: await this.etiquetas(reintegro),
      movimiento: await this.movimiento(reintegro.movimientoId),
      avisos,
    });
  }

  private async etiquetas(reintegro: Reintegro): Promise<Map<string, EtiquetaDeNota>> {
    const etiquetas = new Map<string, EtiquetaDeNota>();
    for (const { notaId } of reintegro.notas) {
      const fila = await this.dependencias.consultas.buscar(notaId);
      if (fila) etiquetas.set(notaId, { serie: fila.documento.serie, numero: fila.documento.numero });
    }
    return etiquetas;
  }

  private async movimiento(movimientoId: string | null): Promise<MovimientoDelReintegroDto | null> {
    if (movimientoId === null) return null;
    const datos = await this.dependencias.movimientos.datosDe(movimientoId);
    if (!datos) return null;
    const nombre = await this.dependencias.lecturas.nombreDeLaCuenta(datos.cuentaBancariaId);
    return {
      id: movimientoId,
      cuentaBancariaId: datos.cuentaBancariaId,
      cuentaBancariaNombre: nombre ?? '',
      numero: datos.numero,
    };
  }
}
