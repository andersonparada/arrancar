import { and, desc, eq, getTableColumns, lte, type SQL } from 'drizzle-orm';
import { RecursoNoEncontrado } from '../../../core/compartido/aplicacion/errores.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { MedicionDto } from '../../aplicacion/dto/medicion.dto.js';
import type { ConsultasMediciones, SuperficieVigente } from '../../aplicacion/puertos/mediciones.js';
import { mapeadorDeMedicion } from './medicion.mapeador.js';
import { mediciones } from './mediciones.tablas.js';
import { parcelas } from './parcelas.tablas.js';

const vigentes = eq(mediciones.estado, 'vigente');

/** Las mediciones solo se leen unidas a su parcela: así el alcance por localidad también las protege. */
export class ConsultasMedicionesDrizzle implements ConsultasMediciones {
  async listar(parcelaId: string): Promise<MedicionDto[]> {
    const filas = await this.consulta()
      .where(eq(mediciones.parcelaId, parcelaId))
      .orderBy(desc(mediciones.vigenteDesde), desc(mediciones.creadoEn));
    return filas.map(mapeadorDeMedicion.aDto);
  }

  async superficieVigente(parcelaId: string): Promise<SuperficieVigente | null> {
    return this.ultimaSuperficie(and(eq(mediciones.parcelaId, parcelaId), vigentes));
  }

  async superficieEnFecha(parcelaId: string, fecha: string): Promise<SuperficieVigente | null> {
    return this.ultimaSuperficie(
      and(eq(mediciones.parcelaId, parcelaId), vigentes, lte(mediciones.vigenteDesde, fecha)),
    );
  }

  async hayVigentes(parcelaId: string): Promise<boolean> {
    const [fila] = await transaccionEnCurso()
      .select({ id: mediciones.id })
      .from(mediciones)
      .where(and(eq(mediciones.parcelaId, parcelaId), vigentes))
      .limit(1);
    return fila !== undefined;
  }

  async obtener(medicionId: string): Promise<MedicionDto> {
    const [fila] = await this.consulta().where(eq(mediciones.id, medicionId));
    if (!fila) throw new RecursoNoEncontrado('La medición');
    return mapeadorDeMedicion.aDto(fila);
  }

  async vigentesPorParcela(): Promise<Map<string, MedicionDto>> {
    const filas = await this.consulta().where(vigentes).orderBy(desc(mediciones.vigenteDesde));
    const porParcela = new Map<string, MedicionDto>();
    for (const fila of filas)
      if (!porParcela.has(fila.parcelaId)) porParcela.set(fila.parcelaId, mapeadorDeMedicion.aDto(fila));
    return porParcela;
  }

  private async ultimaSuperficie(condicion: SQL | undefined): Promise<SuperficieVigente | null> {
    const [fila] = await transaccionEnCurso()
      .select({ total: mediciones.superficieTotalM2, util: mediciones.superficieUtilM2 })
      .from(mediciones)
      .where(condicion)
      .orderBy(desc(mediciones.vigenteDesde))
      .limit(1);
    return fila ?? null;
  }

  private consulta() {
    return transaccionEnCurso()
      .select(getTableColumns(mediciones))
      .from(mediciones)
      .innerJoin(parcelas, eq(mediciones.parcelaId, parcelas.id));
  }
}
