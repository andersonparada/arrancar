import { aliasedTable, asc, eq } from 'drizzle-orm';
import { aCentavos } from '../../../core/compartido/dominio/centavos.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { usuarios } from '../../../core/identidad/infraestructura/persistencia/usuarios.tablas.js';
import type { AjusteConDatos } from '../../aplicacion/puertos/puertos-de-consultas.js';
import type { CausaDeAjuste } from '../../dominio/ajustes.js';
import { ajustesDeSaldo } from './ajustes-de-saldo.tablas.js';

const nombreDe = (nombres: string | null, apellidos: string | null): string | null =>
  nombres ? `${nombres} ${apellidos ?? ''}`.trim() : null;

type FilaDeAjuste = {
  ajuste: typeof ajustesDeSaldo.$inferSelect;
  autorNombres: string | null;
  autorApellidos: string | null;
  anuladorNombres: string | null;
  anuladorApellidos: string | null;
};

function aAjusteConDatos({ ajuste, ...nombres }: FilaDeAjuste): AjusteConDatos {
  return {
    id: ajuste.id,
    montoCentavos: aCentavos(ajuste.monto),
    fecha: ajuste.fecha,
    causa: ajuste.causa as CausaDeAjuste,
    motivo: ajuste.motivo,
    referencia: ajuste.referencia,
    estado: ajuste.estado as AjusteConDatos['estado'],
    creadoPorNombre: nombreDe(nombres.autorNombres, nombres.autorApellidos),
    creadoEn: ajuste.creadoEn.toISOString(),
    anulacion:
      ajuste.estado === 'anulado'
        ? {
            motivo: ajuste.motivoDeAnulacion ?? '',
            anuladoPorNombre: nombreDe(nombres.anuladorNombres, nombres.anuladorApellidos),
            anuladoEn: ajuste.anuladoEn?.toISOString() ?? null,
          }
        : null,
  };
}

/** Los ajustes de una nota, también los anulados, con el nombre de quien ajustó y de quien anuló. La tabla tiene RLS. */
export async function ajustesConDatos(documentoId: string): Promise<AjusteConDatos[]> {
  const anulador = aliasedTable(usuarios, 'anulador');
  const filas = await transaccionEnCurso()
    .select({
      ajuste: ajustesDeSaldo,
      autorNombres: usuarios.nombres,
      autorApellidos: usuarios.apellidos,
      anuladorNombres: anulador.nombres,
      anuladorApellidos: anulador.apellidos,
    })
    .from(ajustesDeSaldo)
    .leftJoin(usuarios, eq(usuarios.id, ajustesDeSaldo.creadoPor))
    .leftJoin(anulador, eq(anulador.id, ajustesDeSaldo.anuladoPor))
    .where(eq(ajustesDeSaldo.documentoId, documentoId))
    .orderBy(asc(ajustesDeSaldo.creadoEn));
  return filas.map(aAjusteConDatos);
}
