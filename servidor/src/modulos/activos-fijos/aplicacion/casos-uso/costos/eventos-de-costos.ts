import { ActivoCapitalizado, CostoAnulado } from '../../../dominio/eventos.js';
import type { Activo } from '../../../dominio/activo.js';
import type { Costo } from '../../../dominio/costo.js';
import type { IncisoFiscal } from '../../../dominio/incisos-fiscales.js';
import { periodoDe } from './dependencias-de-costos.js';

/** Quién es el activo para quien escucha: su clase, su inciso fiscal y dónde está. */
interface ContextoDelActivo {
  activo: Activo;
  incisoFiscal: IncisoFiscal;
}

function datosDelActivo({ activo, incisoFiscal }: ContextoDelActivo, hoy: string) {
  const { id, empresaId, claseId, localidadId, departamentoId } = activo.instantanea();
  return {
    empresaId: empresaId.valor,
    activoId: id.valor,
    claseId,
    incisoFiscal,
    localidadId,
    departamentoId,
    fecha: hoy,
    periodo: periodoDe(hoy),
  };
}

/** El evento de que un activo recibió costos (nuevo o existente). */
export function eventoDeCapitalizacion(contexto: ContextoDelActivo, costos: readonly Costo[], hoy: string) {
  return new ActivoCapitalizado({
    ...datosDelActivo(contexto, hoy),
    altaConjuntaId: contexto.activo.instantanea().altaConjuntaId,
    costos: costos.map((costo) => {
      const c = costo.instantanea();
      return {
        costoId: c.id.valor,
        origen: c.origen,
        claseDeCosto: c.claseDeCosto,
        documentoDeCompraId: c.documentoDeCompraId,
        lineaDeDocumentoId: c.lineaDeDocumentoId,
        montoCentavos: c.montoCentavos,
        aplicaAlLibroFiscal: c.aplicaAlLibroFiscal,
        noEsEdificacion: c.noEsEdificacion,
      };
    }),
  });
}

/** El evento de que se anuló un costo. */
export function eventoDeCostoAnulado(contexto: ContextoDelActivo, costo: Costo, hoy: string) {
  const { id, montoCentavos } = costo.instantanea();
  return new CostoAnulado({ ...datosDelActivo(contexto, hoy), costoId: id.valor, montoCentavos });
}
