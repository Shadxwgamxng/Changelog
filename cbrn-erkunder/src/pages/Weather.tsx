import { Page, Panel, Field, Badge } from '../components/ui';
import { TimeChart } from '../components/Charts';
import { useApi, useLive } from '../store';
import { num, dt } from '../lib/format';
import { WeatherCopy } from '../components/WeatherCopy';

export default function Weather() {
  const { weather } = useLive(); const h = useApi<any>('/weather?limit=200', ['weather.updated']);
  const data = (h.data?.history ?? []).map((w: any) => ({ ...w, t: Date.parse(w.ts) }));
  return (
    <Page title="Wetter" right={<WeatherCopy />} sub={"Windrichtung meteorologisch: Wind KOMMT AUS"}>
      {weather && (
        <div className="panel p-3 mb-3 grid grid-cols-8 gap-3">
          <Field label="Temperatur">{num(weather.temperature, 1)} °C</Field><Field label="Luftfeuchtigkeit">{num(weather.humidity, 0)} %</Field><Field label="Luftdruck">{num(weather.pressure, 0)} hPa</Field>
          <Field label="Windgeschwindigkeit">{num(weather.wind_speed, 1)} m/s</Field><Field label="Wind kommt aus">{weather.wind_from_text} ({num(weather.wind_from, 0)}°)</Field>
          <Field label="Bewölkung">{weather.cloud_okta} / 8</Field><Field label="Niederschlag">{num(weather.precipitation, 1)} mm/h</Field><Field label="Zeitpunkt">{dt(weather.ts)}</Field>{weather.game_weather && <Field label="GTA-Wetterlage">{weather.game_weather}</Field>}
        </div>)}
      <div className="grid grid-cols-3 gap-3">
        <Panel title="Wind (Geschwindigkeit)"><TimeChart data={data} series={[{ key: 'wind_speed', color: '#58a6ff', name: 'Wind' }]} unit="m/s" height={190} /></Panel>
        <Panel title="Temperatur"><TimeChart data={data} series={[{ key: 'temperature', color: '#f0500a', name: 'Temperatur' }]} unit="°C" height={190} /></Panel>
        <Panel title="Luftfeuchtigkeit"><TimeChart data={data} series={[{ key: 'humidity', color: '#3fb950', name: 'rF' }]} unit="%" height={190} /></Panel>
        <Panel title="Windrichtung (kommt aus)" className="col-span-3"><TimeChart data={data} series={[{ key: 'wind_from', color: '#d29922', name: 'Windrichtung' }]} unit="°" height={150} yDomain={[0, 360]} /></Panel>
      </div>
    </Page>
  );
}
