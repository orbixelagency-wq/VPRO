# Matchday — tracker del plan de rendimiento

App (PWA, móvil primero) para seguir día a día el **Plan integral de rendimiento — Extremo Juvenil Preferente** (12 semanas).

## Qué hace

- **Hoy**: etiqueta del día respecto al partido (MD+1 … MD), microciclo de la semana, qué toca (G1–G4, equipo, partido), check-in de la mañana (recuperación Whoop + bienestar 1–5) con las reglas del plan: verde = normal, amarillo o bienestar −4 = −30% volumen, dos rojos seguidos = movilidad en vez de gimnasio.
- **Entreno**: G1–G4 con la prescripción de cada ejercicio, sentadilla calculada según la semana de periodización y tu 1RM, volumen reducido en adaptación/descargas, registro de series (kg · reps · RIR), temporizador de descanso automático, sugerencia de progresión (+2,5–5 kg si todo con RIR 2 y en verde) y RPE × minutos.
- **Dieta**: kcal y macros por tipo de día calculados con tu peso actual (2 g/kg proteína, 5,5–8 g/kg hidratos, 1,5 g/kg grasa), día tipo de comidas para marcar, protocolo de partido, hidratación, suplementación, agua y pesadas con la regla de +0,5–1 kg/mes.
- **Progreso**: tests (sprint 10/30 m, CMJ con h = 9,81·t²/8, RSI, sentadilla RM), 1RM estimado por ejercicio y carga semanal con aviso si sube más de un 15%.
- **Mente**: goles hacia el objetivo de 15, objetivos de proceso por partido, diario post-partido, rutina de reseteo, respiración 4-6 guiada, diálogo interno y visualización.

Los datos se guardan en el dispositivo (localStorage). Desde **Ajustes** se exporta/importa una copia JSON, se cambia la fecha de inicio, el día de partido (sábado/domingo) y los 1RM.

El contenido del plan vive en `src/data/plan.ts`: si el plan cambia, se edita ahí.

## Desarrollo

```bash
cd gym-tracker
npm install
npm run dev            # http://localhost:5175
npm run build          # PWA en dist/
npm run build:single   # un único HTML autocontenido en dist-single/
```
