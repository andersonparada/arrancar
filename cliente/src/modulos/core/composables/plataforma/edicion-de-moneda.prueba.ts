import { describe, expect, it } from 'vitest';
import type { Moneda, OpcionDelBanguat } from '../../servicios/monedas.api';
import {
  ayudaDelCodigo,
  avisoDeCarga,
  cambiosDeLaMoneda,
  confirmacionDeGuardar,
  erroresDelFormulario,
  formularioDeMoneda,
  motivoSinCambiarActiva,
  opcionesDelBanguat,
} from './edicion-de-moneda';

const moneda = (extra: Partial<Moneda> = {}): Moneda => ({
  codigo: 'EUR',
  nombre: 'Euro',
  simbolo: '€',
  decimales: 2,
  activa: false,
  codigoBanguat: null,
  letrasSingular: null,
  letrasPlural: null,
  descripcionBanguat: null,
  tieneSerieDelBanguat: false,
  ...extra,
});

const opcion = (codigo: number, descripcion: string, extra: Partial<OpcionDelBanguat> = {}): OpcionDelBanguat => ({
  codigo,
  descripcion,
  disponible: true,
  excluida: false,
  asignadaA: null,
  vistaPorUltimaVez: '2026-11-18T06:00:00.000Z',
  ...extra,
});

const lista = [
  opcion(29, 'Libras esterlinas'),
  opcion(2, 'Dólares de EE.UU.', { asignadaA: 'USD' }),
  opcion(28, 'Euros'),
  opcion(60, 'DEG', { excluida: true }),
  opcion(99, 'Retirada', { disponible: false }),
];

describe('opcionesDelBanguat', () => {
  it('empieza con «Sin código», ordena por nombre y deja fuera las excluidas y las no disponibles', () => {
    const opciones = opcionesDelBanguat(lista, moneda());

    expect(opciones.map((o) => o.texto)).toEqual([
      'Sin código: no se carga',
      'Dólares de EE.UU. (2), ya es de USD',
      'Euros (28)',
      'Libras esterlinas (29)',
    ]);
  });

  it('las de otra moneda se ven deshabilitadas con el nombre de su dueña; las libres se pueden elegir', () => {
    const opciones = opcionesDelBanguat(lista, moneda());

    expect(opciones.filter((o) => o.deshabilitada).map((o) => o.valor)).toEqual([2]);
  });

  it('con tipos ya cargados solo deja elegir el mismo código o quitarlo', () => {
    const euro = moneda({ codigoBanguat: 28, tieneSerieDelBanguat: true });

    const opciones = opcionesDelBanguat(lista, euro);

    expect(opciones.filter((o) => !o.deshabilitada).map((o) => o.valor)).toEqual([null, 28]);
    expect(opciones.find((o) => o.valor === 29)?.texto).toContain('ya tiene tipos cargados');
  });

  it('el código que ya tiene la moneda se sigue viendo, marcado, aunque haya salido de la lista o esté excluido', () => {
    const retirada = opcionesDelBanguat(lista, moneda({ codigoBanguat: 99 }));
    const excluida = opcionesDelBanguat(lista, moneda({ codigoBanguat: 60 }));

    expect(retirada.find((o) => o.valor === 99)).toMatchObject({ texto: 'Retirada (99) · ya no disponible' });
    expect(retirada.find((o) => o.valor === 99)?.deshabilitada).toBe(false);
    expect(excluida.find((o) => o.valor === 60)?.texto).toBe('DEG (60) · no se ofrece');
  });
});

describe('motivoSinCambiarActiva', () => {
  it('una moneda de dos decimales se puede activar', () => {
    expect(motivoSinCambiarActiva(moneda())).toBeNull();
  });

  it('con decimales distintos de 2 no se activa y dice por qué', () => {
    expect(motivoSinCambiarActiva(moneda({ codigo: 'JPY', decimales: 0 }))).toBe(
      'JPY lleva 0 decimales; por ahora solo se activan monedas de dos decimales.',
    );
  });

  it('el quetzal siempre está activo', () => {
    expect(motivoSinCambiarActiva(moneda({ codigo: 'GTQ', activa: true }))).toMatch(/siempre está activo/);
  });
});

describe('cambiosDeLaMoneda', () => {
  it('sin tocar nada no manda nada', () => {
    expect(cambiosDeLaMoneda(formularioDeMoneda(moneda()))).toEqual({});
  });

  it('manda solo lo que cambió', () => {
    const form = { ...formularioDeMoneda(moneda()), activa: true, codigoBanguat: 28 };

    expect(cambiosDeLaMoneda(form)).toEqual({ activa: true, codigoBanguat: 28 });
  });

  it('las letras viajan juntas y vacías se mandan como nada', () => {
    const conLetras = moneda({ letrasSingular: 'EURO', letrasPlural: 'EUROS' });

    expect(
      cambiosDeLaMoneda({ ...formularioDeMoneda(moneda()), letrasSingular: ' EURO ', letrasPlural: 'EUROS' }),
    ).toEqual({ letrasSingular: 'EURO', letrasPlural: 'EUROS' });
    expect(cambiosDeLaMoneda({ ...formularioDeMoneda(conLetras), letrasSingular: '', letrasPlural: '  ' })).toEqual({
      letrasSingular: null,
      letrasPlural: null,
    });
  });
});

describe('erroresDelFormulario', () => {
  it('pide las dos letras o ninguna', () => {
    const base = formularioDeMoneda(moneda());

    expect(erroresDelFormulario({ ...base, letrasSingular: 'EURO' })).toHaveProperty('letrasPlural');
    expect(erroresDelFormulario({ ...base, letrasPlural: 'EUROS' })).toHaveProperty('letrasSingular');
    expect(erroresDelFormulario({ ...base, letrasSingular: 'EURO', letrasPlural: 'EUROS' })).toEqual({});
    expect(erroresDelFormulario(base)).toEqual({});
  });
});

describe('confirmacionDeGuardar', () => {
  it('desactivar pide confirmar y dice qué pasa con la carga', () => {
    const form = { ...formularioDeMoneda(moneda({ activa: true, codigoBanguat: 28 })), activa: false };

    const confirmacion = confirmacionDeGuardar(form, cambiosDeLaMoneda(form));

    expect(confirmacion?.mensaje).toContain('EUR dejará de ofrecerse');
    expect(confirmacion?.titulo).toBe('Guardar cambios de EUR');
  });

  it('quitar el código pide confirmar y dice que deja de cargar', () => {
    const form = { ...formularioDeMoneda(moneda({ codigoBanguat: 28 })), codigoBanguat: null };

    expect(confirmacionDeGuardar(form, cambiosDeLaMoneda(form))?.mensaje).toContain('Se le quita el código 28');
  });

  it('cambiar de código lo dice con los dos números', () => {
    const form = { ...formularioDeMoneda(moneda({ codigoBanguat: 28 })), codigoBanguat: 29 };

    expect(confirmacionDeGuardar(form, cambiosDeLaMoneda(form))?.mensaje).toContain('pasa de 28 a 29');
  });

  it('asignar un código por primera vez, activar o poner letras no piden confirmar', () => {
    const form = {
      ...formularioDeMoneda(moneda()),
      activa: true,
      codigoBanguat: 28,
      letrasSingular: 'EURO',
      letrasPlural: 'EUROS',
    };

    expect(confirmacionDeGuardar(form, cambiosDeLaMoneda(form))).toBeNull();
  });
});

describe('avisos de la ventana', () => {
  it('dice qué pasará con la carga según esté activa y con código', () => {
    const base = formularioDeMoneda(moneda());

    expect(avisoDeCarga({ ...base, activa: true, codigoBanguat: 28 })).toMatch(/cada noche/);
    expect(avisoDeCarga({ ...base, codigoBanguat: 28 })).toMatch(/inactiva/);
    expect(avisoDeCarga({ ...base, activa: true })).toMatch(/a mano/);
    expect(avisoDeCarga(base)).toBeNull();
  });

  it('el quetzal no habla de carga', () => {
    expect(avisoDeCarga(formularioDeMoneda(moneda({ codigo: 'GTQ', activa: true })))).toBeNull();
  });

  it('con serie cargada explica por qué el selector está limitado', () => {
    const form = formularioDeMoneda(moneda({ codigoBanguat: 28, tieneSerieDelBanguat: true }));

    expect(ayudaDelCodigo(form)).toMatch(/Ya tiene tipos cargados con este código/);
  });
});
