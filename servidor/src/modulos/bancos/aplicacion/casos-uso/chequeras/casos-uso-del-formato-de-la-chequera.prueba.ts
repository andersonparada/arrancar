import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import {
  AuditoriaEnMemoria,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import { FormatoDeChequeInactivo } from '../../../dominio/errores-de-impresion.js';
import { FormatoGuardado } from '../../../dominio/formato-guardado.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { ChequerasEnMemoria } from '../../../pruebas/dobles-de-chequeras.js';
import { ChequesEnMemoria, LimiteDeChequeraFijo } from '../../../pruebas/dobles-de-cheques.js';
import { FormatosDeChequeEnMemoria } from '../../../pruebas/dobles-de-formatos-de-cheque.js';
import { MovimientosEnMemoria } from '../../../pruebas/dobles-de-movimientos.js';
import { AsignarFormatoALaChequera } from './asignar-formato-a-la-chequera.js';
import { CrearChequera } from './crear-chequera.js';

const operador = operadorDePrueba();
const CUENTA = '00000000-0000-4000-8000-000000000001';
const cuentaId = Identificador.desde<'Cuenta'>('00000000-0000-4000-8000-0000000000cc');

let formatos: FormatosDeChequeEnMemoria;
let casos: ReturnType<typeof armar>;

function armar() {
  const cheques = new ChequesEnMemoria();
  const chequeras = new ChequerasEnMemoria(cheques);
  const unidadDeTrabajo = new UnidadDeTrabajoEnMemoria();
  const dependencias = {
    unidadDeTrabajo,
    repositorio: chequeras,
    repositorioCheques: cheques,
    consultas: chequeras,
    consultasMovimientos: new MovimientosEnMemoria(),
    limiteDeChequera: new LimiteDeChequeraFijo(5000),
    auditoria: new AuditoriaEnMemoria(),
  };
  return {
    crear: new CrearChequera(dependencias),
    asignar: new AsignarFormatoALaChequera({
      unidadDeTrabajo,
      repositorio: chequeras,
      repositorioDeFormatos: formatos,
      consultas: chequeras,
    }),
  };
}

const rango = (desde: number, hasta: number) => ({ cuentaBancariaId: CUENTA, serie: null, desde, hasta });

async function formatoNuevo(): Promise<FormatoGuardado> {
  const formato = FormatoGuardado.crear(cuentaId, { nombre: 'Banrural', base: 'cheque_suelto', ajustes: {} });
  await formatos.agregar(formato);
  return formato;
}

beforeEach(() => {
  formatos = new FormatosDeChequeEnMemoria();
  casos = armar();
});

describe('asignar el formato a la chequera', () => {
  it('asigna un formato de la cuenta y luego una plantilla de fábrica', async () => {
    const chequera = await casos.crear.ejecutar(operador, rango(1, 10));
    const formato = await formatoNuevo();

    const conFormato = await casos.asignar.ejecutar(operador, {
      chequeraId: chequera.id,
      formatoDeChequeId: formato.id.valor,
      plantillaDeCheque: null,
    });
    const conPlantilla = await casos.asignar.ejecutar(operador, {
      chequeraId: chequera.id,
      formatoDeChequeId: null,
      plantillaDeCheque: 'voucher_carta_arriba',
    });

    expect(conFormato.formatoDeChequeId).toBe(formato.id.valor);
    expect(conPlantilla).toMatchObject({ formatoDeChequeId: null, plantillaDeCheque: 'voucher_carta_arriba' });
  });

  it('un formato que no se ve (otra cuenta) no se encuentra, y uno inactivo no se asigna', async () => {
    const chequera = await casos.crear.ejecutar(operador, rango(1, 10));
    const inactivo = await formatoNuevo();
    inactivo.inactivar();
    await formatos.guardar(inactivo);

    const asignar = (formatoDeChequeId: string) =>
      casos.asignar.ejecutar(operador, { chequeraId: chequera.id, formatoDeChequeId, plantillaDeCheque: null });

    await expect(asignar(crypto.randomUUID())).rejects.toThrow(RecursoNoEncontrado);
    await expect(asignar(inactivo.id.valor)).rejects.toThrow(FormatoDeChequeInactivo);
  });
});

describe('crear una chequera', () => {
  it('toma el formato de la última chequera de la misma cuenta', async () => {
    const primera = await casos.crear.ejecutar(operador, rango(1, 10));
    expect(primera.plantillaDeCheque).toBeNull();
    await casos.asignar.ejecutar(operador, {
      chequeraId: primera.id,
      formatoDeChequeId: null,
      plantillaDeCheque: 'cheque_suelto_casillas',
    });

    const segunda = await casos.crear.ejecutar(operador, rango(11, 20));

    expect(segunda.plantillaDeCheque).toBe('cheque_suelto_casillas');
  });
});
