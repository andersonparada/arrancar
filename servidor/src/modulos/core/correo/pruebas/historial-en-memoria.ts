import type { OrigenDeCorreo } from '../aplicacion/bandeja-de-salida.js';
import type { CorreoDto, CorreoResumenDto, PaginaDeCorreosDto } from '../aplicacion/dto/correo.dto.js';
import type { Cancelacion, FiltroDeCorreos, HistorialDeCorreos } from '../aplicacion/puertos/historial-de-correos.js';

/** Un correo de prueba con lo mínimo; `cambios` pisa lo que haga falta. */
export function correoDePrueba(cambios: Partial<CorreoDto> = {}): CorreoDto {
  return {
    id: 'correo-1',
    tipo: 'cuentas-por-pagar.aviso_de_pago',
    origen: { recurso: 'cuentas-por-pagar.pagos', registroId: 'pago-1' },
    asunto: 'Aviso de pago',
    estado: 'pendiente',
    intentos: 0,
    destinatarios: [{ direccion: 'a@ejemplo.com', nombre: null, clase: 'para', resultado: null }],
    adjuntoNombre: null,
    creadoEn: new Date('2026-11-18T12:00:00Z'),
    proximoIntento: null,
    enviadoEn: null,
    canceladoEn: null,
    motivoDeCancelacion: null,
    nombreVisible: 'Empresa por medio de Arrancar',
    responderA: null,
    cuerpoTexto: 'Texto',
    contenidoDepurado: false,
    ...cambios,
  };
}

/** Guarda los correos en una lista; cancelar y reintentar respetan el estado como en la base. */
export class HistorialEnMemoria implements HistorialDeCorreos {
  constructor(public correos: CorreoDto[] = []) {}

  async listar(filtro: FiltroDeCorreos): Promise<PaginaDeCorreosDto> {
    const elementos = this.correos.filter((c) => !filtro.estado || c.estado === filtro.estado);
    return { elementos, total: elementos.length, pagina: filtro.pagina, limite: filtro.limite };
  }

  async buscar(id: string): Promise<CorreoDto | null> {
    return this.correos.find((c) => c.id === id) ?? null;
  }

  async deOrigen(origen: OrigenDeCorreo): Promise<CorreoResumenDto[]> {
    return this.correos.filter((c) => c.origen.recurso === origen.recurso && c.origen.registroId === origen.registroId);
  }

  async cancelar(id: string, { motivo }: Cancelacion): Promise<boolean> {
    const correo = this.correos.find((c) => c.id === id);
    if (!correo || correo.estado !== 'pendiente') return false;
    Object.assign(correo, { estado: 'cancelado', motivoDeCancelacion: motivo, canceladoEn: new Date() });
    return true;
  }

  async cancelarPendientesDe(origen: OrigenDeCorreo, cancelacion: Cancelacion): Promise<CorreoResumenDto[]> {
    const pendientes = (await this.deOrigen(origen)).filter((c) =>
      ['pendiente', 'enviando', 'fallido'].includes(c.estado),
    );
    const antes = pendientes.map((c) => ({ ...c }));
    for (const { id } of pendientes) {
      const correo = this.correos.find((c) => c.id === id);
      Object.assign(correo ?? {}, {
        estado: 'cancelado',
        motivoDeCancelacion: cancelacion.motivo,
        canceladoEn: new Date(),
      });
    }
    return antes;
  }

  async reintentar(id: string): Promise<boolean> {
    const correo = this.correos.find((c) => c.id === id);
    if (!correo || correo.estado !== 'fallido') return false;
    Object.assign(correo, { estado: 'pendiente', intentos: 0 });
    return true;
  }
}
