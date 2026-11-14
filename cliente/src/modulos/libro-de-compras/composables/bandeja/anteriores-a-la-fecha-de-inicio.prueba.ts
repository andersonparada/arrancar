import { describe, expect, it } from 'vitest';
import {
  anterioresPorOmision,
  avisoDeAnterioridad,
  avisoDeLaBandeja,
  conLasMarcasDeLaLista,
  marcaDeAnterioridad,
  nombreDeMostrarAnteriores,
  textoDeAnterioresOcultos,
} from './anteriores-a-la-fecha-de-inicio';
import { filaDte } from './bandeja.soporte';
import { cantidadDeFiltrosDeLaBandeja, consultaDeLaBandeja, filtrosDeLaBandejaVacios } from './datos-de-la-bandeja';
import { textoDelError } from './datos-de-la-confirmacion';
import { textoDeLoQueFalta } from './detalles-de-la-fila';

const anterior = filaDte({ anteriorALaFechaDeInicio: true });
const enPlazo = filaDte({ anteriorALaFechaDeInicio: true, enPlazoDeCredito: true });

describe('DTE de antes de la fecha de inicio en la bandeja', () => {
  it('en Pendientes se ocultan por omisión y en las demás pestañas se ven', () => {
    expect(anterioresPorOmision('pendiente')).toBe('ocultar');
    expect(anterioresPorOmision('descartado')).toBe('incluir');
    expect(anterioresPorOmision('registrado')).toBe('incluir');
    expect(anterioresPorOmision('bloqueado')).toBe('incluir');
  });

  it('pide al servidor lo que dice el filtro, y no cuenta como filtro puesto', () => {
    const filtros = filtrosDeLaBandejaVacios('ocultar');
    expect(consultaDeLaBandeja('pendiente', filtros, 1).anteriores).toBe('ocultar');
    expect(consultaDeLaBandeja('pendiente', { ...filtros, anteriores: 'incluir' }, 1).anteriores).toBe('incluir');
    expect(cantidadDeFiltrosDeLaBandeja(filtros)).toBe(0);
    expect(cantidadDeFiltrosDeLaBandeja({ ...filtros, busqueda: 'paz' })).toBe(1);
  });

  it('marca la fila anterior y destaca la que está en plazo de crédito', () => {
    expect(marcaDeAnterioridad(filaDte())).toBeNull();
    expect(marcaDeAnterioridad(anterior)).toEqual({ texto: 'Antes de la fecha de inicio', tono: 'tierra' });
    expect(marcaDeAnterioridad(enPlazo)).toEqual({
      texto: 'Antes de la fecha de inicio · en plazo de crédito',
      tono: 'trigo',
    });
  });

  it('una fila ya registrada no lleva la marca', () => {
    expect(marcaDeAnterioridad({ ...enPlazo, estado: 'registrado' })).toBeNull();
  });

  it('el aviso de revisión es solo de las filas en plazo de crédito', () => {
    expect(avisoDeAnterioridad(anterior)).toBe('');
    expect(avisoDeAnterioridad(filaDte())).toBe('');
    expect(avisoDeAnterioridad(enPlazo)).toBe(
      'Emitido en los dos meses anteriores al de la fecha de inicio: revise que esté en el sistema anterior.',
    );
  });

  it('dice cuántas están ocultas, en singular y en plural', () => {
    expect(textoDeAnterioresOcultos(1, '15/03/2026')).toBe(
      '1 DTE es de antes de la fecha de inicio (15/03/2026) y no se muestra.',
    );
    expect(textoDeAnterioresOcultos(12, '15/03/2026')).toBe(
      '12 DTE son de antes de la fecha de inicio (15/03/2026) y no se muestran.',
    );
    expect(nombreDeMostrarAnteriores(12)).toBe('Mostrar los 12 DTE de antes de la fecha de inicio');
  });

  it('el aviso de la bandeja depende de la fecha de inicio, de lo oculto y de la pestaña', () => {
    const datos = { fechaDeInicio: '2026-03-15', ocultos: 3 };
    expect(avisoDeLaBandeja('pendiente', 'ocultar', datos)).toBe('ocultas');
    expect(avisoDeLaBandeja('pendiente', 'incluir', { ...datos, ocultos: 0 })).toBe('mostrando');
    expect(avisoDeLaBandeja('pendiente', 'ocultar', { ...datos, ocultos: 0 })).toBe('ninguno');
    expect(avisoDeLaBandeja('descartado', 'incluir', { ...datos, ocultos: 0 })).toBe('ninguno');
    expect(avisoDeLaBandeja('pendiente', 'ocultar', { fechaDeInicio: null, ocultos: 0 })).toBe('ninguno');
  });

  it('al completar, descartar o restaurar conserva las marcas que calculó la lista', () => {
    const devuelta = filaDte({ anteriorALaFechaDeInicio: false, enPlazoDeCredito: false, estado: 'descartado' });
    const resultado = conLasMarcasDeLaLista(devuelta, enPlazo);
    expect(resultado.estado).toBe('descartado');
    expect(resultado.anteriorALaFechaDeInicio).toBe(true);
    expect(resultado.enPlazoDeCredito).toBe(true);
    expect(conLasMarcasDeLaLista(devuelta, undefined)).toBe(devuelta);
  });

  it('la nota sin factura recuerda el formulario solo si la empresa tiene fecha de inicio', () => {
    const nota = filaDte({ tipoDte: 'NCRE' });
    expect(textoDeLoQueFalta(nota)).toBe('Falta la factura que corrige.');
    expect(textoDeLoQueFalta(nota, true)).toBe(
      'Falta la factura que corrige. Si su factura es de antes de la fecha de inicio, regístrela desde el formulario.',
    );
    expect(textoDeLoQueFalta(filaDte({ propuesta: null }), true)).not.toContain('formulario');
  });

  it('el error de nota sin factura de la confirmación en lote suma la salvedad', () => {
    const texto = textoDelError({ codigo: 'dte_nota_sin_factura', mensaje: 'Falta la factura.' });
    expect(texto).toContain('elegir la factura que corrige');
    expect(texto).toContain('regístrela desde el formulario');
  });
});
