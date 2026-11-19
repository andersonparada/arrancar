import { describe, expect, it } from 'vitest';
import type { CorreoFicha, CorreoResumen } from '../../servicios/correos.api';
import {
  nombreDelEstado,
  rangoDeLaPagina,
  resumenDeDestinatarios,
  sePuedeCancelar,
  sePuedeReintentar,
  totalDePaginas,
} from './estado-del-correo';
import { CORREOS_POR_PAGINA, filtroDeLaApi, filtrosVacios, hayFiltros } from './filtro-de-correos';

const destinatario = (direccion: string) => ({ direccion, nombre: null, clase: 'para' as const, resultado: null });
const correo = (cambios: Partial<CorreoFicha> = {}): CorreoFicha => ({
  id: 'c-1',
  tipo: 'cuentas-por-pagar.aviso_de_pago',
  origen: { recurso: 'cuentas-por-pagar.pagos', registroId: 'p-1' },
  asunto: 'Aviso de pago 1',
  estado: 'pendiente',
  intentos: 0,
  destinatarios: [destinatario('a@x.com')],
  adjuntoNombre: null,
  creadoEn: '2026-11-18T12:00:00Z',
  proximoIntento: null,
  enviadoEn: null,
  canceladoEn: null,
  motivoDeCancelacion: null,
  nombreVisible: 'Empresa por medio de Arrancar',
  responderA: null,
  cuerpoTexto: 'Texto',
  contenidoDepurado: false,
  ...cambios,
});

describe('estado de un correo', () => {
  it('un pendiente que ya falló dice que se reintentará', () => {
    expect(nombreDelEstado(correo())).toBe('Pendiente');
    expect(nombreDelEstado(correo({ intentos: 2 }))).toBe('Pendiente: se reintentará');
    expect(nombreDelEstado(correo({ estado: 'fallido' }))).toBe('No se pudo enviar');
  });

  it('solo un pendiente se cancela', () => {
    expect(sePuedeCancelar(correo())).toBe(true);
    for (const estado of ['enviando', 'enviado', 'fallido', 'cancelado'] as const) {
      expect(sePuedeCancelar(correo({ estado }))).toBe(false);
    }
  });

  it('solo un fallido con contenido se reintenta', () => {
    expect(sePuedeReintentar(correo({ estado: 'fallido' }))).toBe(true);
    expect(sePuedeReintentar(correo({ estado: 'fallido', contenidoDepurado: true }))).toBe(false);
    expect(sePuedeReintentar(correo({ estado: 'enviado' }))).toBe(false);
  });
});

describe('resumen de destinatarios', () => {
  it('una dirección, varias o ninguna', () => {
    const vacio: Pick<CorreoResumen, 'destinatarios'> = { destinatarios: [] };

    expect(resumenDeDestinatarios(vacio)).toBe('Sin destinatarios');
    expect(resumenDeDestinatarios({ destinatarios: [destinatario('a@x.com')] })).toBe('a@x.com');
    expect(resumenDeDestinatarios({ destinatarios: [destinatario('a@x.com'), destinatario('b@x.com')] })).toBe(
      'a@x.com y 1 más',
    );
  });
});

describe('paginación', () => {
  it('dice qué filas se ven y cuántas páginas hay', () => {
    expect(rangoDeLaPagina(1, 50, 120)).toBe('1 a 50 de 120');
    expect(rangoDeLaPagina(3, 50, 120)).toBe('101 a 120 de 120');
    expect(rangoDeLaPagina(1, 50, 0)).toBe('Sin resultados');
    expect(totalDePaginas(50, 120)).toBe(3);
    expect(totalDePaginas(50, 0)).toBe(1);
  });
});

describe('filtros del historial', () => {
  it('sin filtros pide solo la página', () => {
    expect(filtroDeLaApi(filtrosVacios())).toEqual({ pagina: 1, limite: CORREOS_POR_PAGINA });
    expect(hayFiltros(filtrosVacios())).toBe(false);
  });

  it('manda solo los filtros con valor', () => {
    const filtros = { ...filtrosVacios(), estado: 'fallido' as const, desde: '2026-11-01', pagina: 2 };

    expect(filtroDeLaApi(filtros)).toEqual({
      pagina: 2,
      limite: CORREOS_POR_PAGINA,
      estado: 'fallido',
      desde: '2026-11-01',
    });
    expect(hayFiltros(filtros)).toBe(true);
  });
});
