import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { resumenDeRetiroDeEjemplo, retiroDeEjemplo } from './ejemplos-de-retiro.soporte';
import {
  avisosDeMesAnterior,
  cantidadDeFiltrosDeRetiros,
  consultaDeRetiros,
  detallesDeLaFilaDeRetiro,
  diasEntre,
  documentoDelRetiro,
  filtrosInicialesDeRetiros,
  marcaDeLaFilaDeRetiro,
  RETIROS_POR_PAGINA,
  textoDeAntiguedad,
} from './lista-de-retiros';
import {
  detallesDeAnulacionDeRetiro,
  detallesDeFichaDeRetiro,
  detallesDeLaLiquidacion,
  pagosVigentesDelRetiro,
  resumenDeAnularRetiro,
  resumenDeReabrir,
  sePuedePagarConElRetiro,
} from './ficha-de-retiro';
import { opcionesDeCustodios, medioPorOmision } from './opciones-del-retiro';
import { opcionesParaElegirRetiro } from './opciones-de-retiros';
import type { Usuario } from '@/modulos/core/servicios/usuarios.api';

beforeEach(() => setActivePinia(createPinia()));

describe('filtros de la lista', () => {
  it('abre con lo que está por liquidar y sin ningún filtro extra', () => {
    const filtros = filtrosInicialesDeRetiros();
    expect(filtros.estado).toBe('abierto');
    expect(cantidadDeFiltrosDeRetiros(filtros)).toBe(0);
  });

  it('cuenta la fecha de corte, el estado y el interruptor', () => {
    const filtros = {
      ...filtrosInicialesDeRetiros(),
      estado: 'todos' as const,
      corte: '2026-10-31',
      soloConDisponible: true,
    };
    expect(cantidadDeFiltrosDeRetiros(filtros)).toBe(3);
  });

  it('manda al servidor solo lo escrito, con la fecha de corte y la página', () => {
    const consulta = consultaDeRetiros({ ...filtrosInicialesDeRetiros(), corte: '2026-10-31' }, 2);
    expect(consulta).toEqual({
      estado: 'abierto',
      corte: '2026-10-31',
      desde: undefined,
      hasta: undefined,
      soloConDisponible: undefined,
      pagina: 2,
      limite: RETIROS_POR_PAGINA,
    });
  });
});

describe('antigüedad del efectivo', () => {
  it('cuenta los días entre dos fechas y nunca da negativo', () => {
    expect(diasEntre('2026-11-10', '2026-11-15')).toBe(5);
    expect(diasEntre('2026-11-15', '2026-11-10')).toBe(0);
    expect(diasEntre('2026-10-31', '2026-11-01')).toBe(1);
  });

  it('la dice como se habla', () => {
    expect(textoDeAntiguedad('2026-11-15', '2026-11-15')).toBe('hoy');
    expect(textoDeAntiguedad('2026-11-14', '2026-11-15')).toBe('hace 1 día');
    expect(textoDeAntiguedad('2026-11-03', '2026-11-15')).toBe('hace 12 días');
  });
});

describe('tarjeta de un retiro', () => {
  it('un abierto muestra su antigüedad y lo disponible', () => {
    const detalles = detallesDeLaFilaDeRetiro(resumenDeRetiroDeEjemplo(), '2026-11-15', '');
    expect(detalles).toContainEqual({ etiqueta: 'Fecha', valor: '10/11/2026 (hace 5 días)' });
    expect(detalles).toContainEqual({ etiqueta: 'Disponible', valor: 'Q\u00a01,800.00' });
    expect(detalles).toContainEqual({ etiqueta: 'Documento', valor: 'Cheque 1523' });
  });

  it('con fecha de corte el disponible dice a qué fecha es', () => {
    const detalles = detallesDeLaFilaDeRetiro(resumenDeRetiroDeEjemplo(), '2026-11-15', '2026-10-31');
    expect(detalles.some(({ etiqueta }) => etiqueta === 'Disponible al 31/10/2026')).toBe(true);
  });

  it('un liquidado no lleva antigüedad', () => {
    const detalles = detallesDeLaFilaDeRetiro(resumenDeRetiroDeEjemplo({ estado: 'liquidado' }), '2026-11-15', '');
    expect(detalles).toContainEqual({ etiqueta: 'Fecha', valor: '10/11/2026' });
  });

  it('la marca nombra lo cerrado y avisa de lo abierto de un mes anterior', () => {
    expect(marcaDeLaFilaDeRetiro({ estado: 'anulado', deMesAnterior: false })).toBe('Anulado');
    expect(marcaDeLaFilaDeRetiro({ estado: 'abierto', deMesAnterior: true })).toBe('De un mes anterior');
    expect(marcaDeLaFilaDeRetiro({ estado: 'abierto', deMesAnterior: false })).toBeUndefined();
  });

  it('el aviso de fin de mes sale una sola vez por texto', () => {
    const aviso = 'El retiro 3 es de 10/2026 y aún tiene Q\u00a010.00 sin usar.';
    const filas = [
      resumenDeRetiroDeEjemplo({ aviso }),
      resumenDeRetiroDeEjemplo({ aviso }),
      resumenDeRetiroDeEjemplo(),
    ];
    expect(avisosDeMesAnterior(filas)).toEqual([aviso]);
  });

  it('nombra el documento de Bancos según la forma', () => {
    expect(documentoDelRetiro('nota_de_debito', 45)).toBe('Nota de débito 45');
  });
});

describe('ficha del retiro', () => {
  it('los datos incluyen custodio, documento, lo pagado y lo disponible', () => {
    const detalles = detallesDeFichaDeRetiro(retiroDeEjemplo({ observaciones: 'Quincena' }));
    expect(detalles).toContainEqual({ etiqueta: 'Estado', valor: 'Por liquidar' });
    expect(detalles).toContainEqual({ etiqueta: 'Pagado a proveedores', valor: 'Q\u00a03,200.00' });
    expect(detalles).toContainEqual({ etiqueta: 'Observaciones', valor: 'Quincena' });
  });

  it('la liquidación muestra el depósito y el faltante con su motivo solo si los hubo', () => {
    expect(detallesDeLaLiquidacion(retiroDeEjemplo())).toEqual([]);
    const liquidado = retiroDeEjemplo({
      estado: 'liquidado',
      devuelto: '1500.00',
      faltante: '300.00',
      motivoDeFaltante: 'Se perdió',
      liquidacion: { fecha: '2026-11-12', deposito: { id: 'd1', cuentaBancariaId: 'b1', numero: 88 } },
    });
    const detalles = detallesDeLaLiquidacion(liquidado);
    expect(detalles).toContainEqual({ etiqueta: 'Devuelto al banco', valor: 'Q\u00a01,500.00 · nota de crédito 88' });
    expect(detalles).toContainEqual({ etiqueta: 'Faltante', valor: 'Q\u00a0300.00' });
    expect(detalles).toContainEqual({ etiqueta: 'Por qué faltó', valor: 'Se perdió' });
  });

  it('la anulación muestra su fecha y su motivo', () => {
    const anulado = retiroDeEjemplo({ anulacion: { fecha: '2026-11-11', motivo: 'Error' } });
    expect(detallesDeAnulacionDeRetiro(anulado)).toHaveLength(2);
    expect(detallesDeAnulacionDeRetiro(retiroDeEjemplo())).toEqual([]);
  });

  it('solo se paga con un retiro abierto al que le queda efectivo', () => {
    expect(sePuedePagarConElRetiro(retiroDeEjemplo())).toBe(true);
    expect(sePuedePagarConElRetiro(retiroDeEjemplo({ disponible: '0.00' }))).toBe(false);
    expect(sePuedePagarConElRetiro(retiroDeEjemplo({ estado: 'liquidado' }))).toBe(false);
  });

  it('los pagos vigentes son los que cuentan para imprimir recibos', () => {
    const pago = { id: 'p1', numero: '1', proveedor: { id: 'x', nombre: 'A' }, fecha: '2026-11-11', monto: '10.00' };
    const retiro = retiroDeEjemplo({
      pagos: [
        { ...pago, estado: 'vigente' },
        { ...pago, id: 'p2', estado: 'anulado' },
      ],
    });
    expect(pagosVigentesDelRetiro(retiro).map(({ id }) => id)).toEqual(['p1']);
  });

  it('reabrir cuenta qué pasa con el depósito y con el faltante', () => {
    const liquidado = retiroDeEjemplo({
      estado: 'liquidado',
      devuelto: '1500.00',
      faltante: '300.00',
      liquidacion: { fecha: '2026-11-12', deposito: { id: 'd1', cuentaBancariaId: 'b1', numero: 88 } },
    });
    const texto = resumenDeReabrir(liquidado);
    expect(texto).toContain('anulará el depósito de Q\u00a01,500.00');
    expect(texto).toContain('faltante de Q\u00a0300.00 se borra');
  });

  it('anular dice qué pasa en Bancos', () => {
    expect(resumenDeAnularRetiro(retiroDeEjemplo())).toContain('cheque 1523');
  });
});

describe('opciones', () => {
  const usuario = (cambios: Partial<Usuario>): Usuario => ({
    id: 'u',
    usuario: 'u',
    nombres: 'Ana',
    apellidos: 'López',
    correo: null,
    activo: true,
    ultimoAccesoEn: null,
    empresas: [{ empresaId: 'e1', empresaNombre: 'Finca' }],
    roles: [],
    totalPermisosDirectos: 0,
    ...cambios,
  });

  it('los custodios son usuarios activos de la empresa, por nombre, tras la opción de escribir uno', () => {
    const usuarios = [
      usuario({ id: 'b', nombres: 'Zoila', usuario: 'zoila' }),
      usuario({ id: 'a', nombres: 'Ana', usuario: 'ana' }),
      usuario({ id: 'c', nombres: 'Inactivo', activo: false }),
      usuario({ id: 'd', nombres: 'Otra', empresas: [{ empresaId: 'e2', empresaNombre: 'Otra' }] }),
    ];
    const opciones = opcionesDeCustodios(usuarios, 'e1');
    expect(opciones.map(({ valor }) => valor)).toEqual(['', 'a', 'b']);
    expect(opciones[0]!.texto).toContain('escribir el nombre');
  });

  it('los retiros para pagar van del más reciente al más viejo con lo que les queda', () => {
    const opciones = opcionesParaElegirRetiro([
      resumenDeRetiroDeEjemplo({ id: 'viejo', fecha: '2026-10-01', numero: '2026-1' }),
      resumenDeRetiroDeEjemplo({ id: 'nuevo', fecha: '2026-11-10', numero: '2026-4' }),
    ]);
    expect(opciones.map(({ valor }) => valor)).toEqual(['nuevo', 'viejo']);
    expect(opciones[0]!.texto).toContain('le quedan Q\u00a01,800.00');
  });

  it('la chequera o la cuenta se deja elegida solo si hay una única que se pueda usar', () => {
    const cuenta = (chequeras: { chequeraId: string; siguienteNumero: number | null }[]) => ({
      cuentas: [
        {
          cuentaBancariaId: 'b1',
          nombre: 'Monetaria',
          bancoNombre: null,
          numero: '1',
          saldoCentavos: 0,
          chequeras: chequeras.map((c) => ({ ...c, serie: null, siguienteChequeId: null })),
        },
      ],
    });
    expect(medioPorOmision('cheque', cuenta([{ chequeraId: 'c1', siguienteNumero: 5 }]))).toBe('c1');
    expect(medioPorOmision('cheque', cuenta([{ chequeraId: 'c1', siguienteNumero: null }]))).toBe('');
    expect(medioPorOmision('nota_de_debito', cuenta([]))).toBe('b1');
    expect(medioPorOmision('cheque', null)).toBe('');
  });
});
