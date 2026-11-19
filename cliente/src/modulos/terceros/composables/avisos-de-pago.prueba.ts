import { describe, expect, it } from 'vitest';
import { conAvisosCoherentes, motivoSinAvisosDePago } from './avisos-de-pago';
import { contactoVacio } from './datos-de-tercero';

describe('avisos de pago del contacto', () => {
  it('pide el correo cuando falta', () => {
    expect(motivoSinAvisosDePago(null)).toContain('Escriba el correo');
    expect(motivoSinAvisosDePago('   ')).toContain('Escriba el correo');
  });

  it('acepta un correo normal y rechaza uno con acentos o espacios', () => {
    expect(motivoSinAvisosDePago('rosa.perez@finca.com.gt')).toBeNull();
    expect(motivoSinAvisosDePago('josé@finca.com')).toContain('no sirve');
    expect(motivoSinAvisosDePago('a b@finca.com')).toContain('no sirve');
    expect(motivoSinAvisosDePago('rosa@finca')).toContain('no sirve');
  });

  it('apaga la marca cuando el correo no sirve y la respeta cuando sí', () => {
    const marcado = { ...contactoVacio(), recibeAvisosDePago: true };
    expect(conAvisosCoherentes(marcado).recibeAvisosDePago).toBe(false);
    expect(conAvisosCoherentes({ ...marcado, correo: 'rosa@finca.com' }).recibeAvisosDePago).toBe(true);
  });

  it('el contacto vacío no recibe avisos', () => {
    expect(contactoVacio().recibeAvisosDePago).toBe(false);
  });
});
