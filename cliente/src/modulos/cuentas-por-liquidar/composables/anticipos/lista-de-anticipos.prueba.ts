import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { resumenDeEjemplo } from '../ejemplos.soporte';
import {
  ANTICIPOS_POR_PAGINA,
  cantidadDeFiltrosDeAnticipos,
  consultaDeAnticipos,
  detallesDeLaFilaDeAnticipo,
  documentoDelAnticipo,
  filtrosInicialesDeAnticipos,
  marcaDelAnticipo,
  resumenDeVencidos,
  textoDeAntiguedad,
  textoDePorJustificar,
} from './lista-de-anticipos';

beforeEach(() => setActivePinia(createPinia()));

describe('filtros de la lista', () => {
  it('abre con lo que está por liquidar y sin ningún filtro extra', () => {
    const filtros = filtrosInicialesDeAnticipos();
    expect(filtros.estado).toBe('abierto');
    expect(cantidadDeFiltrosDeAnticipos(filtros)).toBe(0);
  });

  it('cuenta el estado, el corte, el beneficiario y los vencidos', () => {
    const filtros = { estado: 'todos' as const, corte: '2026-10-31', beneficiarioId: 'b-1', soloVencidos: true };
    expect(cantidadDeFiltrosDeAnticipos(filtros)).toBe(4);
  });

  it('manda al servidor solo lo que se escogió', () => {
    expect(consultaDeAnticipos(filtrosInicialesDeAnticipos(), 2)).toEqual({
      estado: 'abierto',
      corte: undefined,
      beneficiarioId: undefined,
      vencidos: undefined,
      pagina: 2,
      limite: ANTICIPOS_POR_PAGINA,
    });
    const consulta = consultaDeAnticipos(
      { estado: 'abierto', corte: '2026-10-31', beneficiarioId: 'b-1', soloVencidos: true },
      1,
    );
    expect(consulta).toMatchObject({ corte: '2026-10-31', beneficiarioId: 'b-1', vencidos: true });
  });
});

describe('textos de la lista', () => {
  it('dice cuánto lleva la entrega', () => {
    expect(textoDeAntiguedad(0)).toBe('hoy');
    expect(textoDeAntiguedad(1)).toBe('hace 1 día');
    expect(textoDeAntiguedad(12)).toBe('hace 12 días');
  });

  it('nombra el documento de Bancos', () => {
    expect(documentoDelAnticipo('cheque', 1523)).toBe('Cheque 1523');
    expect(documentoDelAnticipo('nota_de_debito', 45)).toBe('Nota de débito 45');
  });

  it('un por justificar negativo se dice como gastado de más', () => {
    expect(textoDePorJustificar('-45.50')).toContain('Gastado de más');
    expect(textoDePorJustificar('-45.50')).toContain('45.50');
    expect(textoDePorJustificar('300.00')).not.toContain('de más');
  });
});

describe('la tarjeta de un anticipo', () => {
  it('un abierto muestra lo que falta y su fecha límite', () => {
    const etiquetas = detallesDeLaFilaDeAnticipo(resumenDeEjemplo(), '').map(({ etiqueta }) => etiqueta);
    expect(etiquetas).toContain('Por justificar');
    expect(etiquetas).toContain('Fecha límite');
  });

  it('con corte dice a qué fecha es lo que falta', () => {
    const detalles = detallesDeLaFilaDeAnticipo(resumenDeEjemplo(), '2026-10-31');
    expect(detalles.some(({ etiqueta }) => etiqueta.startsWith('Por justificar al'))).toBe(true);
  });

  it('un liquidado no muestra lo que falta; un vencido trae su aviso completo', () => {
    const liquidado = detallesDeLaFilaDeAnticipo(resumenDeEjemplo({ estado: 'liquidado' }), '');
    expect(liquidado.map(({ etiqueta }) => etiqueta)).not.toContain('Por justificar');
    const vencido = detallesDeLaFilaDeAnticipo(resumenDeEjemplo({ vencido: true, aviso: 'Venció.' }), '');
    expect(vencido.find(({ etiqueta }) => etiqueta === 'Aviso')).toMatchObject({ valor: 'Venció.', largo: true });
  });

  it('la marca nombra lo cerrado y avisa los días de un vencido', () => {
    expect(marcaDelAnticipo(resumenDeEjemplo())).toBeUndefined();
    expect(marcaDelAnticipo(resumenDeEjemplo({ estado: 'anulado' }))).toBe('Anulado');
    expect(marcaDelAnticipo(resumenDeEjemplo({ vencido: true, diasVencido: 1 }))).toBe('Vencido hace 1 día');
    expect(marcaDelAnticipo(resumenDeEjemplo({ vencido: true, diasVencido: 9 }))).toBe('Vencido hace 9 días');
  });

  it('el resumen de vencidos cuenta solo los abiertos vencidos', () => {
    expect(resumenDeVencidos([resumenDeEjemplo()])).toBeNull();
    const dos = [resumenDeEjemplo({ vencido: true }), resumenDeEjemplo({ vencido: true }), resumenDeEjemplo()];
    expect(resumenDeVencidos(dos)).toContain('2 anticipos pasaron');
    expect(resumenDeVencidos([resumenDeEjemplo({ vencido: true })])).toContain('1 anticipo pasó');
  });
});
