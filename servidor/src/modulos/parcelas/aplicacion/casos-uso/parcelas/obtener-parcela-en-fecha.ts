import type { ConsultasParcelas } from '../../puertos/consultas-parcelas.js';
import type { ConsultasMediciones } from '../../puertos/mediciones.js';

/** Cómo es una parcela en una fecha, para las reglas de los módulos de rubro (carga animal, área sembrada). */
export interface ParcelaEnFecha {
  codigo: string;
  nombre: string;
  localidadId: string;
  nivel: number;
  activa: boolean;
  superficieTotalM2: string | null;
  superficieUtilM2: string | null;
  uso: string | null;
  detalleDeUso: string | null;
  formaDeTenencia: string;
  cedidaATerceros: boolean;
}

/**
 * La parcela con la superficie que regía en la fecha. Corre dentro de la transacción de quien pregunta (mediador), así que no abre
 * otra. El uso sale de los períodos de uso (paso PA-2): hasta entonces no hay uso y la parcela no está cedida.
 */
export class ObtenerParcelaEnFecha {
  constructor(
    private readonly dependencias: {
      consultas: Pick<ConsultasParcelas, 'obtener'>;
      consultasDeMediciones: Pick<ConsultasMediciones, 'superficieEnFecha'>;
    },
  ) {}

  /** @throws RecursoNoEncontrado si no existe o el operador no la ve. */
  async ejecutar(datos: { parcelaId: string; fecha: string }): Promise<ParcelaEnFecha> {
    const parcela = await this.dependencias.consultas.obtener(datos.parcelaId);
    const superficie = await this.dependencias.consultasDeMediciones.superficieEnFecha(datos.parcelaId, datos.fecha);
    return {
      codigo: parcela.codigo,
      nombre: parcela.nombre,
      localidadId: parcela.localidadId,
      nivel: parcela.nivel,
      activa: parcela.activo,
      superficieTotalM2: superficie?.total ?? null,
      superficieUtilM2: superficie?.util ?? null,
      uso: null,
      detalleDeUso: null,
      formaDeTenencia: parcela.formaDeTenencia,
      cedidaATerceros: false,
    };
  }
}
