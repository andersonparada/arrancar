import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { FilaDeMetodoDto, PoliticaDeCosteoDto } from '../../dto/metodo-de-costeo.dto.js';
import { metodoDelDia } from '../../kardex/metodo-de-la-empresa.js';
import type { MetodoGuardado } from '../../puertos/repositorio-de-metodos.js';
import type { DependenciasDeMetodo } from './dependencias-de-metodo.js';

const aFila = (fila: MetodoGuardado): FilaDeMetodoDto => ({
  id: fila.id,
  metodo: fila.metodo,
  desde: fila.desde,
  fijado: fila.fijadoEn !== null,
  autorizacionSatNumero: fila.autorizacionSatNumero,
  autorizacionSatFecha: fila.autorizacionSatFecha,
  motivo: fila.motivo,
});

export class ObtenerPoliticaDeCosteo {
  constructor(private readonly dependencias: DependenciasDeMetodo) {}

  /** El método que rige hoy y su historia; si nadie lo eligió, la propuesta de la configuración. */
  ejecutar(operador: Operador): Promise<PoliticaDeCosteoDto> {
    const { unidadDeTrabajo, metodos, metodoInicial, reloj } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const historia = await metodos.listar();
      const vigente = metodoDelDia(historia, await reloj.hoy(operador));
      return {
        elegido: vigente !== null,
        fijado: historia.some((fila) => fila.fijadoEn !== null),
        metodo: vigente?.metodo ?? (await metodoInicial.paraEmpresa(operador)),
        historia: historia.map(aFila),
      };
    });
  }
}
