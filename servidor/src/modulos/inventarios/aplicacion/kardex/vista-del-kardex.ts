import type { DocumentoDto, VistaDelKardex } from '../dto/documento.dto.js';
import type { ExistenciaDto } from '../dto/existencia.dto.js';

/** Sin el permiso de costos, el documento solo lleva cantidades (INV-A7): el servidor no manda lo que no se debe ver. */
export function documentoSegunLaVista(documento: DocumentoDto, vista: VistaDelKardex): DocumentoDto {
  if (vista.verCostos) return documento;
  return {
    ...documento,
    costoTotal: null,
    renglones: documento.renglones.map((renglon) => ({ ...renglon, costoUnitario: null, costoTotal: null })),
  };
}

export function existenciaSegunLaVista(existencia: ExistenciaDto, vista: VistaDelKardex): ExistenciaDto {
  return vista.verCostos ? existencia : { ...existencia, costoUnitario: null, valor: null };
}
