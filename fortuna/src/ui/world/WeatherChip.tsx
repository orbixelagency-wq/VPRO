import { useState } from 'react';
import { dateFromTick, HOURS_PER_DAY } from '../../economy/calendar';
import {
  WEATHER_LABELS,
  type DayForecast,
  type Weather,
  type WeatherKind,
} from '../../economy/weather';

/** Iconos de clima dibujados en SVG (sin recursos externos). */
export function WeatherIcon({
  kind,
  night = false,
  size = 18,
}: {
  kind: WeatherKind;
  night?: boolean;
  size?: number;
}) {
  const stroke = 'currentColor';
  const cloud = (
    <path
      d="M7 17.5h10.2a3.8 3.8 0 0 0 .4-7.6 5.3 5.3 0 0 0-10.2 1.2A3.2 3.2 0 0 0 7 17.5Z"
      fill="rgba(255,255,255,0.14)"
      stroke={stroke}
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  );
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      {kind === 'despejado' &&
        (night ? (
          <path
            d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5Z"
            stroke={stroke}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        ) : (
          <g stroke="#f2c14e" strokeWidth="1.6" strokeLinecap="round">
            <circle cx="12" cy="12" r="4" fill="rgba(242,193,78,0.25)" />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
              <line
                key={a}
                x1={12 + Math.cos((a * Math.PI) / 180) * 6.6}
                y1={12 + Math.sin((a * Math.PI) / 180) * 6.6}
                x2={12 + Math.cos((a * Math.PI) / 180) * 8.6}
                y2={12 + Math.sin((a * Math.PI) / 180) * 8.6}
              />
            ))}
          </g>
        ))}
      {kind === 'nubes' && cloud}
      {kind === 'niebla' && (
        <g stroke={stroke} strokeWidth="1.6" strokeLinecap="round">
          <line x1="4" y1="9" x2="20" y2="9" />
          <line x1="6" y1="13" x2="18" y2="13" />
          <line x1="4" y1="17" x2="17" y2="17" />
        </g>
      )}
      {(kind === 'lluvia' || kind === 'tormenta' || kind === 'nieve') && (
        <g transform="translate(0,-2.5)">
          {cloud}
          {kind === 'lluvia' && (
            <g stroke="#8ec5ff" strokeWidth="1.6" strokeLinecap="round">
              <line x1="9" y1="20" x2="8" y2="22.5" />
              <line x1="13" y1="20" x2="12" y2="22.5" />
              <line x1="17" y1="20" x2="16" y2="22.5" />
            </g>
          )}
          {kind === 'tormenta' && (
            <path
              d="M12.5 18.5 10.5 22h3l-1.5 3.5"
              stroke="#f2c14e"
              strokeWidth="1.6"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}
          {kind === 'nieve' && (
            <g fill="#ffffff">
              <circle cx="9" cy="21.5" r="1" />
              <circle cx="13" cy="22.5" r="1" />
              <circle cx="17" cy="21.5" r="1" />
            </g>
          )}
        </g>
      )}
    </svg>
  );
}

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export function WeatherChip({
  weather,
  forecast,
  night,
}: {
  weather: Weather;
  forecast: DayForecast[];
  night: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="weather">
      <button
        className="weather-chip"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        title="Previsión del tiempo"
      >
        <WeatherIcon kind={weather.kind} night={night} />
        <span className="mono">{Math.round(weather.temp)}°</span>
        <span className="weather-label">{WEATHER_LABELS[weather.kind]}</span>
      </button>
      {open && (
        <div className="forecast" role="dialog" aria-label="Previsión">
          {forecast.map((f, i) => (
            <div className="forecast-day" key={f.dayIndex}>
              <span className="forecast-name">
                {i === 0
                  ? 'Hoy'
                  : i === 1
                    ? 'Mañana'
                    : DAYS[dateFromTick(f.dayIndex * HOURS_PER_DAY).weekday]}
              </span>
              <WeatherIcon kind={f.kind} size={22} />
              <span className="mono">
                {Math.round(f.max)}° <small className="muted">{Math.round(f.min)}°</small>
              </span>
              <small className="forecast-rain">{Math.round(f.rainChance * 100)} %</small>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
