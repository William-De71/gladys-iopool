# iopool

## Presentación

Esta integración trae a Gladys las piscinas de su cuenta **iopool** (sonda iopool EcO):

- un dispositivo por piscina: temperatura del agua, pH, redox (ORP), la duración de filtración diaria que recomienda iopool, si iopool pide una acción sobre el agua, y el modo de la piscina (estándar, puesta en marcha, invernaje activo o pasivo);
- disparadores de escena (nueva medida, acción requerida o resuelta, modo de la piscina cambiado, consejo de filtración cambiado, ninguna medida desde hace 24 horas) y una acción de escena (leer una piscina);
- un widget de panel «Agua de la piscina».

iopool no tiene API local: la sonda envía sus medidas a la nube de iopool, y la integración las lee mediante la **API pública oficial de iopool**, en solo lectura, con la clave API de su cuenta (transporte en la nube). La clave solo va a `api.iopool.com`.

![Widget Agua de la piscina, una piscina equilibrada y una piscina para la que iopool pide una acción (ilustración generada, no una captura de pantalla)](https://raw.githubusercontent.com/William-De71/gladys-iopool/main/docs/assets/widgets.es.png)

## Requisitos

- Gladys Assistant 5.3.0 o posterior.
- Una sonda iopool EcO que ya funcione en la aplicación móvil iopool.
- La clave API de su cuenta iopool: en la aplicación iopool, abra los **Ajustes**; la clave está abajo del todo.

## Configuración

1. Integraciones → iopool → Configuración.
2. Pegue la clave API y guarde.

| Campo                      | Descripción                                                                                                     |
| -------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Clave API                  | La clave de la aplicación iopool (Ajustes, abajo del todo), guardada como secreto y nunca mostrada de nuevo.    |
| Intervalo de lectura (min) | De 5 a 60 minutos, 10 por defecto. La sonda mide aproximadamente una vez por hora: no hace falta ir más rápido. |
| Idioma de los textos       | Nombres de las funciones, modos de la piscina y resúmenes de las escenas. Automático: el idioma de su panel.    |

**Probar la clave API** lee la API de iopool e indica cuántas piscinas tiene la cuenta.

## Uso

### Dispositivos

Dispositivos → iopool → **Descubrir**, y añada su piscina («iopool Jardín», según el nombre dado en la aplicación iopool). Sus valores aparecen enseguida.

| Función                | Tipo Gladys                                                                  |
| ---------------------- | ---------------------------------------------------------------------------- |
| Temperatura del agua   | Sensor de temperatura, °C                                                    |
| pH                     | Sensor de pH                                                                 |
| Redox (ORP)            | Sensor ORP, mV                                                               |
| Filtración recomendada | Duración, minutos al día (iopool sigue la temperatura del agua)              |
| Acción requerida       | Texto: «Acción requerida» o «Nada que hacer», como dice la aplicación iopool |
| Modo de la piscina     | Texto: estándar, puesta en marcha, invernaje activo o pasivo                 |

La API de iopool es de solo lectura: nada se controla desde Gladys. Para manejar la bomba, use un enchufe o relé conectado junto con el consejo de filtración.

### Escenas

Disparadores:

- **iopool: nueva medida**: cada nueva medida, con sus valores como variables (y si iopool la validó).
- **iopool: acción requerida**: la aplicación iopool empieza a pedir una acción sobre el agua, o deja de pedirla. Filtre por «Se requiere una acción» para una alerta.
- **iopool: modo de la piscina cambiado**: estándar, puesta en marcha, invernaje activo o pasivo.
- **iopool: consejo de filtración cambiado**: la duración diaria recomendada cambió; su valor en minutos y horas como variables.
- **iopool: medidas interrumpidas**: ninguna medida desde hace 24 horas (pila, wifi, pasarela). Se dispara una vez, nunca en invernaje pasivo.

Acción:

- **iopool: leer una piscina**: temperatura, pH, redox, filtración recomendada, acción requerida, modo de la piscina y una frase lista.

Ejemplos:

- Cuando iopool pide una acción → enviar un mensaje con `{{triggerEvent.data.summary}}`.
- Cuando cambia el consejo de filtración → ajustar cuánto tiempo queda encendido el enchufe de la bomba.
- Cada tarde a las 20:00 → leer la piscina y enviar su resumen.

### Widget

Panel → Editar → añada **Agua de la piscina**. Elija la piscina, el gráfico (temperatura, pH, redox, filtración o ninguno) y su periodo. El gráfico muestra el historial que guarda Gladys: aparece en cuanto se añade el dispositivo de la piscina. Las casillas no tienen color: iopool no publica sus rangos ideales, así que el widget repite lo que dice iopool («Acción requerida») en lugar de adivinar.

## Solución de problemas

- **«iopool rechazó la clave API»**: cópiela de nuevo desde la aplicación iopool (Ajustes, abajo del todo), sin espacios.
- **Ningún dispositivo en Descubrir**: la cuenta aún no tiene piscina, o iopool aún no se ha leído: use «Probar la clave API».
- **«Aún sin medida»**: la sonda todavía se está inicializando; los valores llegan con su primera medida.
- **Valores con algo de retraso**: la sonda mide aproximadamente una vez por hora, y la integración lee la API cada 10 minutos por defecto.
- **«La API de iopool no responde» o «iopool limita las peticiones»**: la integración lo vuelve a intentar en la siguiente lectura.
- **Logs**: añada la variable de entorno `DEBUG=gladys-integration-sdk` y abra una issue en [GitHub](https://github.com/William-De71/gladys-iopool/issues) con las versiones de Gladys y de la integración y los logs (la clave API nunca aparece en ellos).
