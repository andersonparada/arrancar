import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import type { CorreoResumen } from '@/modulos/core/servicios/correos.api';
import type { AvisoDePago, DestinatarioPosible } from '../../servicios/tipos-de-avisos-de-pago';
import {
  AVISO_DEL_PDF,
  MAXIMO_DE_DESTINATARIOS,
  alternarDestinatario,
  edicionAbierta,
  edicionCerrada,
  estadoDelUltimoAviso,
  hayQueAvisarLaAnulacion,
  llaveDe,
  sePuedeEnviarLaEdicion,
  solicitudDeAviso,
  textoDelBotonDeAviso,
} from './aviso-de-pago';

beforeEach(() => setActivePinia(createPinia()));

const posible = (cambios: Partial<DestinatarioPosible> = {}): DestinatarioPosible => ({
  origen: 'contacto',
  origenId: 'c-1',
  nombre: 'Ana',
  direccion: 'ana@proveedor.com',
  utilizable: true,
  motivo: null,
  preseleccionado: true,
  ...cambios,
});

const correo = (cambios: Partial<CorreoResumen> = {}): CorreoResumen => ({
  id: 'k-1',
  tipo: 'cuentas-por-pagar.aviso_de_pago',
  origen: { recurso: 'cuentas-por-pagar.pagos', registroId: 'p-1' },
  asunto: 'Aviso de pago 1',
  estado: 'pendiente',
  intentos: 0,
  destinatarios: [{ direccion: 'ana@proveedor.com', nombre: null, clase: 'para', resultado: null }],
  adjuntoNombre: null,
  creadoEn: '2026-11-18T12:00:00Z',
  proximoIntento: null,
  enviadoEn: null,
  canceladoEn: null,
  motivoDeCancelacion: null,
  ...cambios,
});

const aviso = (cambios: Partial<AvisoDePago> = {}): AvisoDePago => ({
  envio: 'manual',
  posibles: [
    posible(),
    posible({ origenId: 'c-2', nombre: 'Beto', direccion: 'beto@proveedor.com', preseleccionado: false }),
    posible({
      origenId: 'c-3',
      nombre: 'Rara',
      direccion: 'dó@proveedor.com',
      utilizable: false,
      preseleccionado: false,
    }),
  ],
  copiaALaEmpresa: 'pagos@rancho.com',
  copiaPorOmision: true,
  vistaPrevia: { asunto: 'Aviso', mensaje: 'Hola', adjuntoNombre: 'comprobante-de-pago-1.pdf' },
  enviados: [],
  sePuedeEnviar: true,
  motivoSinAviso: null,
  ...cambios,
});

describe('lo que avisa la ventana sobre el PDF', () => {
  it('dice qué datos lleva y que las notas internas no van', () => {
    expect(AVISO_DEL_PDF).toMatch(/montos, NIT, retenciones/);
    expect(AVISO_DEL_PDF).toMatch(/No lleva la referencia, el motivo ni las observaciones internas/);
  });
});

describe('la ventana de enviar el aviso', () => {
  it('se abre con los preseleccionados marcados y la copia que dice la configuración', () => {
    const edicion = edicionAbierta(aviso());

    expect(edicion).toEqual({ abierta: true, marcados: ['contacto:c-1'], conCopia: true });
  });

  it('sin correo de la empresa no marca la copia, aunque la configuración la pida', () => {
    expect(edicionAbierta(aviso({ copiaALaEmpresa: null })).conCopia).toBe(false);
    expect(edicionAbierta(aviso({ copiaPorOmision: false })).conCopia).toBe(false);
  });

  it('un correo que no sirve nunca queda marcado de entrada', () => {
    const conRara = aviso({ posibles: [posible({ utilizable: false })] });

    expect(edicionAbierta(conRara).marcados).toEqual([]);
  });

  it('marca y desmarca destinatarios', () => {
    const [ana, beto] = aviso().posibles as [DestinatarioPosible, DestinatarioPosible];
    const inicial = edicionAbierta(aviso());

    const con = alternarDestinatario(inicial, beto);
    const sin = alternarDestinatario(con, ana);

    expect(con.marcados).toEqual(['contacto:c-1', 'contacto:c-2']);
    expect(sin.marcados).toEqual(['contacto:c-2']);
    expect(inicial.marcados).toEqual(['contacto:c-1']);
  });

  it('se envía con al menos uno y sin pasar de diez', () => {
    const marcados = Array.from({ length: MAXIMO_DE_DESTINATARIOS + 1 }, (_, i) => `contacto:${i}`);

    expect(sePuedeEnviarLaEdicion({ ...edicionCerrada(), marcados: [] })).toBe(false);
    expect(sePuedeEnviarLaEdicion({ ...edicionCerrada(), marcados: ['contacto:c-1'] })).toBe(true);
    expect(sePuedeEnviarLaEdicion({ ...edicionCerrada(), marcados })).toBe(false);
  });

  it('manda solo ids de los marcados (nunca direcciones) y la copia solo si hay correo de la empresa', () => {
    const edicion = { ...edicionAbierta(aviso()), marcados: [llaveDe(posible({ origenId: 'c-2' }))] };

    const solicitud = solicitudDeAviso(edicion, aviso());

    expect(solicitud).toEqual({ destinatarios: [{ origen: 'contacto', origenId: 'c-2' }], copiaALaEmpresa: true });
    expect(JSON.stringify(solicitud)).not.toContain('@');
    expect(solicitudDeAviso(edicion, aviso({ copiaALaEmpresa: null })).copiaALaEmpresa).toBe(false);
  });
});

describe('estado del aviso en la ficha', () => {
  it('sin avisos dice «Sin aviso»', () => {
    expect(estadoDelUltimoAviso([])).toBe('Sin aviso');
  });

  it('describe el último según su estado', () => {
    expect(estadoDelUltimoAviso([correo()])).toBe('Pendiente');
    expect(estadoDelUltimoAviso([correo({ intentos: 1 })])).toBe('No se pudo enviar; se reintentará');
    expect(estadoDelUltimoAviso([correo({ estado: 'fallido' })])).toBe('Falló; avise a soporte');
    expect(estadoDelUltimoAviso([correo({ estado: 'cancelado' })])).toBe('Cancelado');
    expect(estadoDelUltimoAviso([correo({ estado: 'enviado', enviadoEn: '2026-11-18T18:00:00Z' })])).toMatch(
      /^Enviado el .* a ana@proveedor\.com$/,
    );
  });

  it('el botón dice «Reenviar» si ya hay un aviso que no se canceló', () => {
    expect(textoDelBotonDeAviso([])).toBe('Enviar aviso');
    expect(textoDelBotonDeAviso([correo({ estado: 'cancelado' })])).toBe('Enviar aviso');
    expect(textoDelBotonDeAviso([correo({ estado: 'enviado' })])).toBe('Reenviar aviso');
  });

  it('un pago anulado con el aviso ya enviado recuerda avisar al proveedor', () => {
    expect(hayQueAvisarLaAnulacion(true, [correo({ estado: 'enviado' })])).toBe(true);
    expect(hayQueAvisarLaAnulacion(true, [correo({ estado: 'cancelado' })])).toBe(false);
    expect(hayQueAvisarLaAnulacion(false, [correo({ estado: 'enviado' })])).toBe(false);
  });
});
