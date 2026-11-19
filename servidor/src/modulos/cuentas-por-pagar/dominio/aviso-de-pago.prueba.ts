import { describe, expect, it } from 'vitest';
import {
  MARCADORES_DEL_ASUNTO,
  MARCADORES_DEL_MENSAJE,
  destinatariosPosibles,
  documentosEnTexto,
  motivoSinAviso,
  problemaEnLaPlantilla,
  type CorreosDelProveedor,
} from './aviso-de-pago.js';

const proveedor = (cambios: Partial<CorreosDelProveedor> = {}): CorreosDelProveedor => ({
  terceroId: 't-1',
  nombre: 'Agroservicios',
  correo: null,
  contactos: [],
  ...cambios,
});

describe('motivoSinAviso', () => {
  it.each(['cheque', 'nota_de_debito', 'nota_ligada', 'efectivo'] as const)(
    'un pago %s vigente admite aviso',
    (forma) => {
      expect(motivoSinAviso({ forma, estado: 'vigente' })).toBeNull();
    },
  );

  it('un pago anulado no admite aviso', () => {
    expect(motivoSinAviso({ forma: 'cheque', estado: 'anulado' })).toBe('El pago está anulado.');
  });

  it('un pago a la cuenta de apertura no lleva aviso', () => {
    expect(motivoSinAviso({ forma: 'cuenta_de_apertura', estado: 'vigente' })).toContain('cuenta de apertura');
  });
});

describe('destinatariosPosibles', () => {
  it('preselecciona los contactos con la marca y deja el correo principal sin marcar', () => {
    const posibles = destinatariosPosibles(
      proveedor({
        correo: 'ventas@agro.com',
        contactos: [
          { id: 'c-1', nombre: 'Ana', correo: 'ana@agro.com', recibeAvisosDePago: true },
          { id: 'c-2', nombre: 'Beto', correo: 'beto@agro.com', recibeAvisosDePago: false },
          { id: 'c-3', nombre: 'Sin correo', correo: null, recibeAvisosDePago: true },
        ],
      }),
    );

    expect(posibles.map((p) => [p.origen, p.nombre, p.preseleccionado])).toEqual([
      ['contacto', 'Ana', true],
      ['contacto', 'Beto', false],
      ['tercero', 'Agroservicios', false],
    ]);
  });

  it('si ningún contacto tiene la marca, preselecciona el correo principal', () => {
    const posibles = destinatariosPosibles(
      proveedor({
        correo: 'ventas@agro.com',
        contactos: [{ id: 'c-2', nombre: 'Beto', correo: 'beto@agro.com', recibeAvisosDePago: false }],
      }),
    );

    expect(posibles.find((p) => p.origen === 'tercero')?.preseleccionado).toBe(true);
    expect(posibles.find((p) => p.origen === 'contacto')?.preseleccionado).toBe(false);
  });

  it('un correo que no sirve para enviar no se preselecciona y dice por qué', () => {
    const [rara, principal] = destinatariosPosibles(
      proveedor({
        correo: 'ventas@agro.com',
        contactos: [{ id: 'c-1', nombre: 'Rara', correo: 'a,b@agro.com', recibeAvisosDePago: true }],
      }),
    );

    expect(rara).toMatchObject({
      utilizable: false,
      preseleccionado: false,
      motivo: expect.stringContaining('no se puede usar'),
    });
    expect(principal).toMatchObject({ utilizable: true, preseleccionado: true });
  });

  it('sin ningún correo no hay a quién avisar', () => {
    expect(destinatariosPosibles(proveedor())).toEqual([]);
  });
});

describe('documentosEnTexto', () => {
  it('junta serie y número, y sin serie solo el número', () => {
    expect(
      documentosEnTexto([
        { serie: 'A', numero: '12' },
        { serie: null, numero: '7' },
      ]),
    ).toBe('A-12, 7');
  });

  it('muestra hasta 20 y resume el resto', () => {
    const muchos = Array.from({ length: 23 }, (_, i) => ({ serie: null, numero: String(i + 1) }));

    const texto = documentosEnTexto(muchos);

    expect(texto.endsWith('20 y 3 más')).toBe(true);
    expect(texto).not.toContain('21');
  });
});

describe('problemaEnLaPlantilla', () => {
  it('el asunto no admite el monto ni los documentos, el mensaje sí', () => {
    expect(problemaEnLaPlantilla('Pago por {monto}', MARCADORES_DEL_ASUNTO)).toContain('{monto}');
    expect(problemaEnLaPlantilla('Pago por {monto} de {documentos}', MARCADORES_DEL_MENSAJE)).toBeNull();
  });

  it('un marcador inventado se señala y un texto sin marcadores está bien', () => {
    expect(problemaEnLaPlantilla('Hola {nit}', MARCADORES_DEL_MENSAJE)).toContain('{nit}');
    expect(problemaEnLaPlantilla('Hola', MARCADORES_DEL_MENSAJE)).toBeNull();
  });
});
