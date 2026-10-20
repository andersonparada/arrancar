import { describe, expect, it } from 'vitest';
import {
  cuerpoDeDocumento,
  edicionVacia,
  pendientesDelRegistro,
  type EdicionDeDocumento,
} from './edicion-de-documento';
import { alCambiarElTipo, opcionesDeMotivo, proponerElNitDeLaEmpresa } from './reglas-del-formulario-de-documento';

const HOY = new Date(2026, 9, 18);
const CON_NIT_DE_LA_EMPRESA = { proveedor: undefined, nitDeLaEmpresa: '1234567-8' };

/** Una factura completa en el libro, lista para registrar, como en `edicion-de-documento.prueba.ts`. */
function facturaCompleta(cambios: Partial<EdicionDeDocumento> = {}): EdicionDeDocumento {
  const edicion = edicionVacia(HOY);
  Object.assign(edicion, {
    proveedorId: 'p-1',
    destino: 'cuentas-por-pagar',
    numero: ' 123 ',
    serie: 'A',
    nitEmisor: '1234567-8',
    autorizacionFel: 'UUID-1',
    ...cambios,
  });
  Object.assign(edicion.lineas[0]!, { conceptoId: 'c-1', total: 112 });
  return edicion;
}

describe('recibo FEL (RECI, RDON)', () => {
  it('va fuera del libro con el motivo recibo_fel y propone el NIT de la empresa', () => {
    const edicion = edicionVacia(HOY);
    edicion.tipoDte = 'RECI';
    alCambiarElTipo(edicion, 'FACT', CON_NIT_DE_LA_EMPRESA);
    expect(edicion).toMatchObject({
      muestraEnReportesSat: false,
      motivoFueraDelLibro: 'recibo_fel',
      nitReceptor: '1234567-8',
    });
  });

  it('el recibo sin FEL sigue con sin_fel y al pasar a él se borran la autorización y el NIT', () => {
    const edicion = { ...edicionVacia(HOY), tipoDte: 'RDON', autorizacionFel: 'UUID' };
    alCambiarElTipo(edicion, 'FACT', CON_NIT_DE_LA_EMPRESA);
    expect(edicion.motivoFueraDelLibro).toBe('recibo_fel');
    edicion.tipoDte = 'RECIBO';
    alCambiarElTipo(edicion, 'RDON', CON_NIT_DE_LA_EMPRESA);
    expect(edicion).toMatchObject({ motivoFueraDelLibro: 'sin_fel', autorizacionFel: '', nitReceptor: '' });
  });

  it('cambiar de RECI a RDON conserva el NIT que ya se escribió', () => {
    const edicion = {
      ...edicionVacia(HOY),
      tipoDte: 'RDON',
      nitReceptor: '999',
      motivoFueraDelLibro: 'recibo_fel' as const,
    };
    alCambiarElTipo(edicion, 'RECI', CON_NIT_DE_LA_EMPRESA);
    expect(edicion.nitReceptor).toBe('999');
  });

  it('el NIT de la empresa puede llegar después del tipo: se propone solo si el receptor está vacío', () => {
    const edicion = { ...edicionVacia(HOY), tipoDte: 'RECI', motivoFueraDelLibro: 'recibo_fel' as const };
    proponerElNitDeLaEmpresa(edicion, '1234567-8');
    expect(edicion.nitReceptor).toBe('1234567-8');
    edicion.nitReceptor = '999';
    proponerElNitDeLaEmpresa(edicion, '1234567-8');
    expect(edicion.nitReceptor).toBe('999');
  });

  it('una factura no recibe el NIT de la empresa como receptor', () => {
    const edicion = edicionVacia(HOY);
    proponerElNitDeLaEmpresa(edicion, '1234567-8');
    expect(edicion.nitReceptor).toBe('');
  });

  it('el motivo recibo_fel no se elige a mano: el selector ofrece los demás, por nombre', () => {
    const valores = opcionesDeMotivo().map(({ valor }) => valor);
    expect(valores).toEqual(expect.arrayContaining(['sin_fel', 'fel_a_consumidor_final', 'fel_a_otro_nit']));
    expect(valores).not.toContain('recibo_fel');
  });
});

describe('recibo FEL en el cuerpo y en lo pendiente', () => {
  it('un recibo FEL manda su código, el motivo recibo_fel y su autorización; sin familia', () => {
    const reciboFel = facturaCompleta({
      tipoDte: 'RDON',
      muestraEnReportesSat: false,
      motivoFueraDelLibro: 'recibo_fel',
      autorizacionFel: 'UUID-9',
      nitReceptor: '1234567-8',
    });
    const cuerpo = cuerpoDeDocumento(reciboFel, [], 'registro');
    expect(cuerpo).toMatchObject({
      tipoDte: 'RDON',
      motivoFueraDelLibro: 'recibo_fel',
      autorizacionFel: 'UUID-9',
      nitReceptor: '1234567-8',
    });
    expect(cuerpo).not.toHaveProperty('tipo');
  });

  it('un recibo FEL pide la autorización de la FEL', () => {
    const sinAutorizacion = facturaCompleta({
      tipoDte: 'RECI',
      muestraEnReportesSat: false,
      motivoFueraDelLibro: 'recibo_fel',
      autorizacionFel: '  ',
    });
    expect(pendientesDelRegistro(sinAutorizacion)).toContain('escribir la autorización de la FEL');
    expect(pendientesDelRegistro({ ...sinAutorizacion, autorizacionFel: 'UUID-1' })).not.toContain(
      'escribir la autorización de la FEL',
    );
  });
});
