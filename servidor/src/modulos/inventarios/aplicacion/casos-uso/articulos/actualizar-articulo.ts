import { auditarCambioDeEstado } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { validarConversiones } from '../../../dominio/conversion.js';
import { datosDeArticulo } from '../../datos-de-articulo.js';
import type { ArticuloDto, SolicitudDeArticulo } from '../../dto/articulo.dto.js';
import { articuloExistente, type DependenciasDeArticulos } from './dependencias-de-articulos.js';

interface CambioDeArticulo {
  articuloId: string;
  solicitud: SolicitudDeArticulo;
}

export class ActualizarArticulo {
  constructor(private readonly dependencias: DependenciasDeArticulos) {}

  /**
   * Inactivar y reactivar quedan en la auditoría. Si cambia la unidad base, las conversiones del artículo se
   * revisan con la nueva (INV-4 fija la unidad base una vez que hay movimientos).
   * @throws RecursoNoEncontrado si no existe o no es de la empresa.
   * @throws ConversionInvalida si la nueva unidad base ya es una de sus conversiones.
   */
  ejecutar(operador: Operador, { articuloId, solicitud }: CambioDeArticulo): Promise<ArticuloDto> {
    const { unidadDeTrabajo, repositorio, consultas, conversiones } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const articulo = await articuloExistente(repositorio, articuloId);
      await consultas.exigirReferencias(solicitud);
      const anterior = await consultas.obtener(articuloId);
      validarConversiones(solicitud.unidadBaseId, await conversiones.listar(articuloId));
      articulo.cambiarDatos(datosDeArticulo(solicitud));
      await repositorio.guardar(articulo);
      await auditarCambioDeEstado(this.dependencias.auditoria, {
        recurso: 'inventarios.articulos',
        registroId: articuloId,
        anterior,
        activoAntes: anterior.activo,
        activoDespues: solicitud.activo,
      });
      return consultas.obtener(articuloId);
    });
  }
}
