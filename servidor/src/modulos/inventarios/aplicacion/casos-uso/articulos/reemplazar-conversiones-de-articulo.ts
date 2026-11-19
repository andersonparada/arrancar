import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { validarConversiones } from '../../../dominio/conversion.js';
import type { ConversionDto, SolicitudDeConversiones } from '../../dto/conversion.dto.js';
import { articuloExistente, type DependenciasDeArticulos } from './dependencias-de-articulos.js';

interface NuevasConversiones {
  articuloId: string;
  solicitud: SolicitudDeConversiones;
}

const RECURSO = 'inventarios.conversiones';

/** Fija las conversiones del artículo («caja de 24»): las que faltan en la lista se quitan. */
export class ReemplazarConversionesDeArticulo {
  constructor(private readonly dependencias: DependenciasDeArticulos) {}

  /**
   * Cada conversión que se quita queda en la auditoría como estaba. Hoy no hay movimientos que las usen; con el
   * kardex (INV-4) el factor queda guardado en cada movimiento, así que quitar una no cambia el historial.
   * @throws RecursoNoEncontrado si el artículo o alguna unidad no existe o no es de la empresa.
   * @throws ConversionInvalida si repite una unidad, convierte la unidad base o tiene un factor que no es positivo.
   */
  ejecutar(operador: Operador, { articuloId, solicitud }: NuevasConversiones): Promise<ConversionDto[]> {
    const { unidadDeTrabajo, repositorio, conversiones, auditoria } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const articulo = await articuloExistente(repositorio, articuloId);
      validarConversiones(articulo.unidadBaseId, solicitud.conversiones);
      await conversiones.exigirUnidades(solicitud.conversiones.map((conversion) => conversion.unidadId));
      const anteriores = await conversiones.listar(articuloId);
      await conversiones.reemplazar(articuloId, operador.empresaId, solicitud.conversiones);
      const quedan = new Set(solicitud.conversiones.map((conversion) => conversion.unidadId));
      for (const anterior of anteriores.filter((conversion) => !quedan.has(conversion.unidadId)))
        await auditoria.registrar({ recurso: RECURSO, registroId: articuloId, accion: 'quitar', anterior });
      return conversiones.listar(articuloId);
    });
  }
}
