import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  clasificacionDeLinea,
  detallesDeAnulacion,
  detallesDeEncabezado,
  detallesDeTarjeta,
  etiquetasDeTarjeta,
  textoDeEstado,
  tonoDeEstado,
  totalesConValor,
} from './detalles-de-documento';
import { documentoEnLista, fichaDeDocumento } from './documentos.soporte';

// Los detalles dan formato con `formatearFecha` y `formatearMonto`, que leen la sesión (Pinia).
beforeEach(() => setActivePinia(createPinia()));

const etiquetas = (detalles: { etiqueta: string }[]) => detalles.map((detalle) => detalle.etiqueta);

describe('tarjeta de un documento', () => {
  it('muestra fecha, total, NIT e IVA', () => {
    expect(etiquetas(detallesDeTarjeta(documentoEnLista()))).toEqual(['Fecha', 'Total', 'NIT', 'IVA']);
  });

  it('un vigente con cartera solo lleva su estado', () => {
    expect(etiquetasDeTarjeta(documentoEnLista())).toEqual([{ texto: 'Vigente', tono: 'campo' }]);
  });

  it('marca «Sin cartera» solo al vigente sin destino', () => {
    expect(etiquetasDeTarjeta(documentoEnLista({ destino: null })).map((e) => e.texto)).toContain('Sin cartera');
    const anulado = etiquetasDeTarjeta(documentoEnLista({ destino: null, estado: 'anulado' })).map((e) => e.texto);
    expect(anulado).toEqual(['Anulado']);
  });

  it('avisa cuando no sale en los reportes de la SAT', () => {
    const textos = etiquetasDeTarjeta(documentoEnLista({ muestraEnReportesSat: false })).map((e) => e.texto);
    expect(textos).toContain('Fuera de reportes SAT');
  });

  it('el estado tiene texto y tono', () => {
    expect(textoDeEstado('anulado')).toBe('Anulado');
    expect(tonoDeEstado('anulado')).toBe('rojo');
    expect(tonoDeEstado('vigente')).toBe('campo');
  });
});

describe('ficha de un documento', () => {
  it('omite los datos vacíos del encabezado', () => {
    const lista = etiquetas(detallesDeEncabezado(fichaDeDocumento({ tipoDte: null })));

    expect(lista).not.toContain('Código SAT');
    expect(lista).not.toContain('Autorización FEL');
    expect(lista).not.toContain('Observaciones');
    expect(lista).not.toContain('Corrige la factura anterior');
  });

  it('muestra el código, la autorización, las observaciones y la factura anterior cuando vienen', () => {
    const ficha = fichaDeDocumento({
      autorizacionFel: 'E0A1B2C3-0000-0000-0000-000000000001',
      observaciones: 'Entrega en finca',
      facturaAnterior: { serie: 'B', numero: '9', fecha: '2025-12-01' },
    });

    expect(etiquetas(detallesDeEncabezado(ficha))).toEqual(
      expect.arrayContaining(['Código SAT', 'Autorización FEL', 'Observaciones', 'Corrige la factura anterior']),
    );
  });

  it('el destino vacío se lee «Sin cartera»', () => {
    const destino = detallesDeEncabezado(fichaDeDocumento({ destino: null })).find((d) => d.etiqueta === 'Destino');
    expect(destino?.valor).toBe('Sin cartera');
  });

  it('la anulación dice causa, fecha y motivo', () => {
    const ficha = fichaDeDocumento({
      estado: 'anulado',
      anulacion: {
        anuladoEn: '2026-11-11T10:00:00Z',
        anuladoPor: 'u1',
        motivo: 'Se repitió',
        causa: 'error_de_captura',
        fecha: '2026-11-11',
      },
    });

    expect(detallesDeAnulacion(ficha)).toEqual([
      { etiqueta: 'Causa', valor: 'Error al registrarlo' },
      expect.objectContaining({ etiqueta: 'Fecha' }),
      { etiqueta: 'Motivo', valor: 'Se repitió', largo: true },
    ]);
    expect(detallesDeAnulacion(fichaDeDocumento())).toEqual([]);
  });

  it('los totales omiten las columnas en cero', () => {
    expect(etiquetas(totalesConValor(fichaDeDocumento()))).toEqual(['Gravado de bienes', 'IVA']);
  });

  it('la línea dice si es bien o servicio y su clase fiscal', () => {
    expect(clasificacionDeLinea(fichaDeDocumento().lineas[0]!)).toBe('Bien · Gravada (con IVA)');
  });
});
