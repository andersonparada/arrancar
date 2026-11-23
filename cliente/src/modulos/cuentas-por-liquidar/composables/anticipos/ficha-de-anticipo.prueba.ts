import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { anticipoDeEjemplo, gastoDeEjemplo, gastoSinDocumentoDeEjemplo } from '../ejemplos.soporte';
import { resumenDeQuitar } from './cambios-de-la-ficha';
import {
  avisosDeLaFicha,
  cifrasDelAnticipo,
  detallesDeLaAnulacion,
  detallesDeLaLiquidacion,
  detallesDelAnticipo,
  explicacionDelSaldo,
  reabrirConFecha,
  resumenDeAnular,
  resumenDeReabrir,
  rutaDeIngresoDeFactura,
} from './ficha-de-anticipo';
import { errorDelMotivo } from '../usar-cambio-con-motivo';
import {
  detallesDelGasto,
  erroresDelGastoSinDocumento,
  gastoSinDocumentoVacio,
  marcaDelGasto,
  montoDelGasto,
  resumenDeLosGastos,
  solicitudDeGastoSinDocumento,
  tituloDelGasto,
} from '../gastos/gastos-del-anticipo';

beforeEach(() => setActivePinia(createPinia()));

const liquidacion = {
  fecha: '2026-11-19',
  devuelto: '200.00',
  movimientoDeDevolucionId: 'm-2',
  reembolsado: '0.00',
  movimientoDeReembolsoId: null,
  noLiquidado: '100.00',
  destinoDeNoLiquidado: 'cobrar' as const,
  cuotas: 5,
  motivoDeNoLiquidado: 'Sin facturas',
};

describe('las cifras', () => {
  it('muestran lo entregado, lo gastado y lo que falta', () => {
    const cifras = cifrasDelAnticipo(anticipoDeEjemplo());
    expect(cifras.map(({ etiqueta }) => etiqueta)).toEqual(['Entregado', 'Gastado', 'Por justificar']);
    expect(cifras[2]?.enfasis).toBe(true);
  });

  it('si se gastó de más lo dicen así, sin el signo', () => {
    const cifras = cifrasDelAnticipo(anticipoDeEjemplo({ porJustificar: '-45.50' }));
    expect(cifras[2]).toMatchObject({ etiqueta: 'Gastado de más' });
    expect(cifras[2]?.valor).toContain('45.50');
    expect(cifras[2]?.valor).not.toContain('-');
  });

  it('explican qué sigue según el saldo', () => {
    expect(explicacionDelSaldo(anticipoDeEjemplo({ porJustificar: '0.00' }))).toContain('ya se puede liquidar');
    expect(explicacionDelSaldo(anticipoDeEjemplo({ porJustificar: '-1.00' }))).toContain('reembolsa');
    expect(explicacionDelSaldo(anticipoDeEjemplo())).toContain('300.00');
  });
});

describe('los avisos de la ficha', () => {
  it('no repiten el aviso de los vencidos que el servidor manda también en la lista', () => {
    const aviso = 'El anticipo 6 venció el 15/11/2026.';
    expect(avisosDeLaFicha(anticipoDeEjemplo({ aviso, avisos: [aviso] }))).toEqual([aviso]);
    expect(avisosDeLaFicha(anticipoDeEjemplo({ aviso, avisos: ['Otro'] }))).toEqual(['Otro', aviso]);
    expect(avisosDeLaFicha(anticipoDeEjemplo({ aviso: null, avisos: [] }))).toEqual([]);
  });
});

describe('los datos de la ficha', () => {
  it('traen el documento de Bancos y, si lo hubo, el motivo de entregar con vencidos', () => {
    const detalles = detallesDelAnticipo(anticipoDeEjemplo({ motivoConVencidos: 'Urgente' }));
    expect(detalles.find(({ etiqueta }) => etiqueta === 'Documento en Bancos')?.valor).toBe('Cheque 1234');
    expect(detalles.some(({ etiqueta }) => etiqueta.startsWith('Entregado con vencidos'))).toBe(true);
  });

  it('la liquidación muestra solo lo que pasó, con destino y cuotas', () => {
    const detalles = detallesDeLaLiquidacion(anticipoDeEjemplo({ estado: 'liquidado', liquidacion }));
    expect(detalles.map(({ etiqueta }) => etiqueta)).toEqual([
      'Fecha de liquidación',
      'Devuelto a la empresa',
      'Sin liquidar',
      'Destino de lo no liquidado',
      'Motivo',
    ]);
    expect(detalles.find(({ etiqueta }) => etiqueta === 'Destino de lo no liquidado')?.valor).toBe(
      'Cobrarlo en 5 cuotas',
    );
    expect(detallesDeLaLiquidacion(anticipoDeEjemplo())).toEqual([]);
  });

  it('la anulación dice la fecha y el motivo', () => {
    const anulado = anticipoDeEjemplo({ anulacion: { fecha: '2026-11-05', motivo: 'Error' } });
    expect(detallesDeLaAnulacion(anulado).map(({ etiqueta }) => etiqueta)).toEqual(['Fecha de anulación', 'Motivo']);
  });
});

describe('anular y reabrir', () => {
  it('anular cuenta qué hace Bancos con el cheque o la nota', () => {
    expect(resumenDeAnular(anticipoDeEjemplo())).toContain('el cheque');
    expect(resumenDeAnular(anticipoDeEjemplo({ forma: 'nota_de_debito' }))).toContain('la nota de débito');
  });

  it('reabrir pide la fecha solo si hubo un depósito o reembolso que anular en Bancos', () => {
    const conDeposito = anticipoDeEjemplo({ estado: 'liquidado', liquidacion });
    const sinMovimiento = anticipoDeEjemplo({ estado: 'liquidado', liquidacion: { ...liquidacion, devuelto: '0.00' } });
    expect(reabrirConFecha(conDeposito)).toBe(true);
    expect(resumenDeReabrir(conDeposito)).toContain('Bancos anulará el depósito');
    expect(reabrirConFecha(sinMovimiento)).toBe(false);
    expect(resumenDeReabrir(sinMovimiento)).not.toContain('Bancos');
  });

  it('el motivo es obligatorio y tiene tope', () => {
    expect(errorDelMotivo('   ')).toContain('Escriba el motivo');
    expect(errorDelMotivo('x'.repeat(301))).toContain('300');
    expect(errorDelMotivo('Error de captura')).toBeNull();
  });

  it('quitar dice qué pasa con un documento y con un gasto sin documento', () => {
    expect(resumenDeQuitar(gastoDeEjemplo())).toContain('vuelve a la bandeja');
    expect(resumenDeQuitar(gastoSinDocumentoDeEjemplo())).toContain('queda anulado');
  });
});

describe('agregar una factura', () => {
  it('lleva a Ingreso de facturas con el anticipo como destino y vuelve a la ficha', () => {
    const ruta = rutaDeIngresoDeFactura(anticipoDeEjemplo()) as { name: string; query: Record<string, string> };
    expect(ruta.name).toBe('libro-de-compras.documentos.nuevo');
    expect(ruta.query).toMatchObject({
      destino: 'cuentas-por-liquidar',
      referencia: '3f2b8c1e-5d4a-4e6f-9a7b-1c2d3e4f5a6b',
      volver: '/cuentas-por-liquidar/anticipos/3f2b8c1e-5d4a-4e6f-9a7b-1c2d3e4f5a6b',
    });
    expect(ruta.query.etiqueta).toContain('Anticipo 5');
  });
});

describe('los gastos', () => {
  it('titulan el documento con su tipo y el gasto sin documento con su descripción', () => {
    expect(tituloDelGasto(gastoDeEjemplo())).toBe('Factura A-123');
    expect(tituloDelGasto(gastoDeEjemplo({ tipoDeDocumento: 'nota_de_credito', etiqueta: 'N-1' }))).toBe(
      'Nota de crédito N-1',
    );
    expect(tituloDelGasto(gastoSinDocumentoDeEjemplo())).toBe('Taxi al aeropuerto');
  });

  it('una nota de crédito se ve restando', () => {
    expect(montoDelGasto(gastoDeEjemplo())).toContain('800.00');
    expect(montoDelGasto(gastoDeEjemplo({ resta: true })).startsWith('-')).toBe(true);
  });

  it('un documento con retención muestra lo retenido y su motivo', () => {
    const detalles = detallesDelGasto(
      gastoDeEjemplo({ montoRetenido: '50.00', conRetencion: true, motivoConRetencion: 'Urgente' }),
    );
    expect(detalles.map(({ etiqueta }) => etiqueta)).toContain('Retención (la entera la empresa)');
    expect(detalles.find(({ valor }) => valor === 'Urgente')?.largo).toBe(true);
  });

  it('el gasto sin documento muestra a quién se pagó y por qué no hay documento', () => {
    const etiquetas = detallesDelGasto(gastoSinDocumentoDeEjemplo()).map(({ etiqueta }) => etiqueta);
    expect(etiquetas).toEqual(['Fecha', 'Pagado a', 'Sin documento porque']);
  });

  it('la marca avisa el gasto sin documento o sin bancarizar', () => {
    expect(marcaDelGasto(gastoDeEjemplo())).toBeUndefined();
    expect(marcaDelGasto(gastoSinDocumentoDeEjemplo())).toBe('Sin documento');
    expect(marcaDelGasto(gastoDeEjemplo({ sinBancarizar: true }))).toBe('Sin bancarizar');
  });

  it('el resumen cuenta documentos y gastos sin documento', () => {
    expect(resumenDeLosGastos([])).toBe('Sin gastos todavía');
    expect(resumenDeLosGastos([gastoDeEjemplo(), gastoSinDocumentoDeEjemplo()])).toBe('1 documento y 1 sin documento');
  });
});

describe('el gasto sin documento', () => {
  const completo = {
    ...gastoSinDocumentoVacio('2026-11-19'),
    monto: '45.5',
    descripcion: ' Taxi ',
    pagadoA: ' Taxista ',
    conceptoDeGastoId: 'c-1',
    motivoSinDocumento: ' No dio factura ',
  };

  it('pide todo lo que falta, con cómo corregirlo', () => {
    const errores = erroresDelGastoSinDocumento(gastoSinDocumentoVacio('2026-11-19'), '2026-11-19');
    expect(Object.keys(errores).sort()).toEqual([
      'conceptoDeGastoId',
      'descripcion',
      'monto',
      'motivoSinDocumento',
      'pagadoA',
    ]);
    expect(erroresDelGastoSinDocumento(completo, '2026-11-19')).toEqual({});
  });

  it('no acepta fecha futura ni monto en cero', () => {
    expect(erroresDelGastoSinDocumento({ ...completo, fecha: '2026-12-01' }, '2026-11-19').fecha).toContain('futura');
    expect(erroresDelGastoSinDocumento({ ...completo, monto: '0' }, '2026-11-19').monto).toContain('mayor que cero');
  });

  it('manda los textos sin espacios y el monto con dos decimales', () => {
    expect(solicitudDeGastoSinDocumento(completo)).toEqual({
      fecha: '2026-11-19',
      monto: '45.50',
      descripcion: 'Taxi',
      pagadoA: 'Taxista',
      conceptoDeGastoId: 'c-1',
      motivoSinDocumento: 'No dio factura',
    });
  });
});
