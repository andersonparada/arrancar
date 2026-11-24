import { and, desc, eq, lte } from 'drizzle-orm';
import { RecursoNoEncontrado } from '../../../core/compartido/aplicacion/errores.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { ValorDeInmuebleDto, ValoresVigentesDeInmueble } from '../../aplicacion/dto/valor-de-inmueble.dto.js';
import type { ConsultasValoresDeInmueble } from '../../aplicacion/puertos/valores-de-inmueble.js';
import { mapeadorDeValorDeInmueble } from './valor-de-inmueble.mapeador.js';
import { valoresDeInmueble } from './valores-de-inmueble.tablas.js';

export class ConsultasValoresDeInmuebleDrizzle implements ConsultasValoresDeInmueble {
  async listar(inmuebleId: string): Promise<ValorDeInmuebleDto[]> {
    const filas = await transaccionEnCurso()
      .select()
      .from(valoresDeInmueble)
      .where(eq(valoresDeInmueble.inmuebleId, inmuebleId))
      .orderBy(desc(valoresDeInmueble.vigenteDesde));
    return filas.map(mapeadorDeValorDeInmueble.aDto);
  }

  async obtener({ inmuebleId, valorId }: { inmuebleId: string; valorId: string }): Promise<ValorDeInmuebleDto> {
    const [fila] = await transaccionEnCurso()
      .select()
      .from(valoresDeInmueble)
      .where(and(eq(valoresDeInmueble.id, valorId), eq(valoresDeInmueble.inmuebleId, inmuebleId)));
    if (!fila) throw new RecursoNoEncontrado('El valor del inmueble');
    return mapeadorDeValorDeInmueble.aDto(fila);
  }

  /** El de mayor `vigente_desde <= fecha` de cada fuente, por inmueble. */
  async vigentes(fecha: string): Promise<Map<string, ValoresVigentesDeInmueble>> {
    const filas = await transaccionEnCurso()
      .selectDistinctOn([valoresDeInmueble.inmuebleId, valoresDeInmueble.fuente])
      .from(valoresDeInmueble)
      .where(lte(valoresDeInmueble.vigenteDesde, fecha))
      .orderBy(valoresDeInmueble.inmuebleId, valoresDeInmueble.fuente, desc(valoresDeInmueble.vigenteDesde));
    const vigentes = new Map<string, ValoresVigentesDeInmueble>();
    for (const fila of filas) {
      const actual = vigentes.get(fila.inmuebleId) ?? { matriculaFiscal: null, catastroMunicipal: null };
      const dto = mapeadorDeValorDeInmueble.aDto(fila);
      if (fila.fuente === 'matricula_fiscal') actual.matriculaFiscal = dto;
      else actual.catastroMunicipal = dto;
      vigentes.set(fila.inmuebleId, actual);
    }
    return vigentes;
  }
}
