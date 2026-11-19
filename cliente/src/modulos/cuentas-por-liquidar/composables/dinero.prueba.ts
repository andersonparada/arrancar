import { describe, expect, it } from 'vitest';
import { centavosDe, centavosDelServidor, sumarMontos, textoDeCentavos } from './dinero';

describe('centavosDe', () => {
  it('convierte montos con hasta dos decimales', () => {
    expect(centavosDe('1250.5')).toBe(125050);
    expect(centavosDe('0.05')).toBe(5);
    expect(centavosDe(300)).toBe(30000);
  });

  it('rechaza lo que no es un importe', () => {
    expect(centavosDe('')).toBeNull();
    expect(centavosDe('1.234')).toBeNull();
    expect(centavosDe('-5')).toBeNull();
    expect(centavosDe('abc')).toBeNull();
  });
});

describe('textoDeCentavos y centavosDelServidor', () => {
  it('van y vienen, también con negativos', () => {
    expect(textoDeCentavos(125050)).toBe('1250.50');
    expect(textoDeCentavos(-4550)).toBe('-45.50');
    expect(centavosDelServidor('-45.50')).toBe(-4550);
    expect(centavosDelServidor('300.00')).toBe(30000);
  });

  it('suma sin errores de punto flotante', () => {
    expect(sumarMontos(['0.10', '0.20', '-0.05'])).toBe('0.25');
  });
});
