import { describe, expect, it } from 'vitest';
import { comprobanteDePrueba, documentoDelComprobante } from '../../pruebas/comprobante-de-prueba.js';
import { contenidoDelComprobante } from './contenido-del-comprobante.js';

describe('contenido del PDF del comprobante', () => {
  it('lleva la leyenda de que no es un documento tributario y las hojas original y copia', () => {
    const contenido = contenidoDelComprobante(comprobanteDePrueba());

    expect(contenido.leyendas).toContain('Este comprobante no es un documento tributario.');
    expect(contenido.hojas).toEqual(['Original', 'Copia']);
    expect(contenido.titulo).toBe('Comprobante de pago con cheque No. 2026-15');
  });

  it('agrega la leyenda aunque la lista del comprobante viniera sin ella', () => {
    const contenido = contenidoDelComprobante(comprobanteDePrueba({ leyendas: [] }));

    expect(contenido.leyendas).toEqual(['Este comprobante no es un documento tributario.']);
  });

  it('en efectivo la leyenda habla del recibo', () => {
    const contenido = contenidoDelComprobante(comprobanteDePrueba({ esReciboDeEfectivo: true, leyendas: [] }));

    expect(contenido.leyendas).toEqual(['Este recibo no es un documento tributario.']);
  });

  it('lista las constancias de cada retención y marca las que faltan por emitir', () => {
    const [tabla] = contenidoDelComprobante(comprobanteDePrueba()).tablas;

    expect(tabla?.titulo).toBe('Contraseña CT-9');
    expect(tabla?.filas[0]?.documento).toBe('Factura A-123');
    expect(tabla?.filas[0]?.constancias).toEqual([
      'IVA Q 90.00 · constancia C-77',
      'ISR Q 30.00 · constancia por emitir',
    ]);
    expect(tabla?.filas[0]?.montos).toEqual(['Q 1,120.00', 'Q 120.00', '', 'Q 1,000.00', 'Q 0.00']);
  });

  it('un cheque posfechado lo dice con su fecha', () => {
    const contenido = contenidoDelComprobante(
      comprobanteDePrueba({ pago: { ...comprobanteDePrueba().pago, posfechado: true, fecha: '2026-12-20' } }),
    );

    expect(contenido.posfechado).toBe('Cheque posfechado al 20/12/2026');
    expect(contenidoDelComprobante(comprobanteDePrueba()).posfechado).toBeNull();
  });

  it('un pago anulado sale marcado con su motivo', () => {
    const base = comprobanteDePrueba();
    const contenido = contenidoDelComprobante(
      comprobanteDePrueba({
        pago: { ...base.pago, estado: 'anulado', anulacion: { fecha: '2026-11-19', motivo: 'Cheque extraviado' } },
      }),
    );

    expect(contenido.anulado).toBe('ANULADO — Cheque extraviado');
  });

  it('resume lo pagado, las retenciones y el total que cubre; con varios documentos, el pie de la contraseña', () => {
    const base = comprobanteDePrueba();
    const contenido = contenidoDelComprobante({
      ...base,
      contrasenas: [
        {
          id: 'c',
          numero: 'CT-9',
          pagado: '1500.00',
          documentos: [
            documentoDelComprobante(),
            documentoDelComprobante({ documentoId: 'd2', serie: null, numero: '9' }),
          ],
        },
      ],
    });

    expect(contenido.totales).toEqual([
      'Total pagado Q 1,000.00',
      'MIL QUETZALES CON 00/100',
      'Retenciones Q 120.00 · total que cubre Q 1,120.00',
    ]);
    expect(contenido.tablas[0]?.pie).toBe('Pagado de la contraseña CT-9: Q 1,500.00');
    expect(contenido.tablas[0]?.filas[1]?.documento).toBe('Factura 9');
  });

  it('solo muestra los datos que existen', () => {
    const base = comprobanteDePrueba();
    const contenido = contenidoDelComprobante({
      ...base,
      proveedor: { ...base.proveedor, nit: null },
      pago: { ...base.pago, referencia: 'REF-1', observaciones: 'Entregar en la bodega' },
    });

    const rotulos = contenido.datos.map((dato) => dato.rotulo);
    expect(rotulos).toEqual(['Proveedor', 'A nombre de', 'Fecha', 'Documento bancario', 'Referencia', 'Observaciones']);
    expect(contenido.datos.find((dato) => dato.rotulo === 'Documento bancario')?.valor).toBe(
      'Cheque 1523 · Monetaria Q',
    );
  });

  it('usa la razón social y el nombre comercial solo si es distinto', () => {
    const base = comprobanteDePrueba();

    const igual = contenidoDelComprobante({
      ...base,
      empresa: { ...base.empresa, nombreComercial: 'Rancho Ñandú, S. A.' },
    });
    const distinto = contenidoDelComprobante({ ...base, empresa: { ...base.empresa, nombreComercial: 'El Ñandú' } });

    expect(igual.empresa).toMatchObject({ principal: 'Rancho Ñandú, S. A.', comercial: null });
    expect(distinto.empresa.comercial).toBe('El Ñandú');
  });
});
