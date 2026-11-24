import { and, asc, count, eq, getTableColumns, ilike, or, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { RecursoNoEncontrado } from '../../../core/compartido/aplicacion/errores.js';
import { exigirQueExista } from '../../../core/compartido/infraestructura/exigir-que-exista.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { inmuebles } from '../../../empresas/infraestructura/persistencia/inmuebles.tablas.js';
import { localidades } from '../../../empresas/infraestructura/persistencia/localidades.tablas.js';
import type { FiltrosDeParcelas, ParcelaDto } from '../../aplicacion/dto/parcela.dto.js';
import type { ConsultasParcelas, ReferenciasDeParcela } from '../../aplicacion/puertos/consultas-parcelas.js';
import { mapeadorDeParcela } from './parcela.mapeador.js';
import { parcelas } from './parcelas.tablas.js';
import { tiposDeParcela } from './tipos-de-parcela.tablas.js';

const madre = alias(parcelas, 'madre');

const columnas = {
  ...getTableColumns(parcelas),
  localidadNombre: localidades.nombre,
  tipoNombre: tiposDeParcela.nombre,
  parcelaMadreCodigo: madre.codigo,
};

/** Los escapes de LIKE, para que `%` y `_` escritos por el usuario sean letras normales. */
const comoTexto = (texto: string) => `%${texto.replace(/[\\%_]/g, '\\$&')}%`;

function condicionesDe(filtros: FiltrosDeParcelas): SQL[] {
  const condiciones: Array<SQL | undefined> = [
    filtros.localidadId ? eq(parcelas.localidadId, filtros.localidadId) : undefined,
    filtros.parcelaMadreId ? eq(parcelas.parcelaMadreId, filtros.parcelaMadreId) : undefined,
    filtros.tipoId ? eq(parcelas.tipoId, filtros.tipoId) : undefined,
    filtros.formaDeTenencia ? eq(parcelas.formaDeTenencia, filtros.formaDeTenencia) : undefined,
    filtros.soloActivas ? eq(parcelas.activo, true) : undefined,
    filtros.texto
      ? or(ilike(parcelas.codigo, comoTexto(filtros.texto)), ilike(parcelas.nombre, comoTexto(filtros.texto)))
      : undefined,
  ];
  return condiciones.filter((condicion): condicion is SQL => condicion !== undefined);
}

export class ConsultasParcelasDrizzle implements ConsultasParcelas {
  async listar(filtros: FiltrosDeParcelas): Promise<ParcelaDto[]> {
    const filas = await this.consulta()
      .where(and(...condicionesDe(filtros)))
      .orderBy(asc(localidades.nombre), asc(parcelas.nivel), asc(parcelas.codigo));
    return filas.map(mapeadorDeParcela.aDto);
  }

  async obtener(parcelaId: string): Promise<ParcelaDto> {
    const [fila] = await this.consulta().where(eq(parcelas.id, parcelaId));
    if (!fila) throw new RecursoNoEncontrado('La parcela');
    return mapeadorDeParcela.aDto(fila);
  }

  async contarHijasActivas(parcelaId: string): Promise<number> {
    return this.contarHijasDe(parcelaId, eq(parcelas.activo, true));
  }

  async contarHijas(parcelaId: string): Promise<number> {
    return this.contarHijasDe(parcelaId);
  }

  async buscarIdPorCodigo(codigo: string): Promise<string | null> {
    const [fila] = await transaccionEnCurso()
      .select({ id: parcelas.id })
      .from(parcelas)
      .where(eq(parcelas.codigo, codigo));
    return fila?.id ?? null;
  }

  async inmueblesPorNombre(): Promise<Array<{ id: string; nombre: string }>> {
    return transaccionEnCurso().select({ id: inmuebles.id, nombre: inmuebles.nombre }).from(inmuebles);
  }

  async localidadEstaActiva(localidadId: string): Promise<boolean> {
    const [fila] = await transaccionEnCurso()
      .select({ activo: localidades.activo })
      .from(localidades)
      .where(eq(localidades.id, localidadId));
    return fila?.activo ?? false;
  }

  /** Lo elegido debe existir y ser de la empresa: la seguridad por filas oculta lo ajeno. */
  async exigirReferencias({ localidadId, tipoId, inmuebleIds }: ReferenciasDeParcela): Promise<void> {
    await exigirQueExista(localidades, localidadId ?? null, 'La localidad');
    await exigirQueExista(tiposDeParcela, tipoId, 'El tipo de parcela');
    for (const inmuebleId of inmuebleIds) await exigirQueExista(inmuebles, inmuebleId, 'El inmueble');
  }

  private async contarHijasDe(parcelaId: string, ...otras: SQL[]): Promise<number> {
    const [fila] = await transaccionEnCurso()
      .select({ cantidad: count() })
      .from(parcelas)
      .where(and(eq(parcelas.parcelaMadreId, parcelaId), ...otras));
    return fila?.cantidad ?? 0;
  }

  private consulta() {
    return transaccionEnCurso()
      .select(columnas)
      .from(parcelas)
      .innerJoin(localidades, eq(parcelas.localidadId, localidades.id))
      .innerJoin(tiposDeParcela, eq(parcelas.tipoId, tiposDeParcela.id))
      .leftJoin(madre, eq(parcelas.parcelaMadreId, madre.id));
  }
}
