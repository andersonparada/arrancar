import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { datosEditablesDe, inmueblesDe } from '../../datos-de-parcela.js';
import type { CambioDeParcela, FichaDeParcelaDto } from '../../dto/parcela.dto.js';
import { fichaDeParcela, parcelaExistente, type DependenciasDeParcelas } from './dependencias-de-parcelas.js';

interface ActualizacionDeParcela {
  parcelaId: string;
  solicitud: CambioDeParcela;
}

export class ActualizarParcela {
  constructor(private readonly dependencias: DependenciasDeParcelas) {}

  /**
   * Cambia los datos editables y los inmuebles ligados; la localidad, la madre y el código no se cambian. Quitar un
   * inmueble queda en la auditoría con la liga como estaba.
   * @throws RecursoNoEncontrado si no existe, el operador no la ve, o el tipo o un inmueble no existen.
   * @throws ParcelaInvalida si no cumple las reglas del dominio.
   */
  ejecutar(operador: Operador, { parcelaId, solicitud }: ActualizacionDeParcela): Promise<FichaDeParcelaDto> {
    const { unidadDeTrabajo, repositorio, consultas, ligas, auditoria } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const parcela = await parcelaExistente(repositorio, parcelaId);
      await consultas.exigirReferencias({ tipoId: solicitud.tipoId, inmuebleIds: inmueblesDe(solicitud) });
      parcela.cambiarDatos(datosEditablesDe(solicitud));
      await repositorio.guardar(parcela);
      const quitadas = await ligas.reemplazar({ empresaId: operador.empresaId, parcelaId }, solicitud.inmuebles);
      for (const liga of quitadas) {
        await auditoria.registrar({
          recurso: 'parcelas.parcelas',
          registroId: parcelaId,
          accion: 'quitar',
          anterior: liga,
        });
      }
      return fichaDeParcela(this.dependencias, parcelaId);
    });
  }
}
