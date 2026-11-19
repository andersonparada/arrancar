import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { fichaDeEjemplo, lineaDeEjemplo } from './ejemplos-de-ficha-de-pago';
import {
  detallesDeFichaDePago,
  diferenciaSaldadaDe,
  estaCobrado,
  mueveDinero,
  resumenDeAnularPago,
  resumenDeSaldarDiferencia,
  sePuedeSaldar,
  solicitudDeSaldarDiferencia,
  textoDeConstancias,
} from './ficha-de-pago';

beforeEach(() => setActivePinia(createPinia()));

describe('ficha de un pago', () => {
  it('muestra el documento de Bancos y oculta lo que no aplica a la forma', () => {
    const detalles = detallesDeFichaDePago(fichaDeEjemplo());
    const etiquetas = detalles.map(({ etiqueta }) => etiqueta);
    expect(detalles.find(({ etiqueta }) => etiqueta === 'Documento en Bancos')?.valor).toContain('Cheque 1523');
    expect(etiquetas).not.toContain('Retiro de efectivo');
    expect(etiquetas).not.toContain('Motivo');
  });

  it('un pago en efectivo muestra el retiro, quien recibió y la excepción de bancarización', () => {
    const efectivo = fichaDeEjemplo({
      forma: 'efectivo',
      movimiento: null,
      retiro: { id: 'r1', numero: '15', custodio: 'Luis', estado: 'abierto' },
      recibidoPor: 'Pedro',
      motivoSinBancarizar: 'Zona rural',
    });
    const detalles = detallesDeFichaDePago(efectivo);
    expect(detalles.find(({ etiqueta }) => etiqueta === 'Retiro de efectivo')?.valor).toContain('custodio Luis');
    expect(detalles.map(({ etiqueta }) => etiqueta)).toEqual(
      expect.arrayContaining(['Recibió por el proveedor', 'Sin bancarizar porque']),
    );
  });

  it('cobrado es conciliado y vigente; un anulado conciliado ya no cuenta como cobrado', () => {
    expect(estaCobrado(fichaDeEjemplo({ conciliado: true }))).toBe(true);
    expect(estaCobrado(fichaDeEjemplo({ conciliado: true, estado: 'anulado' }))).toBe(false);
    expect(estaCobrado(fichaDeEjemplo())).toBe(false);
  });

  it('solo cheque y nota de débito mueven dinero (piden la fecha del inverso)', () => {
    expect(mueveDinero({ forma: 'cheque' })).toBe(true);
    expect(mueveDinero({ forma: 'nota_de_debito' })).toBe(true);
    expect(mueveDinero({ forma: 'nota_ligada' })).toBe(false);
    expect(mueveDinero({ forma: 'efectivo' })).toBe(false);
  });

  it('el resumen de anular no duplica el punto si el proveedor termina en uno', () => {
    const ficha = fichaDeEjemplo({});
    const texto = resumenDeAnularPago({ ...ficha, proveedor: { ...ficha.proveedor, nombre: 'Eco S.A.' } });
    expect(texto).toContain('a Eco S.A. ');
    expect(texto).not.toContain('..');
  });

  it('el resumen de anular dice qué pasa con los documentos y con Bancos', () => {
    const texto = resumenDeAnularPago(fichaDeEjemplo({ diferencias: [{ cargoId: 'd1', monto: '0.03' }] }));
    expect(texto).toContain('Se anulará el pago 2026-7');
    expect(texto).toContain('Los 2 documentos');
    expect(texto).toContain('Bancos anulará el cheque');
    expect(texto).toContain('diferencias');
    expect(resumenDeAnularPago(fichaDeEjemplo({ forma: 'nota_ligada' }))).toContain('vuelve a quedar disponible');
    expect(resumenDeAnularPago(fichaDeEjemplo({ forma: 'cuenta_de_apertura', movimiento: null }))).toContain(
      'No se mueve dinero en Bancos',
    );
  });

  it('anular un pago en efectivo dice que el efectivo vuelve al retiro', () => {
    const retiro = { id: 'r1', numero: '2026-4', custodio: 'Juan', estado: 'abierto' };
    const texto = resumenDeAnularPago(fichaDeEjemplo({ forma: 'efectivo', movimiento: null, retiro }));
    expect(texto).toContain('El efectivo vuelve al retiro 2026-4');
    expect(texto).not.toContain('Bancos anulará');
  });

  it('saldar la diferencia: solo si el servidor la ofrece y la línea tiene residuo', () => {
    const con = lineaDeEjemplo('d1', { diferenciaOfrecible: '0.03' });
    const sin = lineaDeEjemplo('d2');
    expect(sePuedeSaldar(fichaDeEjemplo(), con)).toBe(true);
    expect(sePuedeSaldar(fichaDeEjemplo(), sin)).toBe(false);
    expect(sePuedeSaldar(fichaDeEjemplo({ puedeSaldarDiferencia: false }), con)).toBe(false);
    expect(solicitudDeSaldarDiferencia(con)).toEqual({ cargoId: 'd1', monto: '0.03' });
  });

  it('el resumen de saldar avisa de la retención solo si el documento la tiene', () => {
    const ficha = fichaDeEjemplo();
    const sinRetencion = resumenDeSaldarDiferencia(ficha, lineaDeEjemplo('d1', { diferenciaOfrecible: '0.03' }));
    expect(sinRetencion).toContain('No es un descuento del proveedor');
    expect(sinRetencion).not.toContain('retención');
    const conRetencion = resumenDeSaldarDiferencia(
      ficha,
      lineaDeEjemplo('d1', { diferenciaOfrecible: '0.03', retenciones: '12.00' }),
    );
    expect(conRetencion).toContain('retención');
  });

  it('la diferencia ya saldada de un cargo se encuentra por su id', () => {
    const ficha = fichaDeEjemplo({ diferencias: [{ cargoId: 'd2', monto: '0.02' }] });
    expect(diferenciaSaldadaDe(ficha, 'd2')).toBe('0.02');
    expect(diferenciaSaldadaDe(ficha, 'd1')).toBeNull();
  });

  it('las constancias dicen el impuesto y si falta emitirlas', () => {
    const linea = lineaDeEjemplo('d1', {
      retencionesDelLibro: [
        { impuesto: 'iva', monto: '60.00', fecha: '2026-10-05', constanciaNumero: '123', porEmitir: false },
        { impuesto: 'isr', monto: '5.00', fecha: '2026-10-05', constanciaNumero: null, porEmitir: true },
      ],
    });
    const textos = textoDeConstancias(linea);
    expect(textos[0]).toContain('IVA');
    expect(textos[0]).toContain('constancia 123');
    expect(textos[1]).toContain('ISR');
    expect(textos[1]).toContain('constancia por emitir');
  });
});
