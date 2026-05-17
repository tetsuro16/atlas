/**
 * Atlas — Shared Plan Web Viewer
 * Server Component: fetches shared plan via service_role (bypasses RLS).
 * The anon client cannot read shared_plans — only the owner can.
 * This page uses the service_role key to look up by share_token.
 */
import type { Metadata } from 'next';
import { supabaseAdmin, type SharedPlanRow, type TripDayPlan } from '@/lib/supabase-server';

const APP_STORE_URL = 'https://apps.apple.com/app/atlas-travel/id0000000000'; // TODO: 実際のIDに更新

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const { data } = await supabaseAdmin
    .from('shared_plans')
    .select('plan_data, destination, month')
    .eq('share_token', token)
    .eq('is_active', true)
    .maybeSingle<SharedPlanRow>();

  if (!data) return { title: 'Atlas — 旅行プラン' };
  const plan = data.plan_data;
  return {
    title: `${plan.name} — Atlas`,
    description: `${data.destination} ${data.month}月 ・ ${plan.tagline}`,
    openGraph: {
      title: `${plan.name} — Atlas`,
      description: `${data.destination} ${data.month}月 ・ ${plan.tagline}`,
    },
  };
}

export default async function SharedPlanPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const { data, error } = await supabaseAdmin
    .from('shared_plans')
    .select('*')
    .eq('share_token', token)
    .maybeSingle<SharedPlanRow>();

  // トークンが存在しない
  if (error || !data) {
    return (
      <ErrorPage
        title="プランが見つかりません"
        subtitle="このリンクは存在しないか、すでに削除されています。"
        hint="URLが正しいか確認してください。"
      />
    );
  }

  // 期限切れ
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return (
      <ErrorPage
        title="このリンクは期限切れです"
        subtitle="共有リンクの有効期限が過ぎています。"
        hint="プランを共有した本人に新しいリンクを発行してもらってください。"
      />
    );
  }

  // 無効化済み
  if (!data.is_active || data.revoked_at) {
    return (
      <ErrorPage
        title="このリンクは無効化されました"
        subtitle="共有者がリンクを無効化しました。"
        hint="プランを共有した本人に連絡してみてください。"
      />
    );
  }

  const plan = data.plan_data;
  const MONTHS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];

  return (
    <div className="min-h-screen bg-[#080600] text-white">
      {/* Header */}
      <div className="max-w-2xl mx-auto px-4 pt-10 pb-6">
        <div className="flex items-center gap-2 mb-6">
          <span className="text-amber-400 font-bold text-lg tracking-tight">Atlas</span>
          <span className="text-white/20 text-sm">旅行プラン</span>
        </div>

        <h1 className="text-2xl font-bold text-white mb-1">{plan.name}</h1>
        <p className="text-white/50 text-sm mb-3">{plan.tagline}</p>

        <div className="flex flex-wrap gap-2 mb-6">
          <span className="bg-amber-400/10 border border-amber-400/25 text-amber-300 text-xs font-semibold px-3 py-1 rounded-full">
            📍 {data.destination}
          </span>
          <span className="bg-white/5 border border-white/10 text-white/55 text-xs font-semibold px-3 py-1 rounded-full">
            📅 {MONTHS[data.month - 1]} · {plan.days.length}日間
          </span>
          {plan.match != null && (
            <span className="bg-white/5 border border-white/10 text-white/55 text-xs font-semibold px-3 py-1 rounded-full">
              ✦ マッチ度 {plan.match}%
            </span>
          )}
        </div>

        {plan.highlights && plan.highlights.length > 0 && (
          <div className="bg-white/[0.04] border border-white/8 rounded-2xl p-4 mb-6">
            <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-2">ハイライト</p>
            <ul className="space-y-1">
              {plan.highlights.map((h, i) => (
                <li key={i} className="text-white/70 text-sm flex items-start gap-2">
                  <span className="text-amber-400 mt-0.5">✦</span>
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Day cards */}
      <div className="max-w-2xl mx-auto px-4 space-y-6 pb-12">
        {plan.days.map((day: TripDayPlan) => (
          <DayCard key={day.day} day={day} />
        ))}
      </div>

      {/* App CTA */}
      <div className="max-w-2xl mx-auto px-4 pb-16">
        <div className="bg-amber-400/8 border border-amber-400/20 rounded-2xl p-6 text-center">
          <p className="text-amber-300 font-bold text-base mb-1">Atlasで旅を計画する</p>
          <p className="text-white/45 text-sm mb-4">AIが3パターンの旅程を自動生成。天気・服装アドバイスも。</p>
          <a
            href={APP_STORE_URL}
            className="inline-block bg-amber-400 text-[#0d0900] font-bold text-sm px-6 py-3 rounded-full"
          >
            App Storeで開く
          </a>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-white/15 text-xs pb-8 px-4">
        <p>Atlasアプリで作成した旅行プランのスナップショットです</p>
      </div>
    </div>
  );
}

function DayCard({ day }: { day: TripDayPlan }) {
  const outfitItems = day.outfit
    ? day.outfit.split(/[;、+]/).map(s => s.trim()).filter(Boolean)
    : [];

  return (
    <div className="bg-white/[0.03] border border-white/8 rounded-2xl overflow-hidden">
      {/* Day header */}
      <div className="bg-white/[0.04] px-5 py-3 flex items-center gap-3 border-b border-white/6">
        <span className="text-amber-400 font-bold text-sm">Day {day.day}</span>
        {outfitItems.length > 0 && (
          <div className="flex flex-wrap gap-1 ml-auto">
            {outfitItems.slice(0, 3).map((item, i) => (
              <span key={i} className="bg-white/6 border border-white/10 text-white/55 text-[11px] px-2 py-0.5 rounded-full">
                {item}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* dayTips */}
      {day.dayTips && day.dayTips.length > 0 && (
        <div className="px-5 pt-3 pb-0">
          {day.dayTips.map((tip, i) => (
            <p key={i} className="text-amber-300/70 text-xs flex items-start gap-1.5 mb-1">
              <span className="mt-0.5">⚠</span>
              <span>{tip}</span>
            </p>
          ))}
        </div>
      )}

      {/* Activities */}
      <div className="px-5 py-4 space-y-3">
        {day.activities.map((act, i) => (
          <div key={i} className="flex items-start gap-3">
            <span className="text-white/30 text-xs font-mono w-10 shrink-0 mt-0.5">{act.time}</span>
            <div className="flex-1 min-w-0">
              <p className="text-white/85 text-sm font-medium">{act.name}</p>
              <div className="flex flex-wrap gap-2 mt-1">
                <span className="text-white/35 text-xs">⏱ {act.duration}</span>
                {act.transport && (
                  <span className="text-white/35 text-xs">🚶 {act.transport}</span>
                )}
              </div>
              {act.tips && (
                <p className="text-white/40 text-xs mt-1 leading-relaxed">{act.tips}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Meals */}
      {(day.lunch || day.dinner) && (
        <div className="border-t border-white/6 px-5 py-3 flex flex-wrap gap-4">
          {day.lunch && (
            <div>
              <p className="text-white/30 text-xs mb-0.5">🍜 ランチ</p>
              <p className="text-white/65 text-sm">{day.lunch}</p>
            </div>
          )}
          {day.dinner && (
            <div>
              <p className="text-white/30 text-xs mb-0.5">🍷 ディナー</p>
              <p className="text-white/65 text-sm">{day.dinner}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ErrorPage({ title, subtitle, hint }: { title: string; subtitle: string; hint?: string }) {
  return (
    <div className="min-h-screen bg-[#080600] flex flex-col items-center justify-center px-6 text-center">
      <div className="text-amber-400 font-bold text-xl mb-2">Atlas</div>
      <h1 className="text-white text-lg font-bold mb-2">{title}</h1>
      <p className="text-white/45 text-sm mb-2">{subtitle}</p>
      {hint && <p className="text-white/25 text-xs mb-8">{hint}</p>}
      <a
        href="/"
        className="text-amber-400/70 text-sm underline underline-offset-2"
      >
        トップへ戻る
      </a>
    </div>
  );
}
