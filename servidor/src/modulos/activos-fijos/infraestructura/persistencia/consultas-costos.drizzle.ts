import { asc, eq, type SQL } from 'drizzle-orm';
import { RecursoNoEncontrado } from '../../../core/compartido/aplicacion/errores.js';
import { aCentavos, deCentavos } from '../../../core/compartido/dominio/centavos.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { documentos } from '../../../libro-de-compras/infraestructura/persistencia/documentos.tablas.js';
import type { CostoDto, CostosDeActivoDto } from '../../aplicacion/dto/costo.dto.js';
import type { ConsultasCostos } from '../../aplicacion/puertos/consultas-costos.js';
import { costos } from './costos.tablas.js';

const columnas = {
  id: costos.id,
  activoId: costos.activoId,
  origen: costos.origen,
  claseDeCosto: costos.claseDeCosto,
  documentoDeCompraId: costos.documentoDeCompraId,
  lineaDeDocumentoId: costos.lineaDeDocumentoId,
  mejoraId: costos.mejoraId,
  serie: documentos.serie,
  numero: documentos.numero,
  proveedorNombre: documentos.nombreEmisor,
  fecha: costos.fecha,
  monto: costos.monto,
  aplicaAlLibroFiscal: costos.aplicaAlLibroFiscal,
  motivoFueraDelLibroFiscal: costos.motivoFueraDelLibroFiscal,
  noEsEdificacion: costos.noEsEdificacion,
  documentoDeSoporte: costos.documentoDeSoporte,
  descripcion: costos.descripcion,
  estado: costos.estado,
  anuladoEn: costos.anuladoEn,
  motivoDeAnulacion: costos.motivoDeAnulacion,
};

type Fila = Awaited<ReturnType<ConsultasCostosDrizzle['filas']>>[number];

function aDto({ serie, numero, anuladoEn, ...fila }: Fila): CostoDto {
  return {
    ...fila,
    documento: numero === null ? null : serie ? `${serie}-${numero}` : numero,
    anuladoEn: anuladoEn?.toISOString() ?? null,
  };
}

/** Lecturas de los costos; las filas de línea del libro traen su documento y su proveedor. */
export class ConsultasCostosDrizzle implements ConsultasCostos {
  async deActivo(activoId: string): Promise<CostosDeActivoDto> {
    const filas = await this.filas(eq(costos.activoId, activoId));
    const total = filas.filter((fila) => fila.estado === 'vigente').reduce((suma, f) => suma + aCentavos(f.monto), 0);
    return { costos: filas.map(aDto), total: deCentavos(total) };
  }

  async obtener(costoId: string): Promise<CostoDto> {
    const [fila] = await this.filas(eq(costos.id, costoId));
    if (!fila) throw new RecursoNoEncontrado('El costo');
    return aDto(fila);
  }

  async filas(donde: SQL) {
    return transaccionEnCurso()
      .select(columnas)
      .from(costos)
      .leftJoin(documentos, eq(documentos.id, costos.documentoDeCompraId))
      .where(donde)
      .orderBy(asc(costos.fecha), asc(costos.creadoEn));
  }
}
