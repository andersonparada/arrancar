import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import type { ComprobanteDeLaBandeja, SeguimientoDelDocumento } from '../../servicios/tipos-de-comprobantes';
import { comprobanteDeEjemplo } from '../ejemplos.soporte';
import {
  AVISO_SIN_REEMPLAZO,
  candidatosDeReemplazo,
  cuantosPendientes,
  estadoDelDocumento,
  estadoParaElServidor,
  estaPendiente,
  filtrarPorVista,
} from './documento-anulado';
import {
  cuerpoDeSalida,
  edicionDeDisputa,
  edicionDeSalida,
  faltaDeDisputa,
  faltaDeSalida,
  resumenDeSalida,
} from './edicion-de-salida';

const seguimiento = (cambios: Partial<SeguimientoDelDocumento> = {}): SeguimientoDelDocumento => ({
  situacion: 'por_resolver',
  salida: null,
  documentoAnuladoId: null,
  motivoDeLaResolucion: null,
  monto: null,
  destino: null,
  disputa: null,
  ...cambios,
});

const anulado = (cambios: Parameters<typeof comprobanteDeEjemplo>[0] = {}) =>
  comprobanteDeEjemplo({ motivoDocumentoAnulado: 'Error del emisor', seguimiento: seguimiento(), ...cambios });

const enLaBandeja = (cambios: Partial<ComprobanteDeLaBandeja> = {}): ComprobanteDeLaBandeja => ({
  ...comprobanteDeEjemplo({ id: 'nuevo', fondoId: null }),
  puedeAsignarConRetencion: false,
  ...cambios,
});

beforeEach(() => setActivePinia(createPinia()));

describe('el estado del documento anulado', () => {
  it('«por resolver» explica que no da crédito y que el efectivo no cambia', () => {
    const estado = estadoDelDocumento(anulado(), '2026-11-24');
    expect(estado?.texto).toBe('Factura anulada · por resolver');
    expect(estado?.tono).toBe('rojo');
    expect(estado?.lineas.join(' ')).toContain('Error del emisor');
    expect(estado?.lineas.join(' ')).toContain('El efectivo del fondo no cambia');
  });

  it('un comprobante normal no tiene estado', () => {
    expect(estadoDelDocumento(comprobanteDeEjemplo())).toBeNull();
  });

  it('en disputa dice hasta cuándo se puede tomar el crédito, y avisa si ya venció', () => {
    const disputa = { motivo: 'Sí pagamos', prueba: 'Cheque 1234', hasta: '2026-12-15' };
    const comprobante = anulado({ seguimiento: seguimiento({ situacion: 'en_disputa', disputa }) });
    const vigente = estadoDelDocumento(comprobante, '2026-11-24')?.lineas.join(' ');
    expect(vigente).toContain('Cheque 1234');
    expect(vigente).toContain('se puede tomar hasta');
    const vencida = estadoDelDocumento(comprobante, '2027-01-02')?.lineas.join(' ');
    expect(vencida).toContain('venció');
    expect(vencida).toContain('devolución, cobro o sin recuperación');
  });

  it('lo resuelto dice cómo se resolvió', () => {
    const resuelto = anulado({
      seguimiento: seguimiento({ situacion: 'resuelto', salida: 'cobro', monto: '40.00', destino: 'custodio' }),
    });
    const estado = estadoDelDocumento(resuelto);
    expect(estado?.tono).toBe('campo');
    expect(estado?.lineas[0]).toContain('del custodio');
  });

  it('solo lo vigente y sin resolver está pendiente', () => {
    expect(estaPendiente(anulado())).toBe(true);
    expect(estaPendiente(anulado({ seguimiento: seguimiento({ situacion: 'en_disputa' }) }))).toBe(true);
    expect(estaPendiente(anulado({ seguimiento: seguimiento({ situacion: 'resuelto' }) }))).toBe(false);
    expect(estaPendiente(comprobanteDeEjemplo())).toBe(false);
    expect(cuantosPendientes([anulado(), comprobanteDeEjemplo()])).toBe(1);
  });
});

describe('la vista «por resolver»', () => {
  it('se pide todo al servidor y se dejan solo los pendientes', () => {
    expect(estadoParaElServidor('por_resolver')).toBe('todos');
    expect(estadoParaElServidor('repuesto')).toBe('repuesto');
    const lista = {
      elementos: [anulado({ id: 'a' }), comprobanteDeEjemplo({ id: 'b' })],
      totales: { pendiente: '0.00', repuesto: '0.00' },
    };
    expect(filtrarPorVista(lista, 'por_resolver').elementos.map(({ id }) => id)).toEqual(['a']);
    expect(filtrarPorVista(lista, 'todos').elementos).toHaveLength(2);
  });
});

describe('reemplazar la factura anulada', () => {
  it('solo ofrece facturas del mismo proveedor, monto y clase, dentro del libro', () => {
    const buenas = enLaBandeja({ id: 'buena' });
    const otroProveedor = enLaBandeja({ id: 'p', proveedorId: 'p-2' });
    const otroMonto = enLaBandeja({ id: 'm', monto: '90.00' });
    const nota = enLaBandeja({ id: 'n', esNotaDeCredito: true });
    const fuera = enLaBandeja({ id: 'f', documento: { ...comprobanteDeEjemplo().documento!, enElLibro: false } });
    const ids = candidatosDeReemplazo(anulado(), [buenas, otroProveedor, otroMonto, nota, fuera]).map(({ id }) => id);
    expect(ids).toEqual(['buena']);
  });
});

describe('resolver el documento anulado', () => {
  it('pide escoger la salida y el motivo', () => {
    const comprobante = anulado();
    expect(faltaDeSalida(edicionDeSalida(comprobante), comprobante)).toHaveProperty('salida');
    const sinMotivo = { ...edicionDeSalida(comprobante), salida: 'sin_recuperacion' as const };
    expect(faltaDeSalida(sinMotivo, comprobante)).toEqual({ motivo: expect.stringContaining('motivo') });
    expect(faltaDeSalida({ ...sinMotivo, motivo: 'Se perdió' }, comprobante)).toEqual({});
  });

  it('el reemplazo pide la factura nueva y no pide monto', () => {
    const comprobante = anulado();
    const edicion = { ...edicionDeSalida(comprobante), salida: 'reemplazo' as const, motivo: 'Nueva FEL' };
    expect(faltaDeSalida(edicion, comprobante)).toHaveProperty('reemplazoId');
    expect(faltaDeSalida({ ...edicion, reemplazoId: 'nuevo' }, comprobante)).toEqual({});
  });

  it('la devolución y el cobro piden monto válido sin pasar de lo gastado, y a quién', () => {
    const comprobante = anulado();
    const base = { ...edicionDeSalida(comprobante), salida: 'devolucion' as const, motivo: 'Devolvió' };
    expect(faltaDeSalida(base, comprobante)).toEqual({ destino: expect.any(String) });
    expect(faltaDeSalida({ ...base, destino: 'proveedor', monto: '100.01' }, comprobante)).toHaveProperty('monto');
    expect(faltaDeSalida({ ...base, destino: 'proveedor', monto: '0' }, comprobante)).toHaveProperty('monto');
    expect(faltaDeSalida({ ...base, destino: 'proveedor', monto: '99.5' }, comprobante)).toEqual({});
  });

  it('«no se recupera» no manda monto ni destino', () => {
    const edicion = {
      ...edicionDeSalida(anulado()),
      salida: 'sin_recuperacion' as const,
      destino: 'proveedor' as const,
      motivo: ' Perdido ',
    };
    expect(cuerpoDeSalida(edicion)).toEqual({
      salida: 'sin_recuperacion',
      motivo: 'Perdido',
      monto: null,
      destino: null,
    });
    const cobro = { ...edicion, salida: 'cobro' as const, monto: 40 };
    expect(cuerpoDeSalida(cobro)).toMatchObject({ salida: 'cobro', monto: '40', destino: 'proveedor' });
  });

  it('el resumen dice que el efectivo no cambia', () => {
    const comprobante = anulado();
    const edicion = { ...edicionDeSalida(comprobante), salida: 'sin_recuperacion' as const };
    expect(resumenDeSalida(comprobante, edicion)).toContain('no cambian');
    expect(resumenDeSalida(comprobante, edicionDeSalida(comprobante))).toContain('Escoja');
  });
});

describe('la disputa', () => {
  it('pide el motivo y la prueba de pago', () => {
    expect(Object.keys(faltaDeDisputa(edicionDeDisputa()))).toEqual(['motivo', 'prueba']);
    expect(faltaDeDisputa({ motivo: 'Sí pagamos', prueba: 'Cheque 5' })).toEqual({});
  });
});

describe('el aviso sin reemplazo', () => {
  it('no manda a una devolución o un cobro por la diferencia', () => {
    expect(AVISO_SIN_REEMPLAZO).not.toMatch(/devoluci[oó]n|cobro/i);
    expect(AVISO_SIN_REEMPLAZO).toContain('pida al emisor una FEL del mismo monto');
  });
});
