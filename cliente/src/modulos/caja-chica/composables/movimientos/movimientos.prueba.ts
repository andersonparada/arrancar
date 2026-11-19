import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Arqueo } from '../../servicios/tipos-de-arqueos';
import type { ReposicionResumen } from '../../servicios/tipos-de-reposiciones';
import type { Vale } from '../../servicios/tipos-de-vales';
import { textosDeLaAnulacion } from '../anulaciones/anulacion-de-movimientos';
import { cuerpoDeCierre, edicionDeCierre, faltaDelCierre } from '../cierre/edicion-de-cierre';
import { cuadroDelArqueo, datosDelVale } from '../impresiones/datos-de-impresion';
import { marcaDeArqueo, marcaDeReposicion, marcaDeVale } from './detalles-de-movimientos';

beforeEach(() => setActivePinia(createPinia()));

const reposicion: ReposicionResumen = {
  id: 'r-1',
  fondoId: 'f-1',
  numero: 7,
  fecha: '2026-11-10',
  forma: 'cheque',
  monto: '850.00',
  movimientoId: 'm-1',
  custodio: 'Ana López',
  laHizoElCustodio: false,
  estado: 'vigente',
  fechaDeAnulacion: null,
  motivoDeAnulacion: null,
};

const vale: Vale = {
  id: 'v-1',
  fondoId: 'f-1',
  numero: 3,
  fecha: '2026-11-11',
  entregadoA: 'Luis Pérez',
  entregadoAUsuarioId: null,
  monto: '500.00',
  motivo: 'Repuestos del tractor',
  estado: 'abierto',
  fechaDeLiquidacion: null,
  devuelto: '0.00',
  fechaDeAnulacion: null,
  motivoDeAnulacion: null,
  diasAbierto: 9,
  avisos: [],
  gastado: '0.00',
  comprobantes: [],
};

const arqueo = (diferencia: string, estado: 'vigente' | 'anulado' = 'vigente') =>
  ({ diferencia, estado, efectivoContado: '90.00', valoresPorCambiar: '0.00', efectivoEsperado: '100.00' }) as Arqueo;

describe('anular desde la ficha', () => {
  it('la reposición explica el inverso en Bancos y pide la fecha', () => {
    const textos = textosDeLaAnulacion({ tipo: 'reposicion', registro: reposicion });
    expect(textos).toMatchObject({ conFecha: true, exito: 'Reposición 7 anulada.' });
    expect(textos.resumen).toContain('Bancos registra el movimiento inverso');
    expect(textos.resumen).toContain('ya pagó el cheque');
  });

  it('el arqueo y el vale no piden fecha y dicen cuándo no se puede', () => {
    const delVale = textosDeLaAnulacion({ tipo: 'vale', registro: vale });
    expect(delVale.conFecha).toBe(false);
    expect(delVale.resumen).toContain('Luis Pérez');
    expect(delVale.resumen).toContain('no tiene comprobantes');
    expect(textosDeLaAnulacion({ tipo: 'arqueo', registro: arqueo('0.00') }).conFecha).toBe(false);
  });
});

describe('marcas de la ficha', () => {
  it('el arqueo dice con palabras si cuadró, faltó o sobró', () => {
    expect(marcaDeArqueo(arqueo('0.00'))).toMatchObject({ texto: 'Cuadró', tono: 'campo' });
    expect(marcaDeArqueo(arqueo('-10.00')).texto).toContain('Faltó');
    expect(marcaDeArqueo(arqueo('5.50'))).toMatchObject({ tono: 'trigo' });
    expect(marcaDeArqueo(arqueo('5.50', 'anulado')).texto).toBe('Anulado');
  });

  it('el vale abierto cuenta los días y se vuelve amarillo con aviso', () => {
    expect(marcaDeVale(vale)).toEqual({ texto: 'Abierto hace 9 días', tono: 'tierra' });
    expect(marcaDeVale({ ...vale, avisos: ['Vale viejo'] }).tono).toBe('trigo');
    expect(marcaDeVale({ ...vale, estado: 'liquidado' }).texto).toBe('Liquidado');
  });

  it('la reposición solo se marca si está anulada', () => {
    expect(marcaDeReposicion(reposicion)).toBeNull();
    expect(marcaDeReposicion({ ...reposicion, estado: 'anulada' })?.texto).toBe('Anulada');
  });
});

describe('cerrar el fondo', () => {
  it('pide el motivo y, con efectivo en caja, la cuenta del depósito', () => {
    expect(Object.keys(faltaDelCierre(edicionDeCierre(null), '350.00')).sort()).toEqual(['cuentaBancariaId', 'motivo']);
  });

  it('sin efectivo no hace falta la cuenta; con la cuenta del fondo ya viene elegida', () => {
    expect(Object.keys(faltaDelCierre(edicionDeCierre(null), '0.00'))).toEqual(['motivo']);
    expect(edicionDeCierre('c-1').cuentaBancariaId).toBe('c-1');
  });

  it('el cuerpo limpia los espacios y omite la fecha vacía', () => {
    const edicion = { ...edicionDeCierre('c-1'), motivo: ' Cierre de año ', referencia: ' D-55 ' };
    expect(cuerpoDeCierre(edicion)).toEqual({
      motivo: 'Cierre de año',
      cuentaBancariaId: 'c-1',
      referencia: 'D-55',
    });
  });
});

describe('hojas impresas', () => {
  it('el cuadro del arqueo dice faltante o sobrante en palabras', () => {
    expect(cuadroDelArqueo(arqueo('-10.00'))[3]?.valor).toContain('Faltante de');
    expect(cuadroDelArqueo(arqueo('0.00'))[3]?.valor).toBe('Cuadra');
  });

  it('el vale liquidado muestra lo gastado y lo que regresó', () => {
    const etiquetas = datosDelVale({ ...vale, estado: 'liquidado', gastado: '400.00', devuelto: '100.00' }).map(
      ({ etiqueta }) => etiqueta,
    );
    expect(etiquetas).toContain('Gastado');
    expect(etiquetas).toContain('Regresó al fondo');
    expect(datosDelVale(vale).map(({ etiqueta }) => etiqueta)).not.toContain('Gastado');
  });
});
