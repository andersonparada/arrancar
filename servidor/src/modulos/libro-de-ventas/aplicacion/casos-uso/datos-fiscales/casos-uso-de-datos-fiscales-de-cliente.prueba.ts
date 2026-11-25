import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import {
  AuditoriaEnMemoria,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import {
  DatosFiscalesDeClienteInvalidos,
  type PropiedadesFiscalesDeCliente,
} from '../../../dominio/datos-fiscales-de-cliente.js';
import { DatosFiscalesDeClienteEnMemoria } from '../../../pruebas/dobles-de-datos-fiscales-de-cliente.js';
import { GuardarDatosFiscalesDeCliente } from './guardar-datos-fiscales-de-cliente.js';
import { ObtenerDatosFiscalesDeCliente } from './obtener-datos-fiscales-de-cliente.js';

const operador = operadorDePrueba();
const clienteId = randomUUID();

const datos = (cambios: Partial<PropiedadesFiscalesDeCliente> = {}): PropiedadesFiscalesDeCliente => ({
  agenteDeRetencionIva: 'contribuyente_especial',
  exportaProductosAgropecuarios: false,
  retieneIsr: false,
  retieneIvaAPequenoContribuyente: false,
  ...cambios,
});

let auditoria: AuditoriaEnMemoria;
let repositorio: DatosFiscalesDeClienteEnMemoria;
let guardar: GuardarDatosFiscalesDeCliente;
let obtener: ObtenerDatosFiscalesDeCliente;

beforeEach(() => {
  auditoria = new AuditoriaEnMemoria();
  repositorio = new DatosFiscalesDeClienteEnMemoria([clienteId]);
  const unidadDeTrabajo = new UnidadDeTrabajoEnMemoria();
  guardar = new GuardarDatosFiscalesDeCliente({ unidadDeTrabajo, repositorio, auditoria });
  obtener = new ObtenerDatosFiscalesDeCliente({ unidadDeTrabajo, repositorio });
});

describe('datos fiscales de cliente', () => {
  it('sin datos guardados, el cliente no retiene nada y la pantalla lo sabe', async () => {
    expect(await obtener.ejecutar(operador, clienteId)).toEqual({
      clienteId,
      agenteDeRetencionIva: 'ninguno',
      exportaProductosAgropecuarios: false,
      retieneIsr: false,
      retieneIvaAPequenoContribuyente: false,
      guardado: false,
    });
  });

  it('guarda y devuelve lo guardado', async () => {
    await guardar.ejecutar(operador, { clienteId, datos: datos({ retieneIsr: true }) });

    expect(await obtener.ejecutar(operador, clienteId)).toMatchObject({
      agenteDeRetencionIva: 'contribuyente_especial',
      retieneIsr: true,
      guardado: true,
    });
  });

  it('el primer cambio frente a lo que valía por omisión queda en la auditoría, y repetirlo no', async () => {
    await guardar.ejecutar(operador, { clienteId, datos: datos() });
    await guardar.ejecutar(operador, { clienteId, datos: datos() });
    await guardar.ejecutar(operador, { clienteId, datos: datos({ retieneIsr: true }) });

    expect(auditoria.acciones()).toEqual([
      'libro-de-ventas.datos-fiscales-de-cliente:corregir',
      'libro-de-ventas.datos-fiscales-de-cliente:corregir',
    ]);
    expect(auditoria.entradas[0]?.anterior).toMatchObject({ agenteDeRetencionIva: 'ninguno', guardado: false });
    expect(auditoria.entradas[1]?.anterior).toMatchObject({ retieneIsr: false, guardado: true });
  });

  it('no deja pasar datos contradictorios y no guarda nada', async () => {
    const intento = guardar.ejecutar(operador, {
      clienteId,
      datos: datos({ agenteDeRetencionIva: 'ninguno', retieneIvaAPequenoContribuyente: true }),
    });

    await expect(intento).rejects.toThrow(DatosFiscalesDeClienteInvalidos);
    expect(repositorio.filas.size).toBe(0);
  });

  it('avisa si el cliente no existe en la cuenta', async () => {
    await expect(obtener.ejecutar(operador, randomUUID())).rejects.toThrow(RecursoNoEncontrado);
  });
});
