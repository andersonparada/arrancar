import type { CorreoDto, CorreoResumenDto, DestinatarioDelCorreoDto } from '../../aplicacion/dto/correo.dto.js';
import type { ClaseDeDestinatario } from '../../dominio/destinatarios-de-correo.js';
import type { correosSalientes } from './correos-salientes.tablas.js';
import type { destinatariosDeCorreos } from './destinatarios-de-correos.tablas.js';

type FilaDeCorreo = typeof correosSalientes.$inferSelect;
type FilaDeDestinatario = typeof destinatariosDeCorreos.$inferSelect;

function aDestinatarioDto(fila: FilaDeDestinatario): DestinatarioDelCorreoDto {
  return {
    direccion: fila.direccion,
    nombre: fila.nombre,
    clase: fila.clase as ClaseDeDestinatario,
    resultado: fila.resultado as DestinatarioDelCorreoDto['resultado'],
  };
}

/** Agrupa los destinatarios por correo, con los «para» antes que las copias. */
export function agruparDestinatarios(filas: readonly FilaDeDestinatario[]): Map<string, DestinatarioDelCorreoDto[]> {
  const peso = (fila: FilaDeDestinatario) => (fila.clase === 'para' ? 0 : 1);
  const ordenadas = [...filas].sort((a, b) => peso(a) - peso(b) || a.direccion.localeCompare(b.direccion));
  const porCorreo = new Map<string, DestinatarioDelCorreoDto[]>();
  for (const fila of ordenadas) {
    const lista = porCorreo.get(fila.correoSalienteId) ?? [];
    lista.push(aDestinatarioDto(fila));
    porCorreo.set(fila.correoSalienteId, lista);
  }
  return porCorreo;
}

/** El resumen para listas y fichas; deja fuera el cuerpo, el código técnico del error y las huellas. */
export function aResumenDeCorreo(fila: FilaDeCorreo, destinatarios: DestinatarioDelCorreoDto[]): CorreoResumenDto {
  return {
    id: fila.id,
    tipo: fila.tipo,
    origen: { recurso: fila.recursoOrigen, registroId: fila.registroOrigenId },
    asunto: fila.asunto,
    estado: fila.estado,
    intentos: fila.intentos,
    destinatarios,
    adjuntoNombre: fila.adjuntoNombre,
    creadoEn: fila.creadoEn,
    proximoIntento: fila.estado === 'pendiente' ? fila.proximoIntento : null,
    enviadoEn: fila.enviadoEn,
    canceladoEn: fila.canceladoEn,
    motivoDeCancelacion: fila.motivoDeCancelacion,
  };
}

export function aCorreoDto(fila: FilaDeCorreo, destinatarios: DestinatarioDelCorreoDto[]): CorreoDto {
  return {
    ...aResumenDeCorreo(fila, destinatarios),
    nombreVisible: fila.nombreVisible,
    responderA: fila.responderA,
    cuerpoTexto: fila.cuerpoTexto,
    contenidoDepurado: fila.contenidoDepuradoEn !== null,
  };
}
