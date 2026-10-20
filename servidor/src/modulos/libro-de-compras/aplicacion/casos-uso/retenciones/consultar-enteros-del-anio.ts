import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { GRUPOS_DE_ENTERO, claveDelGrupo } from '../../../dominio/retenciones/grupo-de-entero.js';
import { resumenVacio, retenidoPorGrupo } from '../../../dominio/retenciones/retencion-del-reporte.js';
import type { MatrizDeEnterosDto } from '../../dto/retenciones.dto.js';
import type { ConsultasDeEnteros } from '../../puertos/puertos-de-retenciones.js';
import { armarGrupo, cargarContextoDePlazos, type DependenciasDePlazos } from './grupos-del-reporte.js';

interface Dependencias extends DependenciasDePlazos {
  unidadDeTrabajo: UnidadDeTrabajo;
  enteros: ConsultasDeEnteros;
}

const mesesDelAnio = (anio: number): string[] =>
  Array.from({ length: 12 }, (_, indice) => `${anio}-${String(indice + 1).padStart(2, '0')}-01`);

/** La matriz del año: por cada mes y grupo, lo retenido, el plazo, lo pagado y su estado. */
export class ConsultarEnterosDelAnio {
  constructor(private readonly dependencias: Dependencias) {}

  ejecutar(operador: Operador, anio: number): Promise<MatrizDeEnterosDto> {
    const { unidadDeTrabajo, enteros } = this.dependencias;
    const meses = mesesDelAnio(anio);
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const [desde, hasta] = [meses[0]!, meses[11]!];
      const retenido = retenidoPorGrupo(await enteros.retenidoDelRango(desde, hasta));
      const pagos = await enteros.delRango(desde, hasta);
      const contexto = await cargarContextoDePlazos(this.dependencias, operador, [anio]);
      const filas = meses.map((mes) => ({
        mes,
        grupos: GRUPOS_DE_ENTERO.map((grupo) => {
          const retenidoDelGrupo = retenido.get(claveDelGrupo(mes, grupo)) ?? 0;
          const resumen = { ...resumenVacio(mes, grupo), retenido: retenidoDelGrupo };
          return armarGrupo(contexto, { mes, grupo, resumen, pagos });
        }),
      }));
      return { anio, meses: filas };
    });
  }
}
