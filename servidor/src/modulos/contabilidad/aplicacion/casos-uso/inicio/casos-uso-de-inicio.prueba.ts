import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import {
  AuditoriaEnMemoria,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import { CargaInicialAbierta, InicioInvalido, MascaraConCuentas } from '../../../dominio/errores.js';
import { CuentasEnMemoria } from '../../../pruebas/dobles-de-cuentas.js';
import { CargaInicialFija, IniciosEnMemoria } from '../../../pruebas/dobles-de-inicio.js';
import { Cuenta } from '../../../dominio/cuenta.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { MascaraDeCuentas } from '../../../dominio/mascara-de-cuentas.js';
import type { SolicitudDeInicio } from '../../dto/inicio.dto.js';
import { GuardarInicio } from './guardar-inicio.js';
import { ObtenerInicio } from './obtener-inicio.js';

const operador = operadorDePrueba();

const solicitud = (cambios: Partial<SolicitudDeInicio> = {}): SolicitudDeInicio => ({
  fecha: '2026-01-01',
  caso: 'desde_la_carga',
  mascara: '9.9.99.99.999',
  plantilla: null,
  firmaRepresentante: null,
  firmaContador: null,
  registroDelContador: null,
  ...cambios,
});

let auditoria: AuditoriaEnMemoria;
let cuentas: CuentasEnMemoria;
let carga: CargaInicialFija;

function casosDeUso() {
  auditoria = new AuditoriaEnMemoria();
  cuentas = new CuentasEnMemoria();
  carga = new CargaInicialFija();
  const dependencias = {
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    repositorio: new IniciosEnMemoria(),
    cuentas,
    cargaInicial: carga,
    auditoria,
  };
  return { obtener: new ObtenerInicio(dependencias), guardar: new GuardarInicio(dependencias) };
}

let casos: ReturnType<typeof casosDeUso>;

beforeEach(() => {
  casos = casosDeUso();
});

describe('iniciar la contabilidad', () => {
  it('sin inicio, no existe', async () => {
    await expect(casos.obtener.ejecutar(operador)).rejects.toThrow(RecursoNoEncontrado);
  });

  it('inicia desde la fecha de inicio de la empresa', async () => {
    const guardado = await casos.guardar.ejecutar(operador, solicitud({ firmaRepresentante: 'Ana Pérez' }));

    expect(guardado).toMatchObject({ fecha: '2026-01-01', caso: 'desde_la_carga', firmaRepresentante: 'Ana Pérez' });
    expect(await casos.obtener.ejecutar(operador)).toEqual(guardado);
  });

  it('desde la carga, la fecha es la de inicio de la empresa', async () => {
    await expect(casos.guardar.ejecutar(operador, solicitud({ fecha: '2026-03-01' }))).rejects.toThrow(InicioInvalido);
  });

  it('exige que la empresa tenga fecha de inicio', async () => {
    carga.estado = { fechaDeInicio: null, cerrada: false };

    await expect(casos.guardar.ejecutar(operador, solicitud())).rejects.toThrow(InicioInvalido);
  });

  it('desde una fecha posterior exige la carga cerrada y una fecha después del inicio', async () => {
    const posterior = solicitud({ caso: 'posterior', fecha: '2026-07-01' });

    await expect(casos.guardar.ejecutar(operador, posterior)).rejects.toThrow(CargaInicialAbierta);
    await expect(casos.guardar.ejecutar(operador, solicitud({ caso: 'posterior' }))).rejects.toThrow(InicioInvalido);

    carga.estado = { fechaDeInicio: '2026-01-01', cerrada: true };

    expect(await casos.guardar.ejecutar(operador, posterior)).toMatchObject({ caso: 'posterior', fecha: '2026-07-01' });
  });
});

describe('cambiar el inicio', () => {
  it('cambia los firmantes sin dejar rastro de borrado', async () => {
    await casos.guardar.ejecutar(operador, solicitud());

    const cambiado = await casos.guardar.ejecutar(
      operador,
      solicitud({ firmaContador: 'Luis Gómez', registroDelContador: '1234' }),
    );

    expect(cambiado.firmaContador).toBe('Luis Gómez');
    expect(auditoria.acciones()).toEqual([]);
  });

  it('cambiar la fecha deja la auditoría con cómo estaba', async () => {
    await casos.guardar.ejecutar(operador, solicitud());
    carga.estado = { fechaDeInicio: '2026-01-01', cerrada: true };

    await casos.guardar.ejecutar(operador, solicitud({ caso: 'posterior', fecha: '2026-02-01' }));

    expect(auditoria.acciones()).toEqual(['contabilidad.inicio:corregir']);
  });

  it('la máscara se cambia mientras no haya cuentas, y después ya no', async () => {
    await casos.guardar.ejecutar(operador, solicitud());

    const cambiada = await casos.guardar.ejecutar(operador, solicitud({ mascara: '9.9.99.99' }));
    await cuentas.agregar(
      Cuenta.crear(
        Identificador.desde(operador.empresaId),
        {
          codigo: '1',
          nombre: 'Activo',
          esDeDetalle: false,
          naturaleza: 'deudora',
          tipo: 'balance',
          rubro: null,
          corriente: false,
          claseDeFlujo: null,
          esMonetaria: false,
          pideTercero: false,
          pideCentroDeCosto: false,
          esDeControl: false,
          tratamientoFiscal: 'no_aplica',
          activo: true,
        },
        { mascara: MascaraDeCuentas.desde('9.9.99.99'), padre: null },
      ),
    );

    expect(cambiada.mascara).toBe('9.9.99.99');
    await expect(casos.guardar.ejecutar(operador, solicitud({ mascara: '9.9.99.99.999' }))).rejects.toThrow(
      MascaraConCuentas,
    );
    expect(await casos.guardar.ejecutar(operador, solicitud({ mascara: '9.9.99.99' }))).toBeTruthy();
  });
});
