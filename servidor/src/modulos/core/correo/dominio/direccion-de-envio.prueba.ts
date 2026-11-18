import { describe, expect, it } from 'vitest';
import { DireccionDeEnvio } from './direccion-de-envio.js';
import { DireccionNoUtilizable } from './errores-de-correo.js';

describe('DireccionDeEnvio', () => {
  it('acepta una dirección común y pone el dominio en minúsculas', () => {
    const direccion = DireccionDeEnvio.crear('Ana.Lopez+pagos@Finca.GT');
    expect(direccion.valor).toBe('Ana.Lopez+pagos@finca.gt');
    expect(direccion.parteLocal).toBe('Ana.Lopez+pagos');
    expect(direccion.dominio).toBe('finca.gt');
  });

  it('convierte un dominio internacional a punycode', () => {
    expect(DireccionDeEnvio.crear('info@mañana.com').valor).toBe('info@xn--maana-pta.com');
  });

  it.each([
    ['varios destinatarios con coma', 'a@x.com,b@victima.com'],
    ['punto y coma', 'a@x.com;b@victima.com'],
    ['comillas en la parte local', '"x>"@y.com'],
    ['menor y mayor que', 'Ana <a@x.com>'],
    ['paréntesis (comentario)', 'a(comentario)@x.com'],
    ['salto de línea al final', 'a@x.com\r\n'],
    ['cabecera inyectada', 'a@x.com\r\nBcc: b@victima.com'],
    ['salto de línea en medio', 'a\n@x.com'],
    ['carácter nulo', 'a\u0000@x.com'],
    ['bidireccional en la parte local', 'a\u202E@x.com'],
    ['bidireccional en el dominio', 'a@x\u202E.com'],
    ['espacio', 'a b@x.com'],
    ['espacio alrededor', ' a@x.com'],
    ['dos arrobas', 'a@b@x.com'],
    ['sin arroba', 'ax.com'],
    ['sin parte local', '@x.com'],
    ['punto al inicio', '.a@x.com'],
    ['punto al final', 'a.@x.com'],
    ['puntos dobles', 'a..b@x.com'],
    ['letras no ASCII en la parte local', 'añ@x.com'],
    ['dominio sin punto', 'a@localhost'],
    ['dominio con guion al borde', 'a@-x.com'],
    ['dominio con etiqueta vacía', 'a@x..com'],
    ['TLD numérico', 'a@x.123'],
    ['TLD de una letra', 'a@x.c'],
    ['dirección IP entre corchetes', 'a@[127.0.0.1]'],
    ['barra invertida', 'a\\b@x.com'],
    ['vacía', ''],
  ])('rechaza: %s', (_caso, texto) => {
    expect(() => DireccionDeEnvio.crear(texto)).toThrow(DireccionNoUtilizable);
    expect(DireccionDeEnvio.esUtilizable(texto)).toBe(false);
  });

  it('rechaza la parte local de más de 64 caracteres y el total de más de 254', () => {
    expect(DireccionDeEnvio.esUtilizable(`${'a'.repeat(65)}@x.com`)).toBe(false);
    expect(DireccionDeEnvio.esUtilizable(`${'a'.repeat(64)}@x.com`)).toBe(true);
    const etiqueta = 'b'.repeat(60);
    expect(DireccionDeEnvio.esUtilizable(`a@${etiqueta}.${etiqueta}.${etiqueta}.${etiqueta}.${etiqueta}.com`)).toBe(
      false,
    );
  });

  it('el mensaje de error no repite el texto recibido', () => {
    try {
      DireccionDeEnvio.crear('a@x.com\r\nBcc: b@victima.com');
    } catch (error) {
      expect((error as Error).message).not.toContain('Bcc');
    }
  });

  it('dos direcciones iguales son iguales aunque el dominio venga en otra caja', () => {
    expect(DireccionDeEnvio.crear('a@X.com').esIgualA(DireccionDeEnvio.crear('a@x.com'))).toBe(true);
  });
});
