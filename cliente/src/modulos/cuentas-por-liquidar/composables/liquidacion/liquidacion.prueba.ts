import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { anticipoDeEjemplo, gastoDeEjemplo, gastoSinDocumentoDeEjemplo } from '../ejemplos.soporte';
import {
  alEscribirDevuelto,
  alEscribirNoLiquidado,
  cuadreDeLaLiquidacion,
  edicionDeLiquidacionInicial,
  erroresDeLaLiquidacion,
  solicitudDeLiquidacion,
  type EdicionDeLiquidacion,
} from './edicion-de-liquidacion';
import {
  autorizacionDelDescuento,
  cuadroDeLaLiquidacion,
  separarLosGastos,
  sumaDeLosGastos,
} from './liquidacion-impresa';
import { resumenDeLaLiquidacion } from './resumen-de-liquidacion';

beforeEach(() => setActivePinia(createPinia()));

const HOY = '2026-11-19';
const FALTAN_300 = { porJustificar: '300.00', esEmpleado: true };
const SE_GASTO_DE_MAS = { porJustificar: '-45.50', esEmpleado: true };
const nombres = { cuentaDelDeposito: 'Banco Alfa', medioDelReembolso: 'Banco Alfa · chequera' };

function conDeposito(cambios: Partial<EdicionDeLiquidacion> = {}): EdicionDeLiquidacion {
  return { ...edicionDeLiquidacionInicial(FALTAN_300, HOY), cuentaDelDeposito: 'c-1', ...cambios };
}

describe('al abrir', () => {
  it('lo que falta se devuelve entero y nada queda sin liquidar', () => {
    const edicion = edicionDeLiquidacionInicial(FALTAN_300, HOY);
    expect(edicion).toMatchObject({ fecha: HOY, devuelto: '300.00', noLiquidado: '0.00' });
  });

  it('si se gastó de más no hay nada que devolver', () => {
    expect(edicionDeLiquidacionInicial(SE_GASTO_DE_MAS, HOY).devuelto).toBe('0.00');
  });
});

describe('el cuadre en vivo', () => {
  it('cuadra al abrir, y al escribir lo devuelto lo no liquidado es el resto', () => {
    const edicion = conDeposito();
    alEscribirDevuelto(edicion, FALTAN_300, '250');
    expect(edicion.noLiquidado).toBe('50.00');
    expect(cuadreDeLaLiquidacion(edicion, FALTAN_300)).toMatchObject({
      cuadra: true,
      hayDevuelto: true,
      hayNoLiquidado: true,
    });
  });

  it('al escribir lo no liquidado lo devuelto es el resto', () => {
    const edicion = conDeposito();
    alEscribirNoLiquidado(edicion, FALTAN_300, '100');
    expect(edicion.devuelto).toBe('200.00');
  });

  it('si lo escrito se pasa de lo que falta, el otro monto no cambia y se ve lo que falta repartir', () => {
    const edicion = conDeposito();
    alEscribirDevuelto(edicion, FALTAN_300, '500');
    expect(edicion.noLiquidado).toBe('0.00');
    const cuadre = cuadreDeLaLiquidacion(edicion, FALTAN_300);
    expect(cuadre.cuadra).toBe(false);
    expect(cuadre.faltaRepartir).toBe('-200.00');
  });

  it('si se gastó de más dice cuánto se reembolsa y no hay nada que repartir', () => {
    const cuadre = cuadreDeLaLiquidacion(edicionDeLiquidacionInicial(SE_GASTO_DE_MAS, HOY), SE_GASTO_DE_MAS);
    expect(cuadre).toMatchObject({ reembolsa: '45.50', cuadra: true, hayDevuelto: false, hayNoLiquidado: false });
  });
});

describe('errores antes de enviar', () => {
  it('devolver todo pide la cuenta del depósito', () => {
    expect(erroresDeLaLiquidacion(edicionDeLiquidacionInicial(FALTAN_300, HOY), FALTAN_300, HOY)).toEqual({
      cuentaBancariaId: 'Escoja la cuenta donde se deposita lo devuelto.',
    });
    expect(erroresDeLaLiquidacion(conDeposito(), FALTAN_300, HOY)).toEqual({});
  });

  it('lo no liquidado pide destino y motivo, y cobrar pide las cuotas', () => {
    const edicion = conDeposito();
    alEscribirNoLiquidado(edicion, FALTAN_300, '100');
    const errores = erroresDeLaLiquidacion(edicion, FALTAN_300, HOY);
    expect(Object.keys(errores).sort()).toEqual(['destinoDeNoLiquidado', 'motivoDeNoLiquidado']);
    edicion.destino = 'cobrar';
    edicion.motivoDeNoLiquidado = 'No presentó facturas';
    expect(erroresDeLaLiquidacion(edicion, FALTAN_300, HOY).cuotas).toContain('cuotas');
    edicion.cuotas = '5';
    expect(erroresDeLaLiquidacion(edicion, FALTAN_300, HOY)).toEqual({});
  });

  it('lo que no cuadra dice cuánto falta repartir; la fecha no es futura', () => {
    const edicion = conDeposito({ devuelto: '100', fecha: '2026-12-01' });
    const errores = erroresDeLaLiquidacion(edicion, FALTAN_300, HOY);
    expect(errores.devuelto).toContain('200.00');
    expect(errores.fecha).toContain('futura');
  });

  it('si se gastó de más pide con qué se reembolsa', () => {
    const edicion = edicionDeLiquidacionInicial(SE_GASTO_DE_MAS, HOY);
    expect(erroresDeLaLiquidacion(edicion, SE_GASTO_DE_MAS, HOY).medioDelReembolso).toContain('reembolsa');
    edicion.medioDelReembolso = 'q-1';
    expect(erroresDeLaLiquidacion(edicion, SE_GASTO_DE_MAS, HOY)).toEqual({});
  });
});

describe('el cuerpo de la liquidación', () => {
  it('devolver todo manda la cuenta y la boleta, sin nada de lo no liquidado', () => {
    const cuerpo = solicitudDeLiquidacion(conDeposito({ referencia: ' B-77 ' }), FALTAN_300);
    expect(cuerpo).toEqual({
      fecha: HOY,
      devuelto: '300.00',
      noLiquidado: '0.00',
      cuentaBancariaId: 'c-1',
      referencia: 'B-77',
    });
  });

  it('una parte sin liquidar cobrada en cuotas manda destino, cuotas, voluntario y motivo', () => {
    const edicion = conDeposito({ destino: 'cobrar', cuotas: '6', motivoDeNoLiquidado: ' Sin facturas ' });
    alEscribirNoLiquidado(edicion, FALTAN_300, '100');
    expect(solicitudDeLiquidacion(edicion, FALTAN_300)).toMatchObject({
      devuelto: '200.00',
      noLiquidado: '100.00',
      destinoDeNoLiquidado: 'cobrar',
      cuotas: 6,
      pagoVoluntario: false,
      motivoDeNoLiquidado: 'Sin facturas',
    });
  });

  it('como pérdida no manda cuotas', () => {
    const edicion = conDeposito({ destino: 'perdida', motivoDeNoLiquidado: 'Se perdió' });
    alEscribirNoLiquidado(edicion, FALTAN_300, '300');
    const cuerpo = solicitudDeLiquidacion(edicion, FALTAN_300);
    expect(cuerpo).toMatchObject({ devuelto: '0.00', noLiquidado: '300.00', cuotas: null });
    expect('cuentaBancariaId' in cuerpo).toBe(false);
  });

  it('un gasto de más manda el reembolso con cheque o con nota de débito', () => {
    const edicion = { ...edicionDeLiquidacionInicial(SE_GASTO_DE_MAS, HOY), medioDelReembolso: 'q-1' };
    expect(solicitudDeLiquidacion(edicion, SE_GASTO_DE_MAS).reembolso).toEqual({
      forma: 'cheque',
      chequeraId: 'q-1',
      noNegociable: true,
    });
    const nota = {
      ...edicion,
      formaDelReembolso: 'nota_de_debito' as const,
      medioDelReembolso: 'c-1',
      referenciaDelReembolso: 'T-9',
    };
    expect(solicitudDeLiquidacion(nota, SE_GASTO_DE_MAS).reembolso).toEqual({
      forma: 'nota_de_debito',
      cuentaBancariaId: 'c-1',
      referencia: 'T-9',
    });
  });
});

describe('la confirmación', () => {
  const anticipo = anticipoDeEjemplo();

  it('dice lo devuelto y dónde se deposita', () => {
    const texto = resumenDeLaLiquidacion(conDeposito(), anticipo, nombres);
    expect(texto).toContain('Ana López devuelve');
    expect(texto).toContain('300.00');
    expect(texto).toContain('Banco Alfa');
  });

  it('dice lo no liquidado con su destino y cuotas', () => {
    const edicion = conDeposito({ destino: 'cobrar', cuotas: '5' });
    alEscribirNoLiquidado(edicion, FALTAN_300, '100');
    const texto = resumenDeLaLiquidacion(edicion, anticipo, nombres);
    expect(texto).toContain('100.00 quedan sin liquidar');
    expect(texto).toContain('en 5 cuotas');
    expect(texto).toContain('auditoría');
  });

  it('dice el reembolso cuando se gastó de más', () => {
    const edicion = { ...edicionDeLiquidacionInicial(SE_GASTO_DE_MAS, HOY), medioDelReembolso: 'q-1' };
    const texto = resumenDeLaLiquidacion(edicion, { ...anticipo, porJustificar: '-45.50' }, nombres);
    expect(texto).toContain('Se gastó de más');
    expect(texto).toContain('45.50');
  });
});

describe('la hoja impresa', () => {
  it('separa los gastos con y sin documento y deja fuera los anulados', () => {
    const grupos = separarLosGastos([
      gastoDeEjemplo(),
      gastoSinDocumentoDeEjemplo(),
      gastoDeEjemplo({ id: 'g-3', estado: 'anulado' }),
    ]);
    expect(grupos.conDocumento).toHaveLength(1);
    expect(grupos.sinDocumento).toHaveLength(1);
  });

  it('suma restando las notas de crédito', () => {
    expect(sumaDeLosGastos([gastoDeEjemplo(), gastoDeEjemplo({ id: 'g-4', monto: '100.00', resta: true })])).toBe(
      '700.00',
    );
  });

  it('el cuadro solo trae las cifras que tuvieron valor', () => {
    const liquidado = anticipoDeEjemplo({
      estado: 'liquidado',
      liquidacion: {
        fecha: HOY,
        devuelto: '200.00',
        movimientoDeDevolucionId: 'm-2',
        reembolsado: '0.00',
        movimientoDeReembolsoId: null,
        noLiquidado: '100.00',
        destinoDeNoLiquidado: 'cobrar',
        cuotas: 5,
        motivoDeNoLiquidado: 'Sin facturas',
      },
    });
    expect(cuadroDeLaLiquidacion(liquidado).map(({ etiqueta }) => etiqueta)).toEqual([
      'Anticipo entregado',
      'Gastos justificados',
      'Devuelto a la empresa',
      'Sin liquidar',
    ]);
    expect(autorizacionDelDescuento(liquidado)).toContain('5 cuotas');
  });

  it('sin cobro en cuotas no hay autorización de descuento', () => {
    expect(autorizacionDelDescuento(anticipoDeEjemplo())).toBeNull();
  });
});
