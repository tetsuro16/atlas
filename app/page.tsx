"use client";

import { useState } from "react";

type PersonalityType = "cold" | "normal" | "hot";

type WeatherData = {
  city: string;
  temperature: number;
  apparentTemperature: number;
  precipitation: number;
  windspeed: number;
  weathercode: number;
  daily: DailyForecast[];
};

type DailyForecast = {
  date: string;
  maxTemp: number;
  minTemp: number;
  apparentMax: number;
  precipitation: number;
  weathercode: number;
};

function getWeatherDescription(code: number): string {
  if (code === 0) return "快晴";
  if (code <= 3) return "晴れ";
  if (code <= 48) return "霧";
  if (code <= 67) return "雨";
  if (code <= 77) return "雪";
  if (code <= 82) return "にわか雨";
  return "嵐";
}

function getWeatherEmoji(code: number): string {
  if (code === 0) return "☀️";
  if (code <= 3) return "🌤️";
  if (code <= 48) return "🌫️";
  if (code <= 67) return "🌧️";
  if (code <= 77) return "❄️";
  if (code <= 82) return "🌦️";
  return "⛈️";
}

function getBgGradient(code: number): string {
  if (code === 0) return "from-amber-400 to-orange-500";
  if (code <= 3) return "from-sky-400 to-blue-500";
  if (code <= 48) return "from-slate-400 to-slate-500";
  if (code <= 67) return "from-slate-500 to-blue-700";
  if (code <= 77) return "from-sky-200 to-slate-400";
  if (code <= 82) return "from-sky-400 to-slate-500";
  return "from-slate-600 to-slate-800";
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const days = ["日", "月", "火", "水", "木", "金", "土"];
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayOfWeek = days[date.getDay()];
  return `${month}/${day}（${dayOfWeek}）`;
}

// パーソナリティに応じて体感温度を補正する
function adjustApparent(apparent: number, personality: PersonalityType): number {
  if (personality === "cold") return apparent - 3; // 寒がりは寒く感じる
  if (personality === "hot") return apparent + 3;  // 暑がりは暖かく感じる
  return apparent;
}

function getOutfitSuggestion(
  apparent: number,
  precipitation: number,
  windspeed: number,
  personality: PersonalityType
): string[] {
  const suggestions: string[] = [];
  const adjusted = adjustApparent(apparent, personality);

  if (adjusted < 5) {
    suggestions.push("ヘビーコート・マフラー・手袋が必須");
    suggestions.push("重ね着を前提に、保温性の高いインナーを");
  } else if (adjusted < 10) {
    suggestions.push("厚手のコートかダウンジャケット");
    suggestions.push("セーターやフリースを中に着ると快適");
  } else if (adjusted < 15) {
    suggestions.push("ライトジャケットかトレンチコート");
    suggestions.push("長袖シャツ＋薄手のニットが目安");
  } else if (adjusted < 20) {
    suggestions.push("薄手の上着があると安心");
    suggestions.push("長袖シャツ1枚でも過ごせる気温");
  } else if (adjusted < 25) {
    suggestions.push("半袖で快適に過ごせる");
    suggestions.push("夜は薄手の羽織りものを持っておくと安心");
  } else {
    suggestions.push("半袖・通気性の良い服が快適");
    suggestions.push("日差し対策に帽子やサングラスを");
  }

  if (precipitation > 1) {
    suggestions.push("雨具（折りたたみ傘またはレインコート）が必要");
  }
  if (windspeed > 30) {
    suggestions.push("風が強いので、はおりものは止められるものを");
  }

  return suggestions;
}

const PERSONALITY_OPTIONS: { value: PersonalityType; label: string; desc: string }[] = [
  { value: "cold", label: "寒がり", desc: "すぐ寒く感じる" },
  { value: "normal", label: "普通", desc: "平均的な体感" },
  { value: "hot", label: "暑がり", desc: "すぐ暑く感じる" },
];

export default function Home() {
  const [city, setCity] = useState("");
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [personality, setPersonality] = useState<PersonalityType>("normal");

  async function handleSearch() {
    if (!city.trim()) return;
    setLoading(true);
    setError("");
    setWeather(null);

    try {
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=ja`
      );
      const geoData = await geoRes.json();

      if (!geoData.results || geoData.results.length === 0) {
        setError("場所が見つかりませんでした。別の都市名を試してください。");
        setLoading(false);
        return;
      }

      const { latitude, longitude, name } = geoData.results[0];

      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,precipitation,weathercode,windspeed_10m&daily=temperature_2m_max,temperature_2m_min,apparent_temperature_max,precipitation_sum,weathercode&timezone=auto`
      );
      const weatherData = await weatherRes.json();
      const current = weatherData.current;
      const daily = weatherData.daily;

      const dailyForecasts: DailyForecast[] = daily.time.map(
        (date: string, i: number) => ({
          date,
          maxTemp: Math.round(daily.temperature_2m_max[i]),
          minTemp: Math.round(daily.temperature_2m_min[i]),
          apparentMax: Math.round(daily.apparent_temperature_max[i]),
          precipitation: daily.precipitation_sum[i],
          weathercode: daily.weathercode[i],
        })
      );

      setWeather({
        city: name,
        temperature: Math.round(current.temperature_2m),
        apparentTemperature: Math.round(current.apparent_temperature),
        precipitation: current.precipitation,
        windspeed: Math.round(current.windspeed_10m),
        weathercode: current.weathercode,
        daily: dailyForecasts,
      });
    } catch {
      setError("データの取得に失敗しました。もう一度お試しください。");
    }

    setLoading(false);
  }

  const outfit = weather
    ? getOutfitSuggestion(
        weather.apparentTemperature,
        weather.precipitation,
        weather.windspeed,
        personality
      )
    : [];

  const bgGradient = weather ? getBgGradient(weather.weathercode) : "from-slate-700 to-slate-900";

  return (
    <div className={`min-h-screen bg-gradient-to-br ${bgGradient} transition-all duration-700`}>
      <div className="min-h-screen backdrop-blur-[1px] flex flex-col items-center px-4 py-12">
        <div className="w-full max-w-md">

          {/* ヘッダー */}
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold tracking-tight text-white drop-shadow">Atlas</h1>
            <p className="mt-1 text-sm text-white/60">Everything you need, wherever you are.</p>
          </div>

          {/* パーソナリティ選択 */}
          <div className="mb-4 rounded-2xl bg-white/10 backdrop-blur border border-white/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-3">あなたの体質</p>
            <div className="grid grid-cols-3 gap-2">
              {PERSONALITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPersonality(opt.value)}
                  className={`rounded-xl py-2.5 px-3 text-center transition-all ${
                    personality === opt.value
                      ? "bg-white text-slate-800 font-semibold shadow"
                      : "bg-white/10 text-white/70 hover:bg-white/20"
                  }`}
                >
                  <p className="text-sm font-medium">{opt.label}</p>
                  <p className={`text-xs mt-0.5 ${personality === opt.value ? "text-slate-500" : "text-white/40"}`}>
                    {opt.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* 検索エリア */}
          <div className="flex gap-2 mb-6">
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="都市名を入力（例：Tokyo, Paris）"
              className="flex-1 rounded-2xl border-0 bg-white/20 backdrop-blur px-4 py-3.5 text-sm text-white placeholder-white/50 outline-none focus:bg-white/30 focus:ring-2 focus:ring-white/40 transition-all"
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="rounded-2xl bg-white/20 backdrop-blur px-5 py-3.5 text-sm font-semibold text-white hover:bg-white/30 disabled:opacity-40 transition-all active:scale-95"
            >
              {loading ? "..." : "検索"}
            </button>
          </div>

          {/* エラー */}
          {error && (
            <div className="mb-4 rounded-2xl bg-red-500/20 backdrop-blur px-4 py-3 text-sm text-white border border-red-400/30">
              {error}
            </div>
          )}

          {/* 天気メインカード */}
          {weather && (
            <div className="space-y-3">
              <div className="rounded-3xl bg-white/15 backdrop-blur-md border border-white/20 p-6 shadow-xl">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white">{weather.city}</h2>
                    <p className="text-sm text-white/60 mt-0.5">{getWeatherDescription(weather.weathercode)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-6xl font-thin text-white leading-none">{weather.temperature}°</p>
                    <p className="text-sm text-white/60 mt-1">体感 {weather.apparentTemperature}°</p>
                  </div>
                </div>
                <div className="mt-5 flex gap-4 text-sm text-white/50 border-t border-white/10 pt-4">
                  <span>降水 {weather.precipitation}mm</span>
                  <span>風速 {weather.windspeed}km/h</span>
                </div>
              </div>

              {/* 服装提案カード */}
              <div className="rounded-3xl bg-black/20 backdrop-blur-md border border-white/10 p-5 shadow-xl">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-white/40">Outfit</p>
                  <span className="text-xs text-white/30">
                    {personality === "cold" ? "寒がり設定" : personality === "hot" ? "暑がり設定" : "標準設定"}
                  </span>
                </div>
                <ul className="space-y-2">
                  {outfit.map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-white/90">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-white/40 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* 7日間予報カード */}
              <div className="rounded-3xl bg-white/10 backdrop-blur-md border border-white/10 overflow-hidden shadow-xl">
                <div className="px-5 pt-4 pb-2">
                  <p className="text-xs font-semibold uppercase tracking-widest text-white/40">7-Day Forecast</p>
                </div>
                <ul>
                  {weather.daily.map((day, i) => (
                    <li
                      key={day.date}
                      className={`flex items-center justify-between px-5 py-3 text-sm ${
                        i !== weather.daily.length - 1 ? "border-b border-white/5" : ""
                      } ${i === 0 ? "bg-white/10" : ""}`}
                    >
                      <span className={`w-24 ${i === 0 ? "font-semibold text-white" : "text-white/60"}`}>
                        {i === 0 ? "今日" : formatDate(day.date)}
                      </span>
                      <span className="text-base">{getWeatherEmoji(day.weathercode)}</span>
                      <div className="flex items-center gap-3">
                        {day.precipitation > 1 && (
                          <span className="text-xs text-sky-300">{day.precipitation}mm</span>
                        )}
                        <span className="text-white/40 text-xs">{day.minTemp}°</span>
                        <span className="font-medium text-white">{day.maxTemp}°</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* 初期状態 */}
          {!weather && !loading && !error && (
            <div className="text-center text-sm text-white/40 mt-8">
              体質を選んで、都市名を入力しましょう
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
