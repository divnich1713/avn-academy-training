import { useMemo } from "react";
import Icon from "@/components/ui/icon";
import type { InstructorRating } from "@/lib/api";

// ═══════════════════════════════════════════════════════════════════════════════
// ACHIEVEMENT DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

type AchievementTier = "bronze" | "silver" | "gold" | "platinum";
type AchievementCategory = "basics" | "mastery" | "rating" | "elite";

interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: AchievementTier;
  category: AchievementCategory;
  check: (r: InstructorRating, rankIndex: number) => boolean;
  progress: (r: InstructorRating, rankIndex: number) => { current: number; target: number };
}

const TIER_COLORS: Record<AchievementTier, { bg: string; border: string; text: string; glow: string; icon: string }> = {
  bronze: {
    bg: "bg-amber-950/30",
    border: "border-amber-700/60",
    text: "text-amber-400",
    glow: "shadow-[0_0_12px_rgba(217,119,6,0.25)]",
    icon: "text-amber-500",
  },
  silver: {
    bg: "bg-slate-800/40",
    border: "border-slate-400/50",
    text: "text-slate-300",
    glow: "shadow-[0_0_12px_rgba(148,163,184,0.3)]",
    icon: "text-slate-300",
  },
  gold: {
    bg: "bg-yellow-950/30",
    border: "border-yellow-500/60",
    text: "text-yellow-400",
    glow: "shadow-[0_0_16px_rgba(234,179,8,0.3)]",
    icon: "text-yellow-400",
  },
  platinum: {
    bg: "bg-cyan-950/30",
    border: "border-cyan-400/60",
    text: "text-cyan-300",
    glow: "shadow-[0_0_20px_rgba(34,211,238,0.35)]",
    icon: "text-cyan-300",
  },
};

const CATEGORY_LABELS: Record<AchievementCategory, { label: string; icon: string }> = {
  basics: { label: "Основные", icon: "Award" },
  mastery: { label: "Мастерство", icon: "Target" },
  rating: { label: "Рейтинг", icon: "TrendingUp" },
  elite: { label: "Элита", icon: "Crown" },
};

const ACHIEVEMENTS: AchievementDef[] = [
  // ── Основные ──
  {
    id: "first_step",
    name: "Первый шаг",
    description: "Провести 1 лекцию",
    icon: "BookOpen",
    tier: "bronze",
    category: "basics",
    check: (r) => r.lectures_count >= 1,
    progress: (r) => ({ current: Math.min(r.lectures_count, 1), target: 1 }),
  },
  {
    id: "practitioner",
    name: "Практик",
    description: "Провести 5 практик",
    icon: "Wrench",
    tier: "bronze",
    category: "basics",
    check: (r) => r.practices_count >= 5,
    progress: (r) => ({ current: Math.min(r.practices_count, 5), target: 5 }),
  },
  {
    id: "activist",
    name: "Активист",
    description: "Набрать 50 баллов рейтинга",
    icon: "Zap",
    tier: "bronze",
    category: "basics",
    check: (r) => r.points >= 50,
    progress: (r) => ({ current: Math.min(r.points, 50), target: 50 }),
  },

  // ── Мастерство ──
  {
    id: "examiner",
    name: "Экзаменатор",
    description: "Провести 3 экзамена",
    icon: "ClipboardList",
    tier: "silver",
    category: "mastery",
    check: (r) => r.exams_count >= 3,
    progress: (r) => ({ current: Math.min(r.exams_count, 3), target: 3 }),
  },
  {
    id: "reviewer",
    name: "Ревизор",
    description: "Проверить 10 рапортов",
    icon: "FileCheck",
    tier: "silver",
    category: "mastery",
    check: (r) => r.reviews_count >= 10,
    progress: (r) => ({ current: Math.min(r.reviews_count, 10), target: 10 }),
  },
  {
    id: "veteran",
    name: "Ветеран",
    description: "Набрать 100 баллов рейтинга",
    icon: "Flame",
    tier: "silver",
    category: "mastery",
    check: (r) => r.points >= 100,
    progress: (r) => ({ current: Math.min(r.points, 100), target: 100 }),
  },
  {
    id: "universal",
    name: "Универсал",
    description: "3+ лекций, 3+ практик, 1+ экзамен",
    icon: "Medal",
    tier: "silver",
    category: "mastery",
    check: (r) => r.lectures_count >= 3 && r.practices_count >= 3 && r.exams_count >= 1,
    progress: (r) => {
      const parts = [
        Math.min(r.lectures_count, 3),
        Math.min(r.practices_count, 3),
        Math.min(r.exams_count, 1),
      ];
      return { current: parts.reduce((a, b) => a + b, 0), target: 7 };
    },
  },

  // ── Рейтинг ──
  {
    id: "bronze_place",
    name: "Бронза",
    description: "Войти в Топ-3 рейтинга",
    icon: "Medal",
    tier: "bronze",
    category: "rating",
    check: (_, rankIndex) => rankIndex >= 0 && rankIndex <= 2,
    progress: (_, rankIndex) => ({ current: rankIndex >= 0 && rankIndex <= 2 ? 1 : 0, target: 1 }),
  },
  {
    id: "silver_place",
    name: "Серебро",
    description: "Занять 2-е место в рейтинге",
    icon: "Award",
    tier: "silver",
    category: "rating",
    check: (_, rankIndex) => rankIndex === 1,
    progress: (_, rankIndex) => ({ current: rankIndex === 1 ? 1 : 0, target: 1 }),
  },
  {
    id: "gold_place",
    name: "Первое место",
    description: "Занять 1-е место в рейтинге",
    icon: "Trophy",
    tier: "platinum",
    category: "rating",
    check: (_, rankIndex) => rankIndex === 0,
    progress: (_, rankIndex) => ({ current: rankIndex === 0 ? 1 : 0, target: 1 }),
  },

  // ── Элита ──
  {
    id: "mentor",
    name: "Наставник",
    description: "Провести 10 лекций",
    icon: "Crown",
    tier: "gold",
    category: "elite",
    check: (r) => r.lectures_count >= 10,
    progress: (r) => ({ current: Math.min(r.lectures_count, 10), target: 10 }),
  },
  {
    id: "sniper",
    name: "Снайпер",
    description: "Провести 10 экзаменов",
    icon: "Target",
    tier: "gold",
    category: "elite",
    check: (r) => r.exams_count >= 10,
    progress: (r) => ({ current: Math.min(r.exams_count, 10), target: 10 }),
  },
  {
    id: "guardian",
    name: "Страж порядка",
    description: "Проверить 25 рапортов",
    icon: "Shield",
    tier: "gold",
    category: "elite",
    check: (r) => r.reviews_count >= 25,
    progress: (r) => ({ current: Math.min(r.reviews_count, 25), target: 25 }),
  },
  {
    id: "legend",
    name: "Легенда академии",
    description: "Набрать 500 баллов рейтинга",
    icon: "Gem",
    tier: "gold",
    category: "elite",
    check: (r) => r.points >= 500,
    progress: (r) => ({ current: Math.min(r.points, 500), target: 500 }),
  },
  {
    id: "thousand",
    name: "Тысячник",
    description: "Набрать 1000 баллов рейтинга",
    icon: "Star",
    tier: "platinum",
    category: "elite",
    check: (r) => r.points >= 1000,
    progress: (r) => ({ current: Math.min(r.points, 1000), target: 1000 }),
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// ACHIEVEMENT MEDAL COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

function AchievementMedal({ def, unlocked, progress }: {
  def: AchievementDef;
  unlocked: boolean;
  progress: { current: number; target: number };
}) {
  const tier = TIER_COLORS[def.tier];
  const pct = Math.round((progress.current / progress.target) * 100);

  return (
    <div
      className={`relative border p-3 transition-all duration-300 group ${
        unlocked
          ? `${tier.bg} ${tier.border} ${tier.glow}`
          : "bg-tactical-panel/50 border-tactical-border/40 opacity-60"
      }`}
    >
      {/* Tier indicator strip */}
      <div
        className={`absolute top-0 left-0 w-full h-0.5 ${
          unlocked ? tier.text.replace("text-", "bg-") : "bg-tactical-border/30"
        }`}
      />

      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={`w-10 h-10 flex items-center justify-center border flex-shrink-0 transition-transform duration-300 ${
            unlocked
              ? `${tier.bg} ${tier.border} group-hover:scale-110`
              : "bg-tactical-panel border-tactical-border/40"
          }`}
        >
          <Icon
            name={def.icon}
            size={20}
            className={unlocked ? tier.icon : "text-muted-foreground/40"}
          />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p
              className={`font-oswald text-sm tracking-wide ${
                unlocked ? tier.text : "text-muted-foreground/60"
              }`}
            >
              {def.name}
            </p>
            {unlocked && (
              <Icon name="CheckCircle" size={12} className="text-green-400 flex-shrink-0" />
            )}
          </div>
          <p className="text-[11px] text-muted-foreground font-ibm leading-snug mt-0.5">
            {def.description}
          </p>

          {/* Progress bar (only for locked) */}
          {!unlocked && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-1 bg-tactical-border/30 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${tier.text.replace("text-", "bg-")}`}
                  style={{ width: `${pct}%`, opacity: 0.6 }}
                />
              </div>
              <span className="text-[10px] font-mono text-muted-foreground/60 whitespace-nowrap">
                {progress.current}/{progress.target}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function InstructorAchievements({
  rating,
  rankIndex,
}: {
  rating: InstructorRating;
  rankIndex: number;
}) {
  const computed = useMemo(() => {
    return ACHIEVEMENTS.map((def) => ({
      def,
      unlocked: def.check(rating, rankIndex),
      progress: def.progress(rating, rankIndex),
    }));
  }, [rating, rankIndex]);

  const unlockedCount = computed.filter((a) => a.unlocked).length;
  const totalCount = ACHIEVEMENTS.length;

  // Group by category
  const categories = useMemo(() => {
    const cats: AchievementCategory[] = ["basics", "mastery", "rating", "elite"];
    return cats.map((cat) => ({
      key: cat,
      ...CATEGORY_LABELS[cat],
      achievements: computed.filter((a) => a.def.category === cat),
    }));
  }, [computed]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon name="Medal" size={16} className="text-yellow-400" />
          <h3 className="font-oswald text-sm tracking-widest uppercase text-muted-foreground">
            Достижения
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-oswald text-lg text-yellow-400">{unlockedCount}</span>
          <span className="text-xs text-muted-foreground font-mono">/ {totalCount}</span>
        </div>
      </div>

      {/* Overall progress */}
      <div className="h-1.5 bg-tactical-panel border border-tactical-border/40 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-amber-600 via-yellow-500 to-cyan-400 transition-all duration-700"
          style={{ width: `${(unlockedCount / totalCount) * 100}%` }}
        />
      </div>

      {/* Categories */}
      {categories.map((cat) => {
        const catUnlocked = cat.achievements.filter((a) => a.unlocked).length;
        return (
          <div key={cat.key} className="space-y-2">
            <div className="flex items-center gap-2">
              <Icon name={cat.icon} size={13} className="text-primary/70" />
              <span className="font-oswald text-xs tracking-widest uppercase text-muted-foreground">
                {cat.label}
              </span>
              <span className="text-[10px] font-mono text-muted-foreground/60 ml-auto">
                {catUnlocked}/{cat.achievements.length}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {cat.achievements
                .sort((a, b) => (a.unlocked === b.unlocked ? 0 : a.unlocked ? -1 : 1))
                .map((a) => (
                  <AchievementMedal
                    key={a.def.id}
                    def={a.def}
                    unlocked={a.unlocked}
                    progress={a.progress}
                  />
                ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
