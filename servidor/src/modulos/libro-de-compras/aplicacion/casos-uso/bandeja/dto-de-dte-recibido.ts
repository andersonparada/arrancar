import type { DteRecibido } from '../../../dominio/dte-recibido.js';
import type { BorradorDeDteDto, DteRecibidoDto, PropuestaDeDteDto } from '../../dto/dte-recibido.dto.js';

type Identidad = Pick<DteRecibidoDto, 'id' | 'autorizacionFel' | 'tipoDte' | 'serie' | 'numero' | 'fechaEmision'>;
type Emisor = Pick<DteRecibidoDto, 'nitEmisor' | 'nombreEmisor' | 'nitReceptor'>;
type Montos = Pick<DteRecibidoDto, 'total' | 'iva' | 'idp' | 'otrosImpuestos' | 'otrosImpuestosDetalle'>;
type DeLaSat = Pick<DteRecibidoDto, 'estadoSat' | 'anuladoEnLaSatEl' | 'loteId'>;
type Situacion = Pick<
  DteRecibidoDto,
  'estado' | 'documentoId' | 'motivoDeDescarte' | 'descartadoEn' | 'motivoDeBloqueo'
>;

function identidad(dte: DteRecibido): Identidad {
  const { id, autorizacionFel, tipoDte, serie, numero, fechaEmision } = dte.instantanea();
  return { id: id.valor, autorizacionFel, tipoDte, serie, numero, fechaEmision };
}

function emisor(dte: DteRecibido): Emisor {
  const { nitEmisor, nombreEmisor, nitReceptor } = dte.instantanea();
  return { nitEmisor, nombreEmisor, nitReceptor };
}

function montos(dte: DteRecibido): Montos {
  const { total, iva, idp, otrosImpuestos, otrosImpuestosDetalle } = dte.instantanea();
  return { total, iva, idp, otrosImpuestos, otrosImpuestosDetalle };
}

function deLaSat(dte: DteRecibido): DeLaSat {
  const { estadoSat, anuladoEnLaSatEl, loteId } = dte.instantanea();
  return { estadoSat, anuladoEnLaSatEl, loteId };
}

function situacion(dte: DteRecibido): Situacion {
  const { estado, documentoId, motivoDeDescarte, descartadoEn, motivoDeBloqueo } = dte.instantanea();
  return { estado, documentoId, motivoDeDescarte, descartadoEn: descartadoEn?.toISOString() ?? null, motivoDeBloqueo };
}

function borrador(dte: DteRecibido): BorradorDeDteDto {
  const { proveedorId, conceptoId, destino, fechaRecepcion, periodo, noVinculado, documentoAfectadoId } =
    dte.instantanea();
  return { proveedorId, conceptoId, destino, fechaRecepcion, periodo, noVinculado, documentoAfectadoId };
}

/** La fila tal como la ve la pantalla (y como se audita: sin la fila original del archivo). */
export function dtoDeDteRecibido(dte: DteRecibido, propuesta: PropuestaDeDteDto | null = null): DteRecibidoDto {
  return {
    ...identidad(dte),
    ...emisor(dte),
    ...montos(dte),
    ...deLaSat(dte),
    ...situacion(dte),
    borrador: borrador(dte),
    propuesta,
  };
}
