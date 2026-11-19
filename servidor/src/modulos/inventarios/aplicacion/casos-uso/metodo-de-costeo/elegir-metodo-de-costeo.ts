import { randomUUID } from 'node:crypto';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { MetodoFijado } from '../../../dominio/errores-de-kardex.js';
import type { MetodoDeCosteo } from '../../../dominio/costeo/tipos.js';
import type { PoliticaDeCosteoDto } from '../../dto/metodo-de-costeo.dto.js';
import { DESDE_DEL_PRIMER_METODO } from '../../kardex/metodo-de-la-empresa.js';
import type { MetodoGuardado } from '../../puertos/repositorio-de-metodos.js';
import type { DependenciasDeMetodo } from './dependencias-de-metodo.js';
import { ObtenerPoliticaDeCosteo } from './obtener-politica-de-costeo.js';

const nuevaFila = (metodo: MetodoDeCosteo): MetodoGuardado => ({
  id: randomUUID(),
  metodo,
  desde: DESDE_DEL_PRIMER_METODO,
  fijadoEn: null,
  autorizacionSatNumero: null,
  autorizacionSatFecha: null,
  motivo: null,
});

export class ElegirMetodoDeCosteo {
  constructor(private readonly dependencias: DependenciasDeMetodo) {}

  /**
   * Elige el método de costeo de la empresa (§3.3) **antes del primer movimiento**: promedio ponderado o PEPS. Mientras
   * ningún movimiento lo use, se puede volver a elegir (queda en la auditoría con la fila anterior); desde el primer
   * movimiento solo se cambia con la autorización de la SAT.
   * @throws MetodoFijado si un movimiento ya lo usó.
   */
  async ejecutar(operador: Operador, metodo: MetodoDeCosteo): Promise<PoliticaDeCosteoDto> {
    const { unidadDeTrabajo, metodos, auditoria } = this.dependencias;
    await unidadDeTrabajo.ejecutar(operador, async () => {
      const historia = await metodos.listar();
      if (historia.some((fila) => fila.fijadoEn !== null)) throw new MetodoFijado();
      const actual = historia[0];
      if (!actual) return metodos.agregar(nuevaFila(metodo));
      if (actual.metodo === metodo) return;
      await metodos.cambiar(actual.id, metodo);
      await auditoria.registrar({
        recurso: 'inventarios.metodos-de-costeo',
        registroId: actual.id,
        accion: 'corregir',
        anterior: actual,
      });
    });
    return new ObtenerPoliticaDeCosteo(this.dependencias).ejecutar(operador);
  }
}
