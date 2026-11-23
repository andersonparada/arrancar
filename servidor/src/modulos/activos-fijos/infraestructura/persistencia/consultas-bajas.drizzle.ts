import { and, asc, eq, isNull, lte, or, sql, type SQL } from 'drizzle-orm';
import { RecursoNoEncontrado } from '../../../core/compartido/aplicacion/errores.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { datosFiscalesDeEmpresa } from '../../../libro-de-compras/infraestructura/persistencia/datos-fiscales.tablas.js';
import { bajaADto } from '../../aplicacion/dto/baja-a-dto.js';
import type { BajaDto, ComponenteDeBajaDto } from '../../aplicacion/dto/baja.dto.js';
import type { ConsultasBajas } from '../../aplicacion/puertos/consultas-bajas.js';
import type { DatosParaLosAvisos } from '../../dominio/avisos-de-baja.js';
import { mapeadorDeBaja } from './baja.mapeador.js';
import { bajas } from './bajas.tablas.js';
import { activos } from './activos.tablas.js';
import { clases } from './clases.tablas.js';

type FilaDeBaja = typeof bajas.$inferSelect;

/** El tipo de persona de la empresa con la vigencia de la fecha de la baja; `null` si no hay datos fiscales. */
async function tipoDePersonaEn(fecha: string): Promise<DatosParaLosAvisos['tipoDePersona']> {
  const [fila] = await transaccionEnCurso()
    .select({ tipo: datosFiscalesDeEmpresa.tipoDePersona })
    .from(datosFiscalesDeEmpresa)
    .where(or(isNull(datosFiscalesDeEmpresa.vigenteDesde), lte(datosFiscalesDeEmpresa.vigenteDesde, fecha)))
    .orderBy(sql`${datosFiscalesDeEmpresa.vigenteDesde} desc nulls last`)
    .limit(1);
  return fila?.tipo === 'individual' || fila?.tipo === 'juridica' ? fila.tipo : null;
}

/** Los componentes que se dieron de baja junto con el activo: las bajas de su acta cuyo activo es hijo suyo. */
async function componentesDe(baja: FilaDeBaja): Promise<ComponenteDeBajaDto[]> {
  return transaccionEnCurso()
    .select({ activoId: activos.id, codigo: activos.codigo, descripcion: activos.descripcion })
    .from(bajas)
    .innerJoin(activos, eq(activos.id, bajas.activoId))
    .where(
      and(
        eq(bajas.numero, baja.numero),
        eq(bajas.anioDeNumero, baja.anioDeNumero),
        eq(bajas.estado, baja.estado),
        eq(activos.activoPadreId, baja.activoId),
      ),
    )
    .orderBy(asc(activos.codigo));
}

/** Lecturas de las bajas y ventas; la seguridad por empresa (RLS) limita lo que se ve. */
export class ConsultasBajasDrizzle implements ConsultasBajas {
  async obtener(bajaId: string): Promise<BajaDto> {
    const dto = await this.armar(eq(bajas.id, bajaId));
    if (!dto) throw new RecursoNoEncontrado('La baja');
    return dto;
  }

  deActivo(activoId: string): Promise<BajaDto | null> {
    return this.armar(and(eq(bajas.activoId, activoId), eq(bajas.estado, 'vigente')));
  }

  private async armar(donde: SQL | undefined): Promise<BajaDto | null> {
    const [fila] = await transaccionEnCurso()
      .select({ baja: bajas, activo: activos, claseNombre: clases.nombre, incisoFiscal: clases.incisoFiscal })
      .from(bajas)
      .innerJoin(activos, eq(activos.id, bajas.activoId))
      .innerJoin(clases, eq(clases.id, activos.claseId))
      .where(donde);
    if (!fila) return null;
    const { activo, baja } = fila;
    return bajaADto(mapeadorDeBaja.aEntidad(baja).instantanea(), {
      activo: {
        ...{ id: activo.id, codigo: activo.codigo, descripcion: activo.descripcion, cantidad: activo.cantidad },
        ...{ marca: activo.marca, modelo: activo.modelo, numeroDeSerie: activo.numeroDeSerie, placa: activo.placa },
        claseNombre: fila.claseNombre,
      },
      componentes: await componentesDe(baja),
      incisoFiscal: fila.incisoFiscal,
      tipoDePersona: await tipoDePersonaEn(baja.fecha),
    });
  }
}
