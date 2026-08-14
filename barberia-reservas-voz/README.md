# Reservas por llamada telefónica con IA — Prototipo

Sistema de **recepcionista telefónico con inteligencia artificial** para negocios
de cita previa (barberías, peluquerías, clínicas, talleres…). El cliente llama a
un número, habla con naturalidad y la IA le da cita —comprobando huecos reales y
escribiendo en la agenda del negocio— sin que nadie descuelgue el teléfono.

Este repositorio contiene el **cerebro de reservas** funcionando: catálogo,
cálculo de disponibilidad, motor de reserva y guion del agente. La parte de voz y
telefonía se conecta encima (ver *Fase 2*).

## Probar el prototipo ahora

```bash
node barberia-reservas-voz/demo.mjs
```

Simula una llamada completa contra una agenda en memoria: entiende el servicio en
lenguaje natural, ofrece huecos reales evitando solapamientos, crea la cita y,
como segundo escenario, propone alternativas cuando el día está cerrado.

## Cómo funciona (arquitectura)

```
                 ┌─────────────────────────────────────────────┐
   📞 Llamada ──▶ │  Plataforma de voz (Vapi / Retell / Twilio)  │
                 │   · Voz→texto (Deepgram)                     │
                 │   · Texto→voz (ElevenLabs)                   │
                 └───────────────────┬─────────────────────────┘
                                     │  (function calling)
                            ┌────────▼─────────┐
                            │  Claude (cerebro) │  ← guion-agente.md
                            └────────┬─────────┘
                                     │  llama a 3 herramientas
                       ┌─────────────▼──────────────┐
                       │   Motor de reservas         │  motor.mjs
                       │   · comprobar_disponibilidad│
                       │   · proponer_alternativas   │
                       │   · crear_reserva           │
                       └─────────────┬──────────────┘
                                     │
                       ┌─────────────▼──────────────┐
                       │   Agenda central (única)    │  agenda.mjs
                       │   Google Calendar           │
                       └─────────────┬──────────────┘
                                     │
              La barbería la ve en su móvil  ·  y la web escribe aquí también
```

**Idea clave:** hay **una sola agenda central** (Google Calendar). El teléfono, la
web y el propio negocio miran y escriben en la misma. Así nunca hay dobles
reservas y la barbería no tiene que aprender ninguna app nueva.

## Ficheros

| Fichero | Qué hace |
|---|---|
| `catalogo.mjs` | Servicios, precios, duraciones y horario. **Único sitio a tocar por negocio.** |
| `disponibilidad.mjs` | Calcula huecos libres respetando horario y evitando solapamientos. |
| `agenda.mjs` | Agenda central. Dos versiones: memoria (demo) y Google Calendar (producción). |
| `motor.mjs` | Las 3 herramientas que usa el agente de voz. |
| `demo.mjs` | Simulación ejecutable de una llamada. |
| `guion-agente.md` | System prompt del agente + definición de herramientas. |
| `vapi-config.example.json` | Ejemplo de configuración del asistente de voz. |

De la demo a producción solo se cambia una línea: `AgendaEnMemoria` → `AgendaGoogleCalendar`.
El resto del código no se toca.

## Plan por fases

**Fase 1 — Cerebro de reservas (✅ este prototipo).**
Catálogo, disponibilidad, motor y guion. Se puede demostrar por texto y ya se ha
probado creando una cita real en Google Calendar.

**Fase 2 — La llamada real.**
1. Alta de un número con **Twilio**.
2. Conectar una plataforma de voz (**Vapi** o **Retell**) que junta voz + baja latencia.
3. Enchufar **Claude** como modelo con el guion y las 3 herramientas.
4. Desplegar el motor como un pequeño servicio web (las 3 URLs de `/api/...`).
5. Conectar la **agenda de la barbería** (cuenta de servicio de Google con acceso a su calendario).

**Fase 3 — Extras que venden.**
SMS/WhatsApp de confirmación y recordatorio, cancelaciones por llamada, varios
barberos/sillas en paralelo, panel de métricas (llamadas atendidas, citas creadas).

## Costes orientativos (Fase 2)

Coste variable, sobre todo por minuto de llamada. Estimación de partida:

| Concepto | Coste aprox. |
|---|---|
| Número de teléfono (Twilio) | ~1–2 € / mes |
| Voz + orquestación (Vapi/Retell) | ~0,05–0,12 € / min |
| Voz IA (ElevenLabs) y transcripción | incluido o ~0,02–0,05 € / min |
| Modelo (Claude) | céntimos por llamada |
| **Total por llamada de ~3 min** | **~0,30–0,60 €** |

Con esos números, el modelo de negocio para la agencia es cómodo: cuota mensual al
cliente (setup + mantenimiento) muy por encima del coste por llamada.

> Cifras aproximadas de referencia a fecha de este documento; conviene confirmarlas
> con las tarifas vigentes de cada proveedor antes de presupuestar.

## Activar la agenda de Google en producción

1. Crear una **cuenta de servicio** en Google Cloud y descargar su clave.
2. Compartir el calendario del negocio con el email de la cuenta de servicio (permiso de edición).
3. `npm install googleapis` y rellenar los dos métodos de `AgendaGoogleCalendar` en `agenda.mjs`
   (ya vienen escritos, solo hay que pasarles el cliente autenticado).
