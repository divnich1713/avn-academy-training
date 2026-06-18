import { createPortal } from "react-dom";
import Icon from "@/components/ui/icon";

interface MemoProps {
  isOpen: boolean;
  onClose: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. PATROL MEMO (Инструкция по патрулированию и охране КПП)
// ═══════════════════════════════════════════════════════════════════════════════
export function PatrolMemo({ isOpen, onClose }: MemoProps) {
  if (!isOpen) return null;
  return createPortal(
    <div className="fixed inset-0 bg-background/85 backdrop-blur-sm z-50 overflow-y-auto flex items-start justify-center p-4 py-8 md:py-12">
      <div className="bg-tactical-card border-2 border-primary/50 max-w-3xl w-full corner-mark card-glow p-6 text-foreground relative animate-in fade-in zoom-in duration-200 min-h-[85vh] flex flex-col justify-between">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Icon name="X" size={20} />
        </button>
        
        <h3 className="font-oswald text-xl uppercase tracking-wider text-foreground mb-4 pb-2 border-b border-tactical-border flex items-center gap-2">
          <Icon name="BookOpen" className="text-primary" size={20} />
          Инструкция по патрулированию и охране КПП
        </h3>

        <div className="space-y-8 font-ibm text-sm text-foreground/90 leading-relaxed">
          {/* Группа Рядовой */}
          <div className="border border-tactical-border/60 bg-tactical-card/10 p-5 rounded-lg space-y-6 shadow-[0_0_15px_rgba(245,158,11,0.03)]">
            <h3 className="font-oswald text-lg uppercase text-primary tracking-widest border-b border-tactical-border pb-2 flex items-center gap-2 font-semibold">
              <Icon name="Award" className="text-primary" size={20} />
              Для звания: Рядовой
            </h3>

            {/* Section 1 */}
            <div>
              <h4 className="font-oswald text-base uppercase text-foreground/90 tracking-wider mb-2">1. Доклады на пеший патруль</h4>
              <div className="bg-tactical-card/50 border border-tactical-border p-3 space-y-3 rounded font-mono text-xs text-muted-foreground">
                <p className="text-foreground break-words whitespace-normal"><span className="text-primary font-bold block mb-0.5">Принятие поста:</span> Докладывает: Звания Фамилия | Пост "Пеший Патруль" принял | Состав - 1/2/3/.. | Код-1,2,3 | Доклад окончен.</p>
                <p className="text-foreground break-words whitespace-normal"><span className="text-primary font-bold block mb-0.5">Несение поста:</span> Докладывает: Звания Фамилия | Пост "Пеший Патруль" | Состав - 1/2/3/.. | Минуты - 10/20/30 | Код-1,2,3 | Доклад окончен.</p>
                <p className="text-foreground break-words whitespace-normal"><span className="text-primary font-bold block mb-0.5">Сдача поста:</span> Докладывает: Звания Фамилия | Пост "Пеший Патруль" сдал | Состав - 1/2/3/.. | Код-1,2,3 | Доклад окончен.</p>
              </div>
              <div className="mt-3 bg-yellow-950/20 border-l-2 border-yellow-500 p-3 rounded text-yellow-300 text-xs space-y-2">
                <p className="font-bold flex items-center gap-1.5 uppercase tracking-wider text-red-400">
                  <Icon name="Video" size={14} /> ОБЯЗАТЕЛЬНО: НАЛИЧИЕ БОДИ-КАМЕРЫ
                </p>
                <p className="font-bold flex items-center gap-1.5 uppercase tracking-wider">
                  <Icon name="AlertTriangle" size={14} /> Подсказка (пеший патруль 30 мин):
                </p>
                <p>Во время патруля суммарно должно быть 5 скриншотов:</p>
                <ul className="list-decimal pl-4 space-y-0.5 font-semibold">
                  <li>Начало (Пост принял)</li>
                  <li>Пост 10 минут</li>
                  <li>Пост 20 минут</li>
                  <li>Пост 30 минут</li>
                  <li>Конец (Пост Сдал)</li>
                </ul>
              </div>
            </div>

            {/* Ten-Codes */}
            <div>
              <h4 className="font-oswald text-sm uppercase text-primary tracking-wider mb-1.5">Тен-Коды</h4>
              <div className="bg-tactical-card/50 border border-tactical-border p-3 rounded font-mono text-xs space-y-1">
                <p><span className="text-green-400 font-semibold">Код-1:</span> Состояние стабильное.</p>
                <p><span className="text-yellow-400 font-semibold">Код-2:</span> Вижу подозрительных личностей.</p>
                <p><span className="text-red-400 font-semibold">Код-3:</span> Проникновение на ВЧ/Нападение/Стрельба.</p>
              </div>
            </div>

            {/* Map Image */}
            <div className="border border-tactical-border p-2 bg-tactical-card/30 rounded">
              <p className="text-xs text-muted-foreground mb-1.5 text-center font-mono uppercase tracking-wider">Карта постов и зон патрулирования</p>
              <img 
                src="/patrol_map.webp" 
                alt="Карта постов патрулирования" 
                className="w-full max-h-[350px] object-contain rounded border border-tactical-border bg-black/40"
                loading="lazy"
              />
            </div>

            {/* Section 2 */}
            <div>
              <h4 className="font-oswald text-base uppercase text-foreground/90 tracking-wider mb-2">2. Доклады на пост вышка</h4>
              <div className="bg-tactical-card/50 border border-tactical-border p-3 space-y-3 rounded font-mono text-xs text-muted-foreground">
                <p className="text-foreground break-words whitespace-normal"><span className="text-primary font-bold block mb-0.5">Принятие поста:</span> Докладывает: Звания Фамилия | Пост "Вышка № 1/2/3" принял | Состав - 1/2/3/.. | Код-1,2,3 | Доклад окончен.</p>
                <p className="text-foreground break-words whitespace-normal"><span className="text-primary font-bold block mb-0.5">Несение поста:</span> Докладывает: Звания Фамилия | Пост "Вышка № 1/2/3" | Состав - 1/2/3/.. | Минуты - 10/20/30 | Код-1,2,3 | Доклад окончен.</p>
                <p className="text-foreground break-words whitespace-normal"><span className="text-primary font-bold block mb-0.5">Сдача поста:</span> Докладывает: Звания Фамилия | Пост "Вышка № 1/2/3" сдал | Состав - 1/2/3/.. | Код-1,2,3 | Доклад окончен.</p>
              </div>
              <div className="mt-3 bg-yellow-950/20 border-l-2 border-yellow-500 p-3 rounded text-yellow-300 text-xs space-y-2">
                <p className="font-bold flex items-center gap-1.5 uppercase tracking-wider text-red-400">
                  <Icon name="Video" size={14} /> ОБЯЗАТЕЛЬНО: НАЛИЧИЕ БОДИ-КАМЕРЫ
                </p>
                <p className="font-bold flex items-center gap-1.5 uppercase tracking-wider">
                  <Icon name="AlertTriangle" size={14} /> Подсказка (вышка - 30 мин):
                </p>
                <p>Во время поста суммарно должно быть 5 скриншотов:</p>
                <ul className="list-decimal pl-4 space-y-0.5 font-semibold">
                  <li>Начало (Пост принял)</li>
                  <li>Пост 10 минут</li>
                  <li>Пост 20 минут</li>
                  <li>Пост 30 минут</li>
                  <li>Конец (Пост Сдал)</li>
                </ul>
              </div>
              <div className="mt-3 bg-tactical-card/50 border border-tactical-border p-3 rounded font-mono text-xs space-y-1">
                <p className="font-oswald text-xs uppercase text-primary tracking-wider mb-1">Тен-Коды</p>
                <p><span className="text-green-400 font-semibold">Код-1:</span> Состояние стабильное.</p>
                <p><span className="text-yellow-400 font-semibold">Код-2:</span> Вижу подозрительных личностей.</p>
                <p><span className="text-red-400 font-semibold">Код-3:</span> Проникновение на ВЧ/Нападение/Стрельба.</p>
              </div>
            </div>

            {/* Вышка Image */}
            <div className="border border-tactical-border p-2 bg-tactical-card/30 rounded">
              <p className="text-xs text-muted-foreground mb-1.5 text-center font-mono uppercase tracking-wider">Визуализация несения службы на посту Вышка</p>
              <img 
                src="/patrol_tower.webp?v=2" 
                alt="Несение службы на посту Вышка" 
                className="w-full max-h-[350px] object-contain rounded border border-tactical-border bg-black/40"
                loading="lazy"
              />
            </div>
          </div>

          {/* Группа Младший сержант */}
          <div className="border border-tactical-border/60 bg-tactical-card/10 p-5 rounded-lg space-y-6 shadow-[0_0_15px_rgba(245,158,11,0.03)]">
            <h3 className="font-oswald text-lg uppercase text-primary tracking-widest border-b border-tactical-border pb-2 flex items-center gap-2 font-semibold">
              <Icon name="Award" className="text-primary" size={20} />
              Для звания: Младший сержант
            </h3>

            {/* Section 3 */}
            <div>
              <h4 className="font-oswald text-base uppercase text-foreground/90 tracking-wider mb-2">3. Доклады на ПОСТ КПП №1</h4>
              <div className="bg-tactical-card/50 border border-tactical-border p-3 space-y-3 rounded font-mono text-xs text-muted-foreground">
                <p className="text-foreground break-words whitespace-normal"><span className="text-primary font-bold block mb-0.5">Принятие поста:</span> Докладывает: Звания Фамилия | Пост "КПП №1" принял | Состав - 1/2/3/.. | Код-1,2,3 | Доклад окончен.</p>
                <p className="text-foreground break-words whitespace-normal"><span className="text-primary font-bold block mb-0.5">Несение поста:</span> Докладывает: Звания Фамилия | Пост "КПП №1" | Состав - 1/2/3/.. | Минуты - 10/20/30 | Код-1,2,3 | Доклад окончен.</p>
                <p className="text-foreground break-words whitespace-normal"><span className="text-primary font-bold block mb-0.5">Сдача поста:</span> Докладывает: Звания Фамилия | Пост "КПП №1" сдал | Состав - 1/2/3/.. | Код-1,2,3 | Доклад окончен.</p>
              </div>
              <div className="mt-3 bg-yellow-950/20 border-l-2 border-yellow-500 p-3 rounded text-yellow-300 text-xs space-y-2">
                <p className="font-bold flex items-center gap-1.5 uppercase tracking-wider text-red-400">
                  <Icon name="Video" size={14} /> ОБЯЗАТЕЛЬНО: НАЛИЧИЕ БОДИ-КАМЕРЫ
                </p>
                <p className="font-bold flex items-center gap-1.5 uppercase tracking-wider">
                  <Icon name="AlertTriangle" size={14} /> Подсказка (КПП №1 - 30 мин):
                </p>
                <p className="font-semibold text-yellow-400">↳ Доклад каждые 10 минут</p>
                <p>Во время поста суммарно должно быть 5 скриншотов:</p>
                <ul className="list-decimal pl-4 space-y-0.5 font-semibold">
                  <li>Начало (Пост принял)</li>
                  <li>Пост 10 минут</li>
                  <li>Пост 20 минут</li>
                  <li>Пост 30 минут</li>
                  <li>Конец (Пост Сдал)</li>
                </ul>
              </div>
              <div className="mt-3 bg-tactical-card/50 border border-tactical-border p-3 rounded font-mono text-xs space-y-1">
                <p className="font-oswald text-xs uppercase text-primary tracking-wider mb-1">Тен-Коды</p>
                <p><span className="text-green-400 font-semibold">Код-1:</span> Состояние стабильное.</p>
                <p><span className="text-yellow-400 font-semibold">Код-2:</span> Вижу подозрительных личностей.</p>
                <p><span className="text-red-400 font-semibold">Код-3:</span> Проникновение на ВЧ/Нападение/Стрельба.</p>
              </div>
            </div>

            {/* КПП 1 Image */}
            <div className="border border-tactical-border p-2 bg-tactical-card/30 rounded">
              <p className="text-xs text-muted-foreground mb-1.5 text-center font-mono uppercase tracking-wider">Визуализация несения службы на посту КПП №1</p>
              <img 
                src="/patrol_kpp1.webp?v=2" 
                alt="Несение службы на посту КПП №1" 
                className="w-full max-h-[350px] object-contain rounded border border-tactical-border bg-black/40"
                loading="lazy"
              />
            </div>

            {/* Section 4 */}
            <div>
              <h4 className="font-oswald text-base uppercase text-foreground/90 tracking-wider mb-2">4. ВНУТРЕННИЙ ПОСТ КПП №2</h4>
              <div className="space-y-3">
                <div className="bg-yellow-950/20 border-l-2 border-yellow-500 p-3 rounded text-yellow-300 text-xs space-y-2">
                  <p className="font-bold flex items-center gap-1.5 uppercase tracking-wider text-red-400">
                    <Icon name="Video" size={14} /> ОБЯЗАТЕЛЬНО: НАЛИЧИЕ БОДИ-КАМЕРЫ
                  </p>
                  <p className="font-bold flex items-center gap-1.5 uppercase tracking-wider">
                    <Icon name="AlertTriangle" size={14} /> Подсказка:
                  </p>
                  <p>Во время поста суммарно должно быть 5 скриншотов:</p>
                  <ul className="list-decimal pl-4 space-y-0.5 font-semibold">
                    <li>Начало (Пост принял)</li>
                    <li>Пост 20 минут</li>
                    <li>Пост 40 минут</li>
                    <li>Пост 60 минут</li>
                    <li>Конец (Пост Сдал)</li>
                  </ul>
                </div>
              </div>
              <div className="mt-3 bg-tactical-card/50 border border-tactical-border p-3 rounded font-mono text-xs space-y-1">
                <p className="font-oswald text-xs uppercase text-primary tracking-wider mb-1">Тен-Коды</p>
                <p><span className="text-green-400 font-semibold">Код-1:</span> Состояние стабильное.</p>
                <p><span className="text-yellow-400 font-semibold">Код-2:</span> Вижу подозрительных личностей.</p>
                <p><span className="text-red-400 font-semibold">Код-3:</span> Проникновение на ВЧ/Нападение/Стрельба.</p>
              </div>
            </div>

            {/* Guard Image */}
            <div className="border border-tactical-border p-2 bg-tactical-card/30 rounded">
              <p className="text-xs text-muted-foreground mb-1.5 text-center font-mono uppercase tracking-wider">Визуализация несения службы на посту КПП №2</p>
              <img 
                src="/patrol_kpp2.webp?v=2" 
                alt="Несение службы на посту КПП №2" 
                className="w-full max-h-[350px] object-contain rounded border border-tactical-border bg-black/40"
                loading="lazy"
              />
            </div>

            {/* Section 5 */}
            <div>
              <h4 className="font-oswald text-base uppercase text-foreground/90 tracking-wider mb-2">5. Досмотровые мероприятия</h4>
              <div className="bg-tactical-card/50 border border-tactical-border p-4 rounded space-y-2">
                <p className="font-bold text-foreground">• Принять участие в досмотровых мероприятиях на двух собеседованиях.</p>
                <p className="text-xs text-yellow-500 font-mono font-semibold">Делаем 2 скриншота: начало собеседования и конец собеседования!!!</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-tactical-border flex justify-end">
          <button
            onClick={onClose}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-oswald text-sm uppercase tracking-widest px-5 py-2 transition-colors corner-mark"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. ARREST MEMO (Инструкция по порядку задержания и ареста)
// ═══════════════════════════════════════════════════════════════════════════════
export function ArrestMemo({ isOpen, onClose }: MemoProps) {
  if (!isOpen) return null;
  return createPortal(
    <div className="fixed inset-0 bg-background/85 backdrop-blur-sm z-50 overflow-y-auto flex items-start justify-center p-4 py-8 md:py-12">
      <div className="bg-tactical-card border-2 border-primary/50 max-w-3xl w-full corner-mark card-glow p-6 text-foreground relative animate-in fade-in zoom-in duration-200 min-h-[85vh] flex flex-col justify-between">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Icon name="X" size={20} />
        </button>
        
        <div>
          <h3 className="font-oswald text-xl uppercase tracking-wider text-foreground mb-4 pb-2 border-b border-tactical-border flex items-center gap-2">
            <Icon name="ShieldAlert" className="text-primary" size={20} />
            Инструкция по порядку задержания и ареста
          </h3>

          <div className="space-y-5 font-ibm text-sm text-foreground/90 leading-relaxed">
            {/* СТАТЬЯ 7: ОСНОВАНИЯ ДЛЯ ЗАДЕРЖАНИЯ */}
            <details className="group border border-tactical-border/80 bg-tactical-card/30 rounded-lg overflow-hidden transition-all duration-300 card-glow">
              <summary className="list-none flex items-center justify-between cursor-pointer p-4 font-oswald text-base uppercase text-primary tracking-widest select-none hover:bg-primary/5 transition-colors">
                <div className="flex items-center gap-2.5">
                  <Icon name="Scale" className="text-primary" size={20} />
                  <span className="font-semibold">Статья 7. Основания для задержания</span>
                </div>
                <span className="transition-transform duration-300 group-open:rotate-180 text-primary">▼</span>
              </summary>
              <div className="p-5 pt-0 border-t border-tactical-border/40 space-y-4 text-xs leading-relaxed text-foreground/90 font-ibm">
                <p className="text-foreground font-semibold border-l-2 border-primary pl-3 py-0.5">
                  7.1. Сотрудники правоохранительных органов вправе задержать лицо, совершившее правонарушение или по подозрению в совершении правонарушения, за которое может быть назначено наказание в виде административного ареста или лишения свободы, при наличии одного из следующих оснований:
                </p>
                <ul className="space-y-2 font-mono">
                  {[
                    "когда это лицо застигнуто при совершении правонарушения или непосредственно после его совершения (только в случае если санкция предусматривает наказание в виде административного ареста или лишения свободы);",
                    "когда потерпевшие или очевидцы в количестве 3-х и более человек укажут на данное лицо как на совершившее правонарушение (только в случае если санкция предусматривает наказание в виде административного ареста или лишения свободы);",
                    "когда на этом лице или его одежде, при нем или в его жилище будут обнаружены явные следы правонарушения (только в случае если санкция предусматривает наказание в виде административного ареста или лишения свободы);",
                    "производство допроса приводом или допроса с задержанием в порядке, предусмотренном статьей 39 Уголовно-процессуального Кодекса Российской Федерации, в таком случае порядок проведения задержания устанавливается статьей 39-1 Уголовно-процессуального Кодекса Российской Федерации, вместо статей 10 и 12 настоящего Кодекса;",
                    "разрешено задержание с целью установления личности гражданина в случае, если личность скрывает лицо и отказывается устранить предмет мешающий рассмотреть лицо и отказывается предоставить документ удостоверяющий личность;",
                    "в случае совершения преступления предусмотренного статьей 67 Уголовного Кодекса Российской Федерации, в случае если лицо не оплатило наложенный на него административный штраф в течение 35 секунд после непосредственной передачи или попытки передачи протокола (постановления) сотрудником;",
                    "в случае наличия лица в розыске, задержание и последующее рассмотрение дела происходит с учетом причины указанной в розыскном листе в СПРП «★»;",
                    "в случае наличия видеофиксации совершенного правонарушения, санкция которого предполагает наказание в виде административного ареста или лишения свободы, данным лицом, которая предоставлена очевидцем или потерпевшим;",
                    "в случае ориентировки на данное лицо или на транспортное средство, размещенной посредством рации государственных структур или иным законным образом;",
                    "в целях установления оснований для совершения действий, требующих специального разрешения или особого правового статуса."
                  ].map((item, index) => (
                    <li key={index} className="flex gap-2 p-2 rounded bg-black/20 border border-tactical-border/30 hover:border-primary/20 transition-colors">
                      <span className="text-primary font-bold">{index + 1}.</span>
                      <span className="text-muted-foreground"><span className="text-foreground/90">{item.split(" (")[0]}</span>{item.includes(" (") && ` (${item.split(" (")[1]}`}</span>
                    </li>
                  ))}
                </ul>
                <div className="pt-3 border-t border-tactical-border/40 space-y-3">
                  <div className="p-3 bg-tactical-card/50 border border-tactical-border rounded">
                    <p className="font-semibold text-foreground">
                      <span className="text-primary font-mono mr-1">7.2.</span> Разрешается задержание лица с целью установления личности гражданина в порядке пункта “5” части 1 настоящей статьи, после чего сотрудник обязан составить административный протокол и вынести наказание в соответствии с федеральным законом. В случае если лицо не подозревается в совершении преступления, предусматривающих лишение свободы, сотрудник обязан отпустить задержанное лицо.
                    </p>
                  </div>
                  <div className="p-3 bg-primary/5 border border-primary/20 rounded">
                    <p className="text-primary">
                      <span className="font-bold font-mono mr-1">7.3.</span> <span className="underline decoration-primary/40">Система приоритезации розыска преступников (СПРП)</span> — единая система классификации преступлений и правонарушений, основанная на их тяжести и опасности по отношению к личности, обществу и государству.
                    </p>
                  </div>
                </div>
              </div>
            </details>

            {/* ЭТАП 1: ЗАДЕРЖАНИЕ */}
            <div className="border border-tactical-border/60 bg-tactical-card/25 p-5 rounded-lg space-y-4 hover:border-primary/30 transition-colors card-glow">
              <h4 className="font-oswald text-base uppercase text-primary tracking-widest border-b border-tactical-border pb-2 flex items-center gap-2 font-semibold">
                <Icon name="UserMinus" className="text-primary" size={18} />
                Этап I: Задержание
              </h4>
              
              <div className="space-y-4">
                <div className="flex gap-3 items-start p-2.5 rounded bg-black/10 hover:bg-black/25 transition-all border border-transparent hover:border-tactical-border/40">
                  <div className="w-5 h-5 rounded-full bg-primary/25 border border-primary flex items-center justify-center flex-shrink-0 text-primary font-bold text-xs mt-0.5">✔</div>
                  <div className="w-full">
                    <span className="font-semibold text-foreground">Применить спецсредства (шокер) и заковать в наручники</span>
                  </div>
                </div>

                <div className="flex gap-3 items-start p-2.5 rounded bg-black/10 hover:bg-black/25 transition-all border border-transparent hover:border-tactical-border/40">
                  <div className="w-5 h-5 rounded-full bg-primary/25 border border-primary flex items-center justify-center flex-shrink-0 text-primary font-bold text-xs mt-0.5">✔</div>
                  <div className="w-full">
                    <span className="font-semibold text-foreground">Назвать статьи, за которые задержан</span>
                  </div>
                </div>

                <div className="flex gap-3 items-start p-2.5 rounded bg-black/10 hover:bg-black/25 transition-all border border-transparent hover:border-tactical-border/40">
                  <div className="w-5 h-5 rounded-full bg-primary/25 border border-primary flex items-center justify-center flex-shrink-0 text-primary font-bold text-xs mt-0.5">✔</div>
                  <div className="w-full">
                    <span className="font-semibold text-foreground">Пристегнуть кольцо наручников к себе / ручке авто / забору (отыграть рп)</span>
                    <div className="mt-2 bg-black/60 border border-cyan-500/20 px-3 py-2 rounded font-mono text-xs text-cyan-400 flex items-start gap-1.5 shadow-inner">
                      <span className="text-cyan-500 font-sans font-bold flex-shrink-0">{`> [РП Отыгровка]:`}</span> 
                      <span>Отстегнул одно кольцо наручников пристегнул к решётке.</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 items-start p-2.5 rounded bg-black/10 hover:bg-black/25 transition-all border border-transparent hover:border-tactical-border/40">
                  <div className="w-5 h-5 rounded-full bg-primary/25 border border-primary flex items-center justify-center flex-shrink-0 text-primary font-bold text-xs mt-0.5">✔</div>
                  <div className="w-full">
                    <span className="font-semibold text-foreground">Представиться и показать удостоверение</span>
                    <p className="text-xs text-muted-foreground mt-1 bg-tactical-card/50 px-2 py-1.5 rounded border border-tactical-border/40">
                      «Сотрудником ФСВНГ/Росгвардии являюсь, <span className="text-primary font-semibold font-mono">"Звание" "Фамилия"</span>.»
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 items-start p-2.5 rounded bg-black/10 hover:bg-black/25 transition-all border border-transparent hover:border-tactical-border/40">
                  <div className="w-5 h-5 rounded-full bg-primary/25 border border-primary flex items-center justify-center flex-shrink-0 text-primary font-bold text-xs mt-0.5">✔</div>
                  <div className="w-full">
                    <span className="font-semibold text-foreground">Посмотреть паспорт задержанного</span>
                    <div className="mt-2 bg-black/60 border border-cyan-500/20 px-3 py-2 rounded font-mono text-xs text-cyan-400 flex items-start gap-1.5 shadow-inner">
                      <span className="text-cyan-500 font-sans font-bold flex-shrink-0">{`> [Как отыграть]:`}</span> 
                      <span>Прохлопаю кармашки человека напротив, найду паспорт, ознакомлюсь.</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 items-start p-2.5 rounded bg-black/10 hover:bg-black/25 transition-all border border-transparent hover:border-tactical-border/40">
                  <div className="w-5 h-5 rounded-full bg-primary/25 border border-primary flex items-center justify-center flex-shrink-0 text-primary font-bold text-xs mt-0.5">✔</div>
                  <div className="w-full">
                    <span className="font-semibold text-foreground">Провести первичный обыск</span>
                    <div className="mt-1.5 bg-yellow-950/20 border border-yellow-500/30 text-yellow-500 px-3 py-2 rounded text-xs flex items-center gap-2 font-medium">
                      <Icon name="AlertTriangle" size={14} className="flex-shrink-0" />
                      <span>Инкриминируя новые статьи при обнаружении нелегальных предметов, но <strong>БЕЗ ИЗЪЯТИЯ!</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 items-start p-2.5 rounded bg-black/10 hover:bg-black/25 transition-all border border-transparent hover:border-tactical-border/40">
                  <div className="w-5 h-5 rounded-full bg-primary/25 border border-primary flex items-center justify-center flex-shrink-0 text-primary font-bold text-xs mt-0.5">✔</div>
                  <div className="w-full">
                    <span className="font-semibold text-foreground">Посадить в машину, отвезти в КПЗ</span>
                    <div className="mt-2 bg-black/60 border border-cyan-500/20 px-3 py-2 rounded font-mono text-xs text-cyan-400 flex items-start gap-1.5 shadow-inner">
                      <span className="text-cyan-500 font-sans font-bold flex-shrink-0">{`> [Как отыграть]:`}</span> 
                      <span>Открыл заднюю дверь автомобиля, посадил задержанного и пристегнул ремнем безопасности.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ЭТАП 2: ТРАНСПОРТИРОВКА И ПРАВА */}
            <div className="border border-tactical-border/60 bg-tactical-card/25 p-5 rounded-lg space-y-4 hover:border-primary/30 transition-colors card-glow">
              <h4 className="font-oswald text-base uppercase text-primary tracking-widest border-b border-tactical-border pb-2 flex items-center gap-2 font-semibold">
                <Icon name="Shield" className="text-primary" size={18} />
                Этап II: Transport и реализация прав
              </h4>

              <div className="space-y-4">
                <div className="p-3 bg-black/20 border border-tactical-border rounded space-y-2">
                  <div className="flex gap-2.5 items-start">
                    <div className="text-primary font-bold mt-0.5">✔</div>
                    <div>
                      <span className="font-semibold text-foreground">Права задержанного</span>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Пока едем в КПЗ, спрашиваем — знает ли задержанный свои права. Если не знает — озвучиваем:
                      </p>
                    </div>
                  </div>
                  
                  <details className="group mt-2 border border-tactical-border/50 bg-black/35 rounded-md overflow-hidden">
                    <summary className="list-none flex items-center justify-between cursor-pointer p-3 font-oswald text-xs uppercase text-primary tracking-wider select-none hover:bg-primary/5">
                      <span className="font-semibold">Статья 8. Права задержанного (Законный текст)</span>
                      <span className="transition-transform duration-300 group-open:rotate-180 text-primary">▼</span>
                    </summary>
                    <div className="p-4 pt-0 border-t border-tactical-border/40 text-xs space-y-3 text-muted-foreground">
                      <p className="font-semibold text-foreground">8.1. Задержанный обладает следующими правами:</p>
                      <ul className="list-decimal pl-4 space-y-1.5 text-foreground/95">
                        <li>не свидетельствовать против себя самого (ст. 37 Конституции Российской Федерации);</li>
                        <li>требовать предоставления ему государственного адвоката, в случае его наличия на рабочем месте;</li>
                        <li>требовать присутствия адвоката рядом в помещениях следственного изолятора, камерах предварительного заключения, исправительного учреждения;</li>
                        <li>требовать предоставить возможность провести конфиденциальную беседу с адвокатом не превышающую 5 минут;</li>
                        <li>требовать предоставить возможность провести один (1) телефонный звонок любому лицу на выбор задержанного, не превышающий двух (2) минут.</li>
                      </ul>
                      <div className="space-y-1.5 pt-2 border-t border-tactical-border/30">
                        <p><span className="font-semibold text-foreground">8.2.</span> Права задержанного реализуются в процессе задержания до перехода к процессу ареста если поступил соответствующий запрос или просьба от гражданина на реализацию своего права.</p>
                        <p><span className="font-semibold text-foreground">8.3.</span> Сотрудник государственного органа, инициировавший задержание, обязан предложить задержанному реализовать право, на предоставления задержанному государственного адвоката.</p>
                        <p><span className="font-semibold text-foreground">8.4.</span> Сотрудник государственного органа обязан огласить задержанному его права, которыми обладает, в случае такого требования от задержанного.</p>
                      </div>
                    </div>
                  </details>
                </div>

                <div className="grid md:grid-cols-2 gap-3 pt-2">
                  <div className="p-3 bg-black/10 border border-tactical-border/50 hover:bg-black/20 transition-all rounded">
                    <span className="font-semibold text-foreground text-xs flex items-center gap-1.5 mb-1 text-primary">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                      При отказе от прав
                    </span>
                    <p className="text-xs text-muted-foreground">По приезду в КПЗ сразу переходим к стадии ареста.</p>
                  </div>

                  <div className="p-3 bg-black/10 border border-tactical-border/50 hover:bg-black/20 transition-all rounded">
                    <span className="font-semibold text-foreground text-xs flex items-center gap-1.5 mb-1 text-primary">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                      При реализации прав
                    </span>
                    <p className="text-xs text-muted-foreground">Реализовываем (Адвокат / Телефонный звонок) в КПЗ.</p>
                  </div>
                </div>

                <div className="p-3 bg-black/25 border border-tactical-border rounded space-y-2">
                  <span className="font-semibold text-foreground text-xs block">Отыгрыш вызова адвоката:</span>
                  <div className="bg-black/60 border border-cyan-500/20 px-3 py-2 rounded font-mono text-xs text-cyan-400 flex items-start gap-1.5 shadow-inner">
                    <span className="text-cyan-500 font-sans font-bold flex-shrink-0">{`> [Как отыграть]:`}</span> 
                    <span>Пишем в рацию гос.волна: «Задержанный требует реализацию своих прав на основании статьи 8 пункта 2. Время вызова адвоката 13:55. В КПЗ УГИБДД.»</span>
                  </div>
                  <div className="bg-yellow-950/20 border border-yellow-500/30 text-yellow-500 px-3 py-2 rounded text-xs flex items-center gap-2 font-medium">
                    <Icon name="AlertTriangle" size={14} className="flex-shrink-0" />
                    <span>Во время вызова адвоката процессуальные действия <strong>ОСТАНАВЛИВАЮТСЯ!</strong></span>
                  </div>
                </div>

                <div className="p-3 bg-black/20 border border-tactical-border rounded space-y-2">
                  <span className="font-semibold text-foreground text-xs block">Если адвокат требует доказательства:</span>
                  <p className="text-xs text-muted-foreground">
                    Переходим в моссеть в Блок А / Блок Б для предоставления видеофиксации.
                  </p>
                  <div className="bg-yellow-950/20 border border-yellow-500/30 text-yellow-500 p-2.5 rounded text-xs font-mono">
                    <span className="font-semibold">Основание 13.8:</span> Государственный адвокат вправе запросить видеофиксацию совершения своим подзащитным действий, которые послужили основанием для осуществления задержания.
                  </div>
                </div>

                <div className="flex gap-3 items-start p-2.5 rounded bg-black/10 hover:bg-black/25 transition-all border border-transparent hover:border-tactical-border/40">
                  <div className="w-5 h-5 rounded-full bg-primary/25 border border-primary flex items-center justify-center flex-shrink-0 text-primary font-bold text-xs mt-0.5">✔</div>
                  <div className="w-full">
                    <span className="font-semibold text-foreground">Вызвать СС ФСВНГ для изъятия лицензии</span>
                    <p className="text-xs text-muted-foreground mt-0.5">(Если это требуется согласно нарушениям).</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ЭТАП 3: АРЕСТ */}
            <div className="border border-tactical-border/60 bg-tactical-card/25 p-5 rounded-lg space-y-4 hover:border-primary/30 transition-colors card-glow">
              <h4 className="font-oswald text-base uppercase text-primary tracking-widest border-b border-tactical-border pb-2 flex items-center gap-2 font-semibold">
                <Icon name="Lock" className="text-primary" size={18} />
                Этап III: Арест
              </h4>

              <div className="space-y-4">
                <div className="flex gap-3 items-start p-2.5 rounded bg-black/10 hover:bg-black/25 transition-all border border-transparent hover:border-tactical-border/40">
                  <div className="w-5 h-5 rounded-full bg-primary/25 border border-primary flex items-center justify-center flex-shrink-0 text-primary font-bold text-xs mt-0.5">✔</div>
                  <div className="w-full">
                    <span className="font-semibold text-foreground">Переход к стадии ареста</span>
                    <div className="mt-1.5 bg-red-950/20 border border-red-500/30 text-red-400 px-3 py-2 rounded text-xs flex items-center gap-2 font-medium uppercase tracking-wider">
                      <Icon name="AlertTriangle" size={14} className="flex-shrink-0" />
                      <span>ОБЯЗАТЕЛЬНО ОЗВУЧИТЬ В СЛУХ!!!</span>
                    </div>
                    <div className="mt-2 bg-black/60 border border-cyan-500/20 px-3 py-2 rounded font-mono text-xs text-cyan-400 flex items-start gap-1.5 shadow-inner">
                      <span className="text-cyan-500 font-sans font-bold flex-shrink-0">{`> [Как отыграть]:`}</span> 
                      <span>Оглашаю всех присутствующих, что мы переходим к стадии ареста. (После этого права уже не реализуются!)</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 items-start p-2.5 rounded bg-black/10 hover:bg-black/25 transition-all border border-transparent hover:border-tactical-border/40">
                  <div className="w-5 h-5 rounded-full bg-primary/25 border border-primary flex items-center justify-center flex-shrink-0 text-primary font-bold text-xs mt-0.5">✔</div>
                  <div className="w-full">
                    <span className="font-semibold text-foreground">Огласить инкриминируемые статьи</span>
                    <div className="mt-1.5 bg-red-950/20 border border-red-500/30 text-red-400 px-3 py-2 rounded text-xs flex items-center gap-2 font-medium uppercase tracking-wider">
                      <Icon name="AlertTriangle" size={14} className="flex-shrink-0" />
                      <span>ОБЯЗАТЕЛЬНО С РАСШИФРОВКОЙ!!!</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 bg-tactical-card/50 px-2 py-1.5 rounded border border-tactical-border/40 font-mono">
                      Пример: <span className="text-cyan-400">"Вам инкриминируется статья 63.1 — хранение незаконного оружия"</span>
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 items-start p-2.5 rounded bg-black/10 hover:bg-black/25 transition-all border border-transparent hover:border-tactical-border/40">
                  <div className="w-5 h-5 rounded-full bg-primary/25 border border-primary flex items-center justify-center flex-shrink-0 text-primary font-bold text-xs mt-0.5">✔</div>
                  <div className="w-full">
                    <span className="font-semibold text-foreground">Провести вторичный обыск (с изъятием)</span>
                    <div className="mt-2 bg-black/60 border border-cyan-500/20 px-3 py-2 rounded font-mono text-xs text-cyan-400 flex items-start gap-1.5 shadow-inner">
                      <span className="text-cyan-500 font-sans font-bold flex-shrink-0">{`> [Как отыграть]:`}</span> 
                      <span>Достану zip-пакет, начну складывать все нелегальное. Закрою zip-пакет, повешу на пояс.</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 items-start p-2.5 rounded bg-black/10 hover:bg-black/25 transition-all border border-transparent hover:border-tactical-border/40">
                  <div className="w-5 h-5 rounded-full bg-primary/25 border border-primary flex items-center justify-center flex-shrink-0 text-primary font-bold text-xs mt-0.5">✔</div>
                  <div className="w-full">
                    <span className="font-semibold text-foreground">Внести данные в личное дело</span>
                    <div className="mt-1.5 bg-red-950/20 border border-red-500/30 text-red-400 px-3 py-2 rounded text-xs flex items-center gap-2 font-medium uppercase tracking-wider">
                      <Icon name="AlertTriangle" size={14} className="flex-shrink-0" />
                      <span>ОБЯЗАТЕЛЬНО УКАЗАТЬ КОДЕКС (УК РФ, КоАП)!!!</span>
                    </div>
                    <div className="mt-2 bg-black/60 border border-cyan-500/20 px-3 py-2 rounded font-mono text-xs text-cyan-400 flex items-start gap-1.5 shadow-inner">
                      <span className="text-cyan-500 font-sans font-bold flex-shrink-0">{`> [Как отыграть]:`}</span> 
                      <span>Возьму личное дело задержанного, внесу корректировки.</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 items-start p-2.5 rounded bg-black/10 hover:bg-black/25 transition-all border border-transparent hover:border-tactical-border/40">
                  <div className="w-5 h-5 rounded-full bg-primary/25 border border-primary flex items-center justify-center flex-shrink-0 text-primary font-bold text-xs mt-0.5">✔</div>
                  <div className="w-full">
                    <span className="font-semibold text-foreground">Поместить задержанного в КПЗ</span>
                    <div className="mt-2 bg-black/60 border border-cyan-500/20 px-3 py-2 rounded font-mono text-xs text-cyan-400 flex items-start gap-1.5 shadow-inner">
                      <span className="text-cyan-500 font-sans font-bold flex-shrink-0">{`> [Как отыграть]:`}</span> 
                      <span>Решетку открою, заведу задержанного, закрою решетку.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-tactical-border flex justify-end">
          <button
            onClick={onClose}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-oswald text-sm uppercase tracking-widest px-5 py-2 transition-colors corner-mark"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. WEAPON MEMO (Порядок применения огнестрельного оружия, физ.силы и спецсредств)
// ═══════════════════════════════════════════════════════════════════════════════
export function WeaponMemo({ isOpen, onClose }: MemoProps) {
  if (!isOpen) return null;
  return createPortal(
    <div className="fixed inset-0 bg-background/85 backdrop-blur-sm z-50 overflow-y-auto flex items-start justify-center p-4 py-8 md:py-12">
      <div className="bg-tactical-card border-2 border-primary/50 max-w-3xl w-full corner-mark card-glow p-6 text-foreground relative animate-in fade-in zoom-in duration-200 min-h-[85vh] flex flex-col justify-between">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Icon name="X" size={20} />
        </button>
        
        <div>
          <h3 className="font-oswald text-xl uppercase tracking-wider text-foreground mb-4 pb-2 border-b border-tactical-border flex items-center gap-2">
            <Icon name="ShieldAlert" className="text-primary" size={20} />
            Порядок применения огнестрельного оружия, физ.силы и спецсредств
          </h3>

          <div className="space-y-5 font-ibm text-sm text-foreground/90 leading-relaxed">
            {/* СТАТЬЯ 24 */}
            <details className="group border border-tactical-border/60 bg-tactical-card/30 rounded-lg overflow-hidden transition-all duration-300 card-glow">
              <summary className="list-none flex items-center justify-between cursor-pointer p-4 font-oswald text-base uppercase text-primary tracking-widest select-none hover:bg-primary/5 transition-colors">
                <div className="flex items-center gap-2.5">
                  <Icon name="Scale" className="text-primary" size={20} />
                  <span className="font-semibold">Статья 24. Право на применение силы, спецсредств и оружия</span>
                </div>
                <span className="transition-transform duration-300 group-open:rotate-180 text-primary">▼</span>
              </summary>
              <div className="p-5 pt-0 border-t border-tactical-border/40 space-y-3.5 text-xs text-muted-foreground font-mono leading-relaxed">
                <p className="text-foreground font-sans font-semibold">
                  24.1. Сотрудник государственного органа имеет право на применение физической силы, специальных средств и огнестрельного оружия лично или в составе подразделения в случаях и порядке, предусмотренных законом.
                </p>
                <p>
                  <span className="text-primary font-bold">24.2.</span> Перечень состоящих на вооружении специальных средств, огнестрельного оружия и боеприпасов устанавливается Правительством РФ или уполномоченным органом.
                </p>
                <p>
                  <span className="text-primary font-bold">24.3.</span> В состоянии необходимой обороны, крайней необходимости или при задержании преступника, при отсутствии табельного оружия/спецсредств сотрудник вправе использовать любые подручные средства.
                </p>
                <p>
                  <span className="text-primary font-bold">24.4.</span> Превышение полномочий при применении силы, спецсредств или оружия влечет ответственность, установленную законодательством.
                </p>
                <p className="text-foreground font-sans font-semibold bg-tactical-card/50 p-2.5 rounded border border-tactical-border">
                  <span className="text-primary font-mono mr-1">24.5.</span> Сотрудник государственного органа не несет ответственность за вред, причиненный гражданам и организациям при применении силы, спецсредств, транспорта или оружия, если это осуществлялось по основаниям и в порядке, установленным законом.
                </p>
                <p>
                  <span className="text-primary font-bold">24.6.</span> Иные лица вправе использовать имеющиеся специальные средства в случаях, предусмотренных законодательством.
                </p>
              </div>
            </details>

            {/* СТАТЬЯ 25 */}
            <details className="group border border-tactical-border/60 bg-tactical-card/30 rounded-lg overflow-hidden transition-all duration-300 card-glow">
              <summary className="list-none flex items-center justify-between cursor-pointer p-4 font-oswald text-base uppercase text-primary tracking-widest select-none hover:bg-primary/5 transition-colors">
                <div className="flex items-center gap-2.5">
                  <Icon name="Scale" className="text-primary" size={20} />
                  <span className="font-semibold">Статья 25. Применение физической силы, специальных средств и вооружения</span>
                </div>
                <span className="transition-transform duration-300 group-open:rotate-180 text-primary">▼</span>
              </summary>
              <div className="p-5 pt-0 border-t border-tactical-border/40 space-y-3 text-xs text-muted-foreground font-mono leading-relaxed">
                <div className="p-3 bg-tactical-card/50 border border-tactical-border rounded text-foreground font-sans font-semibold space-y-2">
                  <p>
                    25.1. Сотрудник государственного органа имеет право на применение физической силы, всего спектра спецснаряжения и вооружения для целей задержания/ареста, защиты жизни и здоровья граждан и своей жизни от посягательств, в равнозначной мере по степени угрозы.
                  </p>
                  <p className="text-yellow-500 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1">
                    <Icon name="AlertTriangle" size={14} /> В случае применения огнестрельного оружия сотрудник обязан вызвать скорую помощь (СМП) или оказать помощь сам!
                  </p>
                </div>
                <p>
                  <span className="text-primary font-bold">25.2.</span> Применение огнестрельного оружия против невооружённого правонарушителя допускается после исчерпания всех иных средств принуждения в виде двух предупреждений. Если преступник вооружен, огонь допускается для сдерживания с предупреждением и выстрелом в воздух. Без предупреждения — при явной угрозе жизни/здоровью.
                </p>
                <p>
                  <span className="text-primary font-bold">25.3.</span> Применение электрошокера (тайзера) допускается после однократного предупреждения. При явной необходимости сдерживания преступника и невозможности предупредить — разрешено без предупреждения.
                </p>
              </div>
            </details>

            {/* ПРАКТИЧЕСКИЙ АЛГОРИТМ ПРИМЕНЕНИЯ ОРУЖИЯ И ТАЙЗЕРА */}
            <div className="border border-tactical-border bg-tactical-card/20 rounded-lg p-5 space-y-5">
              <h4 className="font-oswald text-base uppercase text-primary tracking-wider border-b border-tactical-border pb-1.5 flex items-center gap-2">
                <Icon name="Wrench" size={18} className="text-primary" />
                Практический регламент применения силы и оружия
              </h4>

              <div className="space-y-4 text-xs font-ibm text-foreground/90">
                {/* ТАЙЗЕР (ЭЛЕКТРОШОКЕР) */}
                <div className="p-4 bg-black/20 border border-tactical-border rounded space-y-3 hover:border-primary/20 transition-colors">
                  <span className="font-oswald text-sm uppercase text-primary tracking-wider flex items-center gap-1.5">
                    <Icon name="Zap" size={16} className="text-yellow-400" />
                    Применение электрошокера (Тайзера)
                  </span>
                  <div className="space-y-2">
                    <div className="flex gap-2 items-start">
                      <span className="text-primary font-bold font-mono">1.</span>
                      <p>
                        Сделать <strong className="text-foreground">однократное устное предупреждение</strong>: 
                        <span className="text-cyan-400 font-mono block mt-1 bg-black/40 px-2 py-1 rounded">«Стоять! Будет применено спецсредство — электрошокер!»</span>
                      </p>
                    </div>
                    <div className="flex gap-2 items-start">
                      <span className="text-primary font-bold font-mono">2.</span>
                      <p>Произвести выстрел из тайзера с целью остановки правонарушителя.</p>
                    </div>
                    <div className="mt-2 bg-yellow-950/30 border border-yellow-500 text-yellow-400 p-3 rounded font-mono text-[11px] leading-relaxed shadow-[0_0_10px_rgba(234,179,8,0.05)]">
                      <span className="font-bold text-yellow-500 uppercase block mb-1">⚠️ ВАЖНО:</span>
                      При явной необходимости сдерживания преступника и невозможности предупредить — разрешено применение электрошокера (тайзера) <strong className="text-yellow-300">БЕЗ ПРЕДУПРЕЖДЕНИЯ</strong> (ст. 25.3).
                    </div>
                  </div>
                </div>

                {/* НЕВООРУЖЕННЫЙ ПРЕСТУПНИК */}
                <div className="p-4 bg-black/20 border border-tactical-border rounded space-y-3 hover:border-primary/20 transition-colors">
                  <span className="font-oswald text-sm uppercase text-primary tracking-wider flex items-center gap-1.5">
                    <Icon name="Target" size={16} className="text-red-400" />
                    Против невооруженного нарушителя (Огнестрельное оружие)
                  </span>
                  <div className="space-y-2">
                    <div className="bg-yellow-950/20 border border-yellow-500/30 text-yellow-500 p-2.5 rounded font-mono text-[11px] mb-2 leading-relaxed">
                      ⚠️ Применение допускается только после <strong>исчерпания всех иных средств</strong> принуждения!
                    </div>
                    <div className="flex gap-2.5 items-start">
                      <span className="text-primary font-bold font-mono">Шаг 1:</span>
                      <p>Сделать первое устное предупреждение о намерении стрелять.</p>
                    </div>
                    <div className="flex gap-2.5 items-start">
                      <span className="text-primary font-bold font-mono">Шаг 2:</span>
                      <p>Сделать второе устное предупреждение о намерении открыть огонь.</p>
                    </div>
                    <div className="flex gap-2.5 items-start">
                      <span className="text-primary font-bold font-mono">Шаг 3:</span>
                      <p>Применить огнестрельное оружие.</p>
                    </div>
                  </div>
                </div>

                {/* ВООРУЖЕННЫЙ ПРЕСТУПНИК */}
                <div className="p-4 bg-black/20 border border-tactical-border rounded space-y-3 hover:border-primary/20 transition-colors">
                  <span className="font-oswald text-sm uppercase text-primary tracking-wider flex items-center gap-1.5">
                    <Icon name="ShieldAlert" size={16} className="text-red-500" />
                    Против вооруженного преступника (Холодное/Огнестрельное оружие)
                  </span>
                  <div className="space-y-2">
                    <div className="flex gap-2.5 items-start">
                      <span className="text-primary font-bold font-mono">1.</span>
                      <p>Предупредить о намерении открыть огонь на поражение.</p>
                    </div>
                    <div className="flex gap-2.5 items-start">
                      <span className="text-primary font-bold font-mono">2.</span>
                      <p>Сделать <strong>предупредительный выстрел в воздух</strong>.</p>
                    </div>
                    <div className="flex gap-2.5 items-start">
                      <span className="text-primary font-bold font-mono">3.</span>
                      <p>Применить огнестрельное оружие для сдерживания/нейтрализации преступника.</p>
                    </div>
                    <div className="mt-2 bg-red-950/40 border border-red-500 text-red-400 p-3 rounded font-mono text-[11px] leading-relaxed shadow-[0_0_10px_rgba(239,68,68,0.05)]">
                      <span className="font-bold text-red-500 uppercase block mb-1">⚠️ ВАЖНО:</span>
                      В случае <strong className="text-red-200">явной угрозы жизни или здоровью</strong> человека и гражданина, разрешается применение огнестрельного оружия <strong className="text-red-300">БЕЗ ПРЕДУПРЕЖДЕНИЯ</strong> (ст. 25.2).
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-tactical-border flex justify-end">
          <button
            onClick={onClose}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-oswald text-sm uppercase tracking-widest px-5 py-2 transition-colors corner-mark"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. LEGAL MEMO (Памятка: Законное требование)
// ═══════════════════════════════════════════════════════════════════════════════
export function LegalMemo({ isOpen, onClose }: MemoProps) {
  if (!isOpen) return null;
  return createPortal(
    <div className="fixed inset-0 bg-background/85 backdrop-blur-sm z-50 overflow-y-auto flex items-start justify-center p-4 py-8 md:py-12">
      <div className="bg-tactical-card border-2 border-primary/50 max-w-3xl w-full corner-mark card-glow p-6 text-foreground relative animate-in fade-in zoom-in duration-200 min-h-[80vh] flex flex-col justify-between">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Icon name="X" size={20} />
        </button>
        
        <div>
          <h3 className="font-oswald text-xl uppercase tracking-wider text-foreground mb-4 pb-2 border-b border-tactical-border flex items-center gap-2">
            <Icon name="ShieldAlert" className="text-primary" size={20} />
            Памятка: Законное требование
          </h3>

          <div className="space-y-5 font-ibm text-sm text-foreground/90 leading-relaxed">
            {/* СТАТЬЯ 21 */}
            <div className="border border-tactical-border/60 bg-tactical-card/30 rounded-lg overflow-hidden transition-all duration-300 card-glow p-5 space-y-4">
              <h4 className="font-oswald text-base uppercase text-primary tracking-widest border-b border-tactical-border/40 pb-2 flex items-center gap-2 font-semibold">
                <Icon name="Scale" size={18} className="text-primary" />
                Статья 21. Законное требование
              </h4>
              
              <div className="space-y-3.5 text-xs text-muted-foreground font-mono leading-relaxed">
                <p className="text-foreground font-sans font-semibold border-l-2 border-primary pl-3 py-0.5">
                  21.1. Перед выдвижением законного требования сотрудник находящийся в форме с знаками различия обязан обозначить свою принадлежность к государственному органу. Обозначение должно содержать наименование государственного органа к которому он относится.
                </p>
                <p className="text-foreground font-sans font-semibold border-l-2 border-primary pl-3 py-0.5">
                  Сотрудник находящийся при исполнении, без формы со знаками различия обязан перед выдвижением законного требования представиться в установленном федеральными законами порядке. Если порядок представления сотрудника не установлен федеральными законами, он должен назвать должность, фамилию, звание, предъявить служебное удостоверение, если иное не предусмотрено настоящим Кодексом.
                </p>
                <p className="bg-tactical-card/50 p-2.5 rounded border border-tactical-border text-foreground font-sans font-semibold">
                  <span className="text-primary font-mono mr-1">21.2.</span> Законное требование или распоряжение - это требование, основанное на нормативных правовых актах, выраженное в устной или письменной форме.
                </p>
              </div>
            </div>

            {/* ПРАКТИЧЕСКИЙ РЕГЛАМЕНТ */}
            <div className="border border-tactical-border bg-tactical-card/20 rounded-lg p-5 space-y-4">
              <h4 className="font-oswald text-base uppercase text-primary tracking-wider border-b border-tactical-border pb-1.5 flex items-center gap-2">
                <Icon name="Wrench" size={18} className="text-primary" />
                Порядок выдвижения требования (Алгоритм)
              </h4>

              <div className="space-y-3.5 text-xs font-ibm">
                {/* Форма */}
                <div className="p-3.5 bg-black/20 border border-tactical-border rounded space-y-2.5">
                  <span className="font-oswald text-xs uppercase text-primary tracking-wider flex items-center gap-1.5 font-bold">
                    <Icon name="User" size={14} className="text-green-400" />
                    Вариант А: Если вы НАХОДИТЕСЬ В ФОРМЕ со знаками различия
                  </span>
                  <p className="text-muted-foreground text-[11px]">
                    Вы обязаны обозначить свою принадлежность к госоргану (назвать ведомство).
                  </p>
                  <div className="bg-black/60 border border-cyan-500/20 px-3 py-2 rounded font-mono text-xs text-cyan-400 flex items-start gap-1.5 shadow-inner">
                    <span className="text-cyan-500 font-sans font-bold flex-shrink-0">{`> [Пример отыгровки]:`}</span> 
                    <span>«Я являюсь сотрудником Росгвардии. Требую от вас отойти от служебного автомобиля на 5 метров!»</span>
                  </div>
                </div>

                {/* Без формы */}
                <div className="p-3.5 bg-black/20 border border-tactical-border rounded space-y-2.5">
                  <span className="font-oswald text-xs uppercase text-primary tracking-wider flex items-center gap-1.5 font-bold">
                    <Icon name="UserX" size={14} className="text-yellow-400" />
                    Вариант Б: Если вы БЕЗ ФОРМЫ (при исполнении)
                  </span>
                  <p className="text-muted-foreground text-[11px]">
                    Вы обязаны представиться по форме: назвать должность, фамилию, звание и предъявить служебное удостоверение.
                  </p>
                  <div className="bg-black/60 border border-cyan-500/20 px-3 py-2 rounded font-mono text-xs text-cyan-400 flex items-start gap-1.5 shadow-inner mb-2">
                    <span className="text-cyan-500 font-sans font-bold flex-shrink-0">{`> [Как отыграть]:`}</span> 
                    <span>«Здравствуйте. Младший сержант Иванов, Росгвардия. Предъявляю удостоверение. Требую прекратить правонарушение!»</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-tactical-border flex justify-end">
          <button
            onClick={onClose}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-oswald text-sm uppercase tracking-widest px-5 py-2 transition-colors corner-mark"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. SEARCH MEMO (Памятка: Личный обыск (Статья 19))
// ═══════════════════════════════════════════════════════════════════════════════
export function SearchMemo({ isOpen, onClose }: MemoProps) {
  if (!isOpen) return null;
  return createPortal(
    <div className="fixed inset-0 bg-background/85 backdrop-blur-sm z-50 overflow-y-auto flex items-start justify-center p-4 py-8 md:py-12">
      <div className="bg-tactical-card border-2 border-primary/50 max-w-3xl w-full corner-mark card-glow p-6 text-foreground relative animate-in fade-in zoom-in duration-200 min-h-[80vh] flex flex-col justify-between">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Icon name="X" size={20} />
        </button>
        
        <div>
          <h3 className="font-oswald text-xl uppercase tracking-wider text-foreground mb-4 pb-2 border-b border-tactical-border flex items-center gap-2">
            <Icon name="ShieldAlert" className="text-primary" size={20} />
            Памятка: Личный обыск (Статья 19)
          </h3>

          <div className="space-y-5 font-ibm text-sm text-foreground/90 leading-relaxed">
            {/* 19.1 Основное положение и основания */}
            <div className="border border-tactical-border/60 bg-tactical-card/30 rounded-lg p-5 space-y-3">
              <h4 className="font-oswald text-base uppercase text-primary tracking-widest border-b border-tactical-border/40 pb-2 flex items-center gap-2 font-semibold">
                <Icon name="Scale" size={18} className="text-primary" />
                19.1. Понятие и основания обыска
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed font-sans">
                <strong className="text-foreground">Личный обыск</strong> — подозреваемый может быть подвергнут личному обыску в порядке, установленном настоящим Кодексом.
              </p>
              <div className="bg-yellow-950/20 border-l-2 border-yellow-500 p-3 rounded text-yellow-300 text-xs font-mono space-y-1">
                <span className="font-sans font-bold text-yellow-400 block uppercase tracking-wider">Основание производства:</span>
                Наличие достаточных данных полагать, что у лица могут находиться орудия, оборудование или иные средства совершения преступления, предметы, документы и ценности, имеющие значение для дела.
              </div>
              <div className="bg-blue-950/20 border-l-2 border-blue-500 p-3 rounded text-blue-300 text-xs font-mono">
                <span className="font-sans font-bold text-blue-400 block uppercase tracking-wider">БЕЗ ПОСТАНОВЛЕНИЯ разрешено:</span>
                При задержании лица, заключении его под стражу, а также при достаточном подозрении, что находящееся на месте обыска лицо скрывает при себе вещественные доказательства.
              </div>
            </div>

            {/* 19.2 Конфискация и изъятие */}
            <div className="border border-tactical-border/60 bg-tactical-card/30 rounded-lg p-5 space-y-3">
              <h4 className="font-oswald text-base uppercase text-primary tracking-widest border-b border-tactical-border/40 pb-2 flex items-center gap-2 font-semibold">
                <Icon name="ShieldAlert" size={18} className="text-primary" />
                19.2. Правила конфискации предметов
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed font-sans">
                Разрешается конфискация следующих предметов:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2.5 bg-black/40 border border-tactical-border rounded flex items-start gap-2">
                  <Icon name="Shield" size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <span>Все виды холодного и огнестрельного оружия <span className="text-muted-foreground">(кроме разрешенного по закону при наличии лицензии)</span></span>
                </div>
                <div className="p-2.5 bg-black/40 border border-tactical-border rounded flex items-start gap-2">
                  <Icon name="Eye" size={14} className="text-yellow-400 flex-shrink-0 mt-0.5" />
                  <span>Персональные средства защиты <span className="text-muted-foreground">(в соответствии с законодательством)</span></span>
                </div>
                <div className="p-2.5 bg-black/40 border border-tactical-border rounded flex items-start gap-2">
                  <Icon name="AlertTriangle" size={14} className="text-orange-400 flex-shrink-0 mt-0.5" />
                  <span>Наркосодержащие препараты/вещества и компоненты для их производства</span>
                </div>
                <div className="p-2.5 bg-black/40 border border-tactical-border rounded flex items-start gap-2">
                  <Icon name="Wrench" size={14} className="text-cyan-400 flex-shrink-0 mt-0.5" />
                  <span>Компоненты для производства оружия или боеприпасов</span>
                </div>
              </div>

              <div className="bg-red-950/20 border-l-2 border-red-500 p-3 rounded text-red-300 text-xs font-sans font-semibold">
                ⚠️ КРИТИЧЕСКИЙ РЕГЛАМЕНТ:
                <p className="font-mono text-muted-foreground text-[11px] mt-1 font-normal">
                  Конфискованные предметы должны упаковываться соответствующим образом в специальные пакеты зиплок.
                </p>
              </div>
            </div>

            {/* 19.3 Ситуации применения обыска */}
            <div className="border border-tactical-border/60 bg-tactical-card/30 rounded-lg p-5 space-y-3">
              <h4 className="font-oswald text-base uppercase text-primary tracking-widest border-b border-tactical-border/40 pb-2 flex items-center gap-2 font-semibold">
                <Icon name="FileText" size={18} className="text-primary" />
                19.3. Проведение обыска в особых случаях
              </h4>
              <ul className="space-y-2 text-xs font-sans text-muted-foreground list-disc pl-4">
                <li>
                  <strong className="text-foreground">Стандартный порядок:</strong> Проводится при задержании, при аресте, а также в рамках ЧП, ВП или КТО.
                </li>
                <li>
                  <strong className="text-foreground">Рыболовы:</strong> Личный обыск лиц, осуществляющих рыболовную деятельность в речных, озерных, морских водоёмах на водном транспорте или с удочкой, проводится исключительно уполномоченными сотрудниками полиции.
                </li>
                <li>
                  <strong className="text-foreground">Проход на КПП/Закрытую территорию:</strong> Может производиться на добровольной основе. В случае отказа во въезде/допуске на территорию лицу может быть законно отказано.
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-tactical-border flex justify-end">
          <button
            onClick={onClose}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-oswald text-sm uppercase tracking-widest px-5 py-2 transition-colors corner-mark"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. WEAPON SIZ MEMO (Памятка: Разрешенное оружие и СИЗ)
// ═══════════════════════════════════════════════════════════════════════════════
export function WeaponSizMemo({ isOpen, onClose }: MemoProps) {
  if (!isOpen) return null;
  return createPortal(
    <div className="fixed inset-0 bg-background/85 backdrop-blur-sm z-50 overflow-y-auto flex items-start justify-center p-4 py-8 md:py-12">
      <div className="bg-tactical-card border-2 border-primary/50 max-w-4xl w-full corner-mark card-glow p-6 text-foreground relative animate-in fade-in zoom-in duration-200 min-h-[85vh] flex flex-col justify-between">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Icon name="X" size={20} />
        </button>
        
        <div>
          <h3 className="font-oswald text-xl uppercase tracking-wider text-foreground mb-4 pb-2 border-b border-tactical-border flex items-center gap-2">
            <Icon name="Shield" className="text-primary" size={20} />
            Памятка: Разрешенное оружие и СИЗ
          </h3>

          <div className="space-y-6 font-ibm text-sm text-foreground/90 leading-relaxed">
            {/* Оружие самообороны и разрешенные модели */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Гражданское оружие */}
              <div className="border border-tactical-border bg-tactical-card/30 p-4 rounded-lg space-y-3">
                <h4 className="font-oswald text-sm uppercase text-primary tracking-wider border-b border-tactical-border/40 pb-1 flex items-center gap-1.5 font-semibold">
                  <Icon name="Scale" size={16} className="text-primary" />
                  Гражданское оружие (Ст. 4, 6.2)
                </h4>
                <p className="text-[11px] text-muted-foreground">Допускается хранение гражданскими при наличии лицензии. Стрельба очередями запрещена.</p>
                
                <div className="space-y-2 text-xs font-mono">
                  <div className="p-2 bg-black/40 border border-tactical-border/50 rounded">
                    <span className="text-primary font-bold">Пистолеты:</span>
                    <p className="text-[11px] text-foreground mt-0.5">Heckler & Koch P2000, Heckler & Koch P7-M10, Taurus PT92</p>
                  </div>
                  <div className="p-2 bg-black/40 border border-tactical-border/50 rounded">
                    <span className="text-primary font-bold">Дробовики:</span>
                    <p className="text-[11px] text-foreground mt-0.5">Обрез, Mossberg 500 Тактический</p>
                  </div>
                  <div className="p-2 bg-black/40 border border-tactical-border/50 rounded">
                    <span className="text-primary font-bold">Пистолеты-пулемёты:</span>
                    <p className="text-[11px] text-foreground mt-0.5">Intratec TEC-9, Мини Узи, vz.61 “Скорпион”</p>
                  </div>
                </div>
              </div>

              {/* Ограничения, Патроны и Крафт */}
              <div className="border border-tactical-border bg-tactical-card/30 p-4 rounded-lg space-y-3">
                <h4 className="font-oswald text-sm uppercase text-primary tracking-wider border-b border-tactical-border/40 pb-1 flex items-center gap-1.5 font-semibold">
                  <Icon name="AlertTriangle" size={16} className="text-primary" />
                  Патроны, Лимиты и Запреты (Ст. 6)
                </h4>
                <ul className="space-y-1.5 text-xs text-muted-foreground list-disc pl-4 font-sans">
                  <li>
                    <strong className="text-foreground">Патроны и боеприпасы:</strong> Разрешено хранение всех видов. Лицензия для хранения патронов <span className="text-green-400 font-bold">НЕ ТРЕБУЕТСЯ</span> (Ст. 6.3).
                  </li>
                  <li>
                    <strong className="text-foreground">Крафт-материалы:</strong> Разрешено хранение материалов для создания оружия до <span className="text-cyan-400 font-bold">100 единиц</span> (Ст. 6.4).
                  </li>
                  <li className="text-red-400">
                    <strong>Массовые мероприятия:</strong> Ношение оружия на митингах, шествиях, публичных акциях, а также в состоянии опьянения строго запрещено.
                  </li>
                </ul>
              </div>
            </div>

            {/* Правила ношения СИЗ */}
            <div className="border border-tactical-border/60 bg-tactical-card/30 rounded-lg p-5 space-y-4">
              <h4 className="font-oswald text-base uppercase text-primary tracking-widest border-b border-tactical-border/40 pb-2 flex items-center gap-2 font-semibold">
                <Icon name="ShieldAlert" size={18} className="text-primary" />
                Правила ношения СИЗ (Статья 7)
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* 2 класс */}
                <div className="p-3 bg-green-950/20 border border-green-500/30 rounded space-y-1.5">
                  <span className="font-oswald text-xs uppercase text-green-400 font-bold tracking-wider flex items-center gap-1">
                    <Icon name="Check" size={12} /> Лёгкий (2-й класс)
                  </span>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Разрешен для ношения и хранения абсолютно всеми гражданами Российской Федерации.
                  </p>
                </div>

                {/* 3 класс */}
                <div className="p-3 bg-yellow-950/20 border border-yellow-500/30 rounded space-y-1.5">
                  <span className="font-oswald text-xs uppercase text-yellow-400 font-bold tracking-wider flex items-center gap-1">
                    <Icon name="AlertTriangle" size={12} /> Средний (3-й класс)
                  </span>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Запрещен гражданским. Исключения: ЧОП (с лицензией и записью в ТК) и Журналисты (с надписью "Пресса" и удостоверением).
                  </p>
                </div>

                {/* 4 класс */}
                <div className="p-3 bg-red-950/20 border border-red-500/30 rounded space-y-1.5">
                  <span className="font-oswald text-xs uppercase text-red-400 font-bold tracking-wider flex items-center gap-1">
                    <Icon name="X" size={12} /> Тяжёлый (4-й класс)
                  </span>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Строго запрещен любым гражданским. Ношение разрешено только сотрудникам гос. и силовых структур при исполнении.
                  </p>
                </div>
              </div>
            </div>

            {/* Лицензирование и лишение прав */}
            <div className="border border-tactical-border/60 bg-tactical-card/30 rounded-lg p-5 space-y-3">
              <h4 className="font-oswald text-base uppercase text-primary tracking-widest border-b border-tactical-border/40 pb-2 flex items-center gap-2 font-semibold">
                <Icon name="ClipboardList" size={18} className="text-primary" />
                Лицензирование и лишение прав (Статья 8)
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="space-y-2">
                  <p className="text-muted-foreground font-sans">
                    Право на покупку имеют граждане <strong className="text-foreground">с 18 лет</strong> при наличии лицензии. Срок действия лицензии — <strong className="text-primary">3 месяца</strong>.
                  </p>
                  <div className="p-2.5 bg-black/40 border border-tactical-border rounded text-red-400 font-sans">
                    <strong>Лицензия не выдается:</strong> судимым за умышленные преступления, либо имеющим снятую судимость за тяжкие с применением оружия.
                  </div>
                </div>

                <div className="bg-black/30 border border-tactical-border p-3 rounded space-y-2">
                  <span className="font-oswald text-xs uppercase text-primary tracking-wider font-bold">Лишение лицензии судом за преступления с оружием:</span>
                  <div className="space-y-1 font-mono text-[11px]">
                    <p><span className="text-yellow-400">● Небольшая тяжесть:</span> лишение на <strong className="text-foreground">10 дней</strong></p>
                    <p><span className="text-orange-400">● Средняя и тяжкие:</span> лишение на <strong className="text-foreground">20 дней</strong></p>
                    <p><span className="text-red-400">● Особо тяжкие:</span> лишение на <strong className="text-foreground">25 дней</strong></p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-tactical-border flex justify-end">
          <button
            onClick={onClose}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-oswald text-sm uppercase tracking-widest px-5 py-2 transition-colors corner-mark"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. RIGHTS MEMO (Памятка: Реализация прав задержанного (Статья 9))
// ═══════════════════════════════════════════════════════════════════════════════
export function RightsMemo({ isOpen, onClose }: MemoProps) {
  if (!isOpen) return null;
  return createPortal(
    <div className="fixed inset-0 bg-background/85 backdrop-blur-sm z-50 overflow-y-auto flex items-start justify-center p-4 py-8 md:py-12">
      <div className="bg-tactical-card border-2 border-primary/50 max-w-4xl w-full corner-mark card-glow p-6 text-foreground relative animate-in fade-in zoom-in duration-200 min-h-[85vh] flex flex-col justify-between">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Icon name="X" size={20} />
        </button>
        
        <div>
          <h3 className="font-oswald text-xl uppercase tracking-wider text-foreground mb-4 pb-2 border-b border-tactical-border flex items-center gap-2">
            <Icon name="Scale" className="text-primary" size={20} />
            Памятка: Реализация прав задержанного (Статья 9)
          </h3>

          <div className="space-y-6 font-ibm text-sm text-foreground/90 leading-relaxed">
            {/* Очередность и Государственный Адвокат */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Очередность и правила */}
              <div className="border border-tactical-border bg-tactical-card/30 p-4 rounded-lg space-y-3">
                <h4 className="font-oswald text-sm uppercase text-primary tracking-wider border-b border-tactical-border/40 pb-1 flex items-center gap-1.5 font-semibold">
                  <Icon name="ListOrdered" size={16} className="text-primary" />
                  Очередность реализации (Ст. 9.1, 9.5, 9.7)
                </h4>
                <ul className="space-y-2 text-xs text-muted-foreground list-disc pl-4 font-sans">
                  <li>
                    <strong className="text-foreground">Поочередно:</strong> Права реализуются последовательно. Очередность устанавливает сотрудник правоохранительных органов.
                  </li>
                  <li>
                    <strong className="text-foreground">Адвокат в КПЗ:</strong> Право на государственного адвоката реализуется непосредственно в камерах предварительного заключения.
                  </li>
                  <li>
                    <strong className="text-foreground">Устный отказ:</strong> Если задержанный устно отказался от какого-либо права, это право повторно не предоставляется.
                  </li>
                  <li>
                    <strong className="text-foreground">Передача задержанного:</strong> Принимающий сотрудник реализует только нереализованные права. Передающий обязан сообщить статус всех прав.
                  </li>
                </ul>
              </div>

              {/* Регламент вызова адвоката */}
              <div className="border border-tactical-border bg-tactical-card/30 p-4 rounded-lg space-y-3">
                <h4 className="font-oswald text-sm uppercase text-primary tracking-wider border-b border-tactical-border/40 pb-1 flex items-center gap-1.5 font-semibold">
                  <Icon name="Clock" size={16} className="text-primary" />
                  Вызов адвоката и тайминги (Ст. 9.2, 9.5)
                </h4>
                <p className="text-[11px] text-muted-foreground">При запросе адвоката процессуальные действия приостанавливаются. Вызов идет в общую рацию гос. организаций.</p>
                
                <div className="space-y-2 font-mono text-xs">
                  <div className="p-2.5 bg-yellow-950/20 border border-yellow-500/30 rounded flex items-start gap-2">
                    <Icon name="PhoneCall" size={14} className="text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong>Ожидание ответа: 5 минут</strong>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Если ответа нет через 5 минут, процессуальные действия возобновляются.</p>
                    </div>
                  </div>
                  <div className="p-2.5 bg-red-950/20 border border-red-500/30 rounded flex items-start gap-2">
                    <Icon name="Navigation" size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong>Ожидание прибытия: 5 минут</strong>
                      <p className="text-[10px] text-muted-foreground mt-0.5">С момента ответа адвокат должен прибыть за 5 минут. Если не прибыл — право считается реализованным.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Телефонный звонок и беседа */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Телефонный звонок */}
              <div className="border border-tactical-border bg-tactical-card/30 p-4 rounded-lg space-y-3">
                <h4 className="font-oswald text-sm uppercase text-primary tracking-wider border-b border-tactical-border/40 pb-1 flex items-center gap-1.5 font-semibold">
                  <Icon name="Phone" size={16} className="text-primary" />
                  Телефонный звонок (Ст. 9.3)
                </h4>
                <div className="space-y-2 text-xs font-sans text-muted-foreground">
                  <p>
                    <strong className="text-foreground">Процедура фиксации:</strong> Сотрудник обязан ослабить хват наручников, освободить одну руку задержанного, а второе кольцо пристегнуть к себе, к клетке камеры или иному предмету.
                  </p>
                  <div className="bg-black/40 border border-tactical-border p-2.5 rounded font-mono text-[11px] text-foreground">
                    ⚠️ Отсчет времени звонка начинается с момента освобождения одной руки, даже если задержанный молчит или не пользуется телефоном.
                  </div>
                </div>
              </div>

              {/* Конфиденциальная беседа */}
              <div className="border border-tactical-border bg-tactical-card/30 p-4 rounded-lg space-y-3">
                <h4 className="font-oswald text-sm uppercase text-primary tracking-wider border-b border-tactical-border/40 pb-1 flex items-center gap-1.5 font-semibold">
                  <Icon name="MessagesSquare" size={16} className="text-primary" />
                  Конфиденциальная беседа (Ст. 9.4)
                </h4>
                <div className="space-y-2 text-xs font-sans text-muted-foreground">
                  <p>
                    <strong className="text-foreground">Процедура проведения:</strong> Сотрудник обязан отвести задержанного и адвоката в подходящее конфиденциальное помещение поблизости и полностью его покинуть, оставив их наедине.
                  </p>
                  <div className="bg-black/40 border border-tactical-border p-2.5 rounded font-mono text-[11px] text-foreground">
                    ⏳ Время конфиденциальной беседы начинается ровно в момент выхода сотрудника из помещения.
                  </div>
                </div>
              </div>
            </div>

            {/* Вызов частного адвоката */}
            <div className="border border-tactical-border/60 bg-tactical-card/30 rounded-lg p-5 space-y-3">
              <h4 className="font-oswald text-base uppercase text-primary tracking-widest border-b border-tactical-border/40 pb-2 flex items-center gap-2 font-semibold">
                <Icon name="UserCheck" size={18} className="text-primary" />
                Вызов частного адвоката (Статья 9.6)
              </h4>
              <p className="text-xs text-muted-foreground font-sans">
                Запрос государственного адвоката <strong className="text-foreground">не лишает</strong> задержанного права вызвать собственного (частного) адвоката через реализацию телефонного звонка (если звонок не был совершен ранее).
              </p>
              <div className="p-3 bg-cyan-950/20 border border-cyan-500/30 rounded text-cyan-300 text-xs font-sans space-y-2">
                <span className="font-bold uppercase tracking-wider block">Регламент прибытия частного адвоката:</span>
                <ul className="list-decimal pl-4 space-y-1 font-mono text-[11px] text-muted-foreground">
                  <li>После вызова задержанным, адвокат обязан прибыть в указанное место проведения действий в течение <strong className="text-foreground">5 минут</strong>.</li>
                  <li>Процессуальные действия приостанавливаются на время ожидания (до 5 минут) и возобновляются по его истечении или по прибытии адвоката.</li>
                  <li>Сотрудник правоохранительного органа <strong className="text-foreground">обязан проверить</strong> прибытие адвоката на место и осуществить его пропуск к задержанному.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-tactical-border flex justify-end">
          <button
            onClick={onClose}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-oswald text-sm uppercase tracking-widest px-5 py-2 transition-colors corner-mark"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8. ACCESS MEMO (Памятка: Допуск на место процессуальных действий (Статья 11))
// ═══════════════════════════════════════════════════════════════════════════════
export function AccessMemo({ isOpen, onClose }: MemoProps) {
  if (!isOpen) return null;
  return createPortal(
    <div className="fixed inset-0 bg-background/85 backdrop-blur-sm z-50 overflow-y-auto flex items-start justify-center p-4 py-8 md:py-12">
      <div className="bg-tactical-card border-2 border-primary/50 max-w-4xl w-full corner-mark card-glow p-6 text-foreground relative animate-in fade-in zoom-in duration-200 min-h-[85vh] flex flex-col justify-between">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Icon name="X" size={20} />
        </button>
        
        <div>
          <h3 className="font-oswald text-xl uppercase tracking-wider text-foreground mb-4 pb-2 border-b border-tactical-border flex items-center gap-2">
            <Icon name="ShieldAlert" className="text-primary" size={20} />
            Памятка: Допуск на место процессуальных действий (Статья 11)
          </h3>

          <div className="space-y-6 font-ibm text-sm text-foreground/90 leading-relaxed">
            {/* Правило дистанции и запрет */}
            <div className="border border-tactical-border/60 bg-tactical-card/30 rounded-lg p-5 space-y-3">
              <h4 className="font-oswald text-base uppercase text-primary tracking-widest border-b border-tactical-border/40 pb-2 flex items-center gap-2 font-semibold">
                <Icon name="AlertTriangle" size={18} className="text-primary" />
                11.1. Основной запрет и дистанция
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed font-sans">
                Присутствие посторонних лиц на месте проведения процессуальных действий <strong className="text-red-400 uppercase font-bold">строго запрещено</strong>.
              </p>
              <div className="bg-red-950/20 border-l-2 border-red-500 p-3 rounded text-red-300 text-xs font-mono">
                <span className="font-sans font-bold text-red-400 block uppercase tracking-wider">ТРЕБОВАНИЕ ОЦЕПЛЕНИЯ:</span>
                Сотрудники имеют законное право потребовать от посторонних лиц покинуть территорию и <span className="text-foreground font-bold">отойти на 10 шагов</span> (или покинуть помещение, если действия проводятся внутри).
              </div>
            </div>

            {/* Перечень субъектов */}
            <div className="border border-tactical-border/60 bg-tactical-card/30 rounded-lg p-5 space-y-3">
              <h4 className="font-oswald text-base uppercase text-primary tracking-widest border-b border-tactical-border/40 pb-2 flex items-center gap-2 font-semibold">
                <Icon name="UserCheck" size={18} className="text-primary" />
                Субъекты с правом беспрепятственного доступа
              </h4>
              <p className="text-xs text-muted-foreground font-sans">
                Проход разрешен исключительно следующим субъектам:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs font-mono">
                <div className="p-2.5 bg-black/40 border border-tactical-border rounded">
                  <span className="text-primary">1. Оперативная группа:</span>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Сотрудники, проводящие процессуальные действия.</p>
                </div>
                <div className="p-2.5 bg-black/40 border border-tactical-border rounded">
                  <span className="text-primary">2. Задержанный(е):</span>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Лица, в отношении которых ведутся действия.</p>
                </div>
                <div className="p-2.5 bg-black/40 border border-tactical-border rounded">
                  <span className="text-primary">3. Один адвокат:</span>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Прибывший по официальному вызову.</p>
                </div>
                <div className="p-2.5 bg-black/40 border border-tactical-border rounded">
                  <span className="text-primary">4. СК, ФСБ и Прокуратура (при вызове):</span>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Если задержан государственный служащий.</p>
                </div>
                <div className="p-2.5 bg-black/40 border border-tactical-border rounded">
                  <span className="text-primary">5-6. Представители прокуратуры / СК (по 1 чел.):</span>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Имеют безусловное право наблюдать за задержанием.</p>
                </div>
                <div className="p-2.5 bg-black/40 border border-tactical-border rounded">
                  <span className="text-primary">7. Руководство организации задержанного:</span>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Для гос. служащих (в т.ч. уволенных в ходе задержания).</p>
                </div>
                <div className="p-2.5 bg-black/40 border border-tactical-border rounded">
                  <span className="text-primary">8. ФСБ (1-я служба - не более 1 чел.):</span>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Обязан быть в форме, с различимыми знаками и удостоверением.</p>
                </div>
                <div className="p-2.5 bg-black/40 border border-tactical-border rounded">
                  <span className="text-primary">9. Передавший задержание сотрудник:</span>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Имеет право присутствовать и наблюдать.</p>
                </div>
                <div className="p-2.5 bg-black/40 border border-tactical-border rounded">
                  <span className="text-primary">10. Сотрудник для аннулирования лицензий:</span>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Вызывается при нарушениях в сфере оборота оружия.</p>
                </div>
              </div>
            </div>

            {/* Дополнительные правила */}
            <div className="border border-tactical-border/60 bg-tactical-card/30 rounded-lg p-5 space-y-3">
              <h4 className="font-oswald text-base uppercase text-primary tracking-widest border-b border-tactical-border/40 pb-2 flex items-center gap-2 font-semibold">
                <Icon name="Scale" size={18} className="text-primary" />
                11.2, 11.3, 11.4. Проход в закрытые зоны и исключения
              </h4>
              <ul className="space-y-2 text-xs font-sans text-muted-foreground list-disc pl-4">
                <li>
                  <strong className="text-foreground">Проход на закрытые объекты:</strong> Все указанные субъекты на время процессуальных действий вправе заходить на закрытые/охраняемые территории.
                </li>
                <li>
                  <strong className="text-foreground">Постоянный надзор:</strong> Сотрудники СК, Прокуратуры и 1-й службы ФСБ имеют право круглосуточно находиться в КПЗ/допросных (не более 1 человека от каждого ведомства) даже при отсутствии текущих действий.
                </li>
                <li>
                  <strong className="text-foreground">Следственные действия и ОРМ:</strong> При наличии ордера или постановления об ОРМ лимиты на численность присутствующих субъектов <strong className="text-cyan-400">не распространяются</strong>.
                </li>
                <li className="text-red-400">
                  <strong>Совмещение ролей:</strong> Одно лицо может исполнять обязанности только одного вида субъекта процессуальных действий.
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-tactical-border flex justify-end">
          <button
            onClick={onClose}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-oswald text-sm uppercase tracking-widest px-5 py-2 transition-colors corner-mark"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 9. RELEASE MEMO (Памятка: Окончание задержания и освобождение (Статья 14))
// ═══════════════════════════════════════════════════════════════════════════════
export function ReleaseMemo({ isOpen, onClose }: MemoProps) {
  if (!isOpen) return null;
  return createPortal(
    <div className="fixed inset-0 bg-background/85 backdrop-blur-sm z-50 overflow-y-auto flex items-start justify-center p-4 py-8 md:py-12">
      <div className="bg-tactical-card border-2 border-primary/50 max-w-4xl w-full corner-mark card-glow p-6 text-foreground relative animate-in fade-in zoom-in duration-200 min-h-[80vh] flex flex-col justify-between">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Icon name="X" size={20} />
        </button>
        
        <div>
          <h3 className="font-oswald text-xl uppercase tracking-wider text-foreground mb-4 pb-2 border-b border-tactical-border flex items-center gap-2">
            <Icon name="ShieldAlert" className="text-primary" size={20} />
            Памятка: Окончание задержания и освобождение (Статья 14)
          </h3>

          <div className="space-y-6 font-ibm text-sm text-foreground/90 leading-relaxed">
            {/* 5 оснований для освобождения */}
            <div className="border border-tactical-border/60 bg-tactical-card/30 rounded-lg p-5 space-y-4">
              <h4 className="font-oswald text-base uppercase text-primary tracking-widest border-b border-tactical-border/40 pb-2 flex items-center gap-2 font-semibold">
                <Icon name="FileText" size={18} className="text-primary" />
                14.1. Пять законных оснований для освобождения
              </h4>
              <p className="text-xs text-muted-foreground font-sans">
                Задержанный подлежит немедленному освобождению при наступлении одного из следующих условий:
              </p>
              
              <div className="space-y-2.5 font-sans text-xs">
                <div className="p-3 bg-black/40 border border-tactical-border/50 rounded flex items-start gap-3">
                  <div className="w-5 h-5 bg-red-950/40 border border-red-500/30 flex items-center justify-center text-red-400 font-bold font-mono text-[11px] rounded-full flex-shrink-0">1</div>
                  <p className="text-muted-foreground"><strong className="text-foreground">Недостаточно доказательств</strong> для установления факта вины лица.</p>
                </div>
                <div className="p-3 bg-black/40 border border-tactical-border/50 rounded flex items-start gap-3">
                  <div className="w-5 h-5 bg-red-950/40 border border-red-500/30 flex items-center justify-center text-red-400 font-bold font-mono text-[11px] rounded-full flex-shrink-0">2</div>
                  <p className="text-muted-foreground"><strong className="text-foreground">Отсутствие арестного наказания:</strong> правонарушение/преступление доказано, но закон не предусматривает наказания в виде лишения свободы.</p>
                </div>
                <div className="p-3 bg-black/40 border border-tactical-border/50 rounded flex items-start gap-3">
                  <div className="w-5 h-5 bg-red-950/40 border border-red-500/30 flex items-center justify-center text-red-400 font-bold font-mono text-[11px] rounded-full flex-shrink-0">3</div>
                  <p className="text-muted-foreground"><strong className="text-foreground">Истечение сроков:</strong> истек максимально допустимый настоящим Кодексом срок времени задержания.</p>
                </div>
                <div className="p-3 bg-black/40 border border-tactical-border/50 rounded flex items-start gap-3">
                  <div className="w-5 h-5 bg-red-950/40 border border-red-500/30 flex items-center justify-center text-red-400 font-bold font-mono text-[11px] rounded-full flex-shrink-0">4</div>
                  <p className="text-muted-foreground"><strong className="text-foreground">Отсутствие оснований:</strong> не выявлено законных оснований для задержания.</p>
                </div>
                <div className="p-3 bg-black/40 border border-tactical-border/50 rounded flex items-start gap-3">
                  <div className="w-5 h-5 bg-red-950/40 border border-red-500/30 flex items-center justify-center text-red-400 font-bold font-mono text-[11px] rounded-full flex-shrink-0">5</div>
                  <p className="text-muted-foreground"><strong className="text-foreground">Сбой принудительного привода:</strong> задержанный доставлен приводом, но следователь, издавший постановление (или член его следственной группы), отсутствует на месте проведения допроса.</p>
                </div>
              </div>
            </div>

            {/* Приостановка и остановка времени */}
            <div className="border border-tactical-border/60 bg-tactical-card/30 rounded-lg p-5 space-y-3">
              <h4 className="font-oswald text-base uppercase text-primary tracking-widest border-b border-tactical-border/40 pb-2 flex items-center gap-2 font-semibold">
                <Icon name="Clock" size={18} className="text-primary" />
                14.2. Правила остановки таймера задержания
              </h4>
              <p className="text-xs text-muted-foreground font-sans">
                Время задержания временно <strong className="text-green-400 font-bold">останавливается</strong> в следующих ситуациях:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 bg-black/40 border border-tactical-border rounded flex items-start gap-2">
                  <Icon name="MessagesSquare" size={14} className="text-cyan-400 flex-shrink-0 mt-0.5" />
                  <span>Непосредственное проведение допроса</span>
                </div>
                <div className="p-3 bg-black/40 border border-tactical-border rounded flex items-start gap-2">
                  <Icon name="UserCheck" size={14} className="text-cyan-400 flex-shrink-0 mt-0.5" />
                  <span>Период ожидания адвоката</span>
                </div>
                <div className="p-3 bg-black/40 border border-tactical-border rounded flex items-start gap-2">
                  <Icon name="Shield" size={14} className="text-cyan-400 flex-shrink-0 mt-0.5" />
                  <span>Ожидание руководства организации задержанного госслужащего</span>
                </div>
                <div className="p-3 bg-black/40 border border-tactical-border rounded flex items-start gap-2">
                  <Icon name="AlertTriangle" size={14} className="text-cyan-400 flex-shrink-0 mt-0.5" />
                  <span>Иные объективные причины приостановки/невозможности продолжения действий сотрудником</span>
                </div>
              </div>

              <div className="bg-red-950/20 border-l-2 border-red-500 p-3 rounded text-red-300 text-xs font-sans font-semibold">
                ⚠️ КРИТИЧЕСКИЙ ЗАПРЕТ ДЛЯ ОФИЦЕРА:
                <p className="font-mono text-muted-foreground text-[11px] mt-1 font-normal">
                  Сотрудник не имеет права останавливать или искусственно затягивать процессуальные действия без объективных причин и законных на то оснований.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-tactical-border flex justify-end">
          <button
            onClick={onClose}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-oswald text-sm uppercase tracking-widest px-5 py-2 transition-colors corner-mark"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 10. TERRITORY MEMO (Памятка: Допуск к закрытой и охраняемой территории (Статья 4))
// ═══════════════════════════════════════════════════════════════════════════════
export function TerritoryMemo({ isOpen, onClose }: MemoProps) {
  if (!isOpen) return null;
  return createPortal(
    <div className="fixed inset-0 bg-background/85 backdrop-blur-sm z-50 overflow-y-auto flex items-start justify-center p-4 py-8 md:py-12">
      <div className="bg-tactical-card border-2 border-primary/50 max-w-4xl w-full corner-mark card-glow p-6 text-foreground relative animate-in fade-in zoom-in duration-200 min-h-[85vh] flex flex-col justify-between">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Icon name="X" size={20} />
        </button>
        
        <div>
          <h3 className="font-oswald text-xl uppercase tracking-wider text-foreground mb-4 pb-2 border-b border-tactical-border flex items-center gap-2">
            <Icon name="Shield" className="text-primary" size={20} />
            Памятка: Допуск к закрытой и охраняемой территории (Статья 4)
          </h3>

          <div className="space-y-6 font-ibm text-sm text-foreground/90 leading-relaxed">
            {/* 4.1 Полный доступ (Высшие чины) */}
            <div className="border border-tactical-border/60 bg-tactical-card/30 rounded-lg p-5 space-y-3">
              <h4 className="font-oswald text-base uppercase text-primary tracking-widest border-b border-tactical-border/40 pb-2 flex items-center gap-2 font-semibold">
                <Icon name="Award" size={18} className="text-primary" />
                4.1. Безусловное право прохода и проезда на ВСЕ территории
              </h4>
              <p className="text-xs text-muted-foreground font-sans">
                Правом беспрепятственного проникновения (прохода/проезда) на любые закрытые и охраняемые объекты обладают:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2 bg-black/40 border border-tactical-border/30 rounded flex items-center gap-2">
                  <Icon name="User" size={12} className="text-primary" />
                  <span>Губернатор и Вице-губернатор ФО</span>
                </div>
                <div className="p-2 bg-black/40 border border-tactical-border/30 rounded flex items-center gap-2">
                  <Icon name="User" size={12} className="text-primary" />
                  <span>Председатели СФ и заксобрания ФО</span>
                </div>
                <div className="p-2 bg-black/40 border border-tactical-border/30 rounded flex items-center gap-2">
                  <Icon name="Scale" size={12} className="text-primary" />
                  <span>Судьи Российской Федерации</span>
                </div>
                <div className="p-2 bg-black/40 border border-tactical-border/30 rounded flex items-center gap-2">
                  <Icon name="Scale" size={12} className="text-primary" />
                  <span>Генпрокурор РФ, его заместители и помощники</span>
                </div>
                <div className="p-2 bg-black/40 border border-tactical-border/30 rounded flex items-center gap-2">
                  <Icon name="Shield" size={12} className="text-primary" />
                  <span>Председатель СК РФ, его заместители и помощники</span>
                </div>
                <div className="p-2 bg-black/40 border border-tactical-border/30 rounded flex items-center gap-2">
                  <Icon name="Scale" size={12} className="text-primary" />
                  <span>Прокуроры субъектов РФ и их заместители</span>
                </div>
                <div className="p-2 bg-black/40 border border-tactical-border/30 rounded flex items-center gap-2">
                  <Icon name="Shield" size={12} className="text-primary" />
                  <span>Руководители следственных органов СК и замы</span>
                </div>
                <div className="p-2 bg-black/40 border border-tactical-border/30 rounded flex items-center gap-2">
                  <Icon name="FileText" size={12} className="text-primary" />
                  <span>Лица по указу Губернатора / решению Председателя СФ</span>
                </div>
              </div>
            </div>

            {/* 4.2 Право доступа министров и аппарата */}
            <div className="border border-tactical-border/60 bg-tactical-card/30 rounded-lg p-5 space-y-3">
              <h4 className="font-oswald text-base uppercase text-primary tracking-widest border-b border-tactical-border/40 pb-2 flex items-center gap-2 font-semibold">
                <Icon name="ShieldAlert" size={18} className="text-primary" />
                4.2. Допуск руководителей министерств и ведомств
              </h4>
              <ul className="space-y-2 text-xs font-sans text-muted-foreground list-disc pl-4">
                <li>
                  <strong className="text-foreground">Министры ФО:</strong> Имеют право прохода/проезда на закрепленные за ними подведомственные территории.
                </li>
                <li>
                  <strong className="text-foreground">Заместители министров и сотрудники администрации Губернатора:</strong> Имеют право прохода на закрытые территории подведомственных министерству органов по соответствующему письменному приказу министра.
                </li>
              </ul>
            </div>

            {/* 4.3, 4.4, 4.5, 4.6, 4.7 Ведомства, ФСО и Медики */}
            <div className="border border-tactical-border/60 bg-tactical-card/30 rounded-lg p-5 space-y-4">
              <h4 className="font-oswald text-base uppercase text-primary tracking-widest border-b border-tactical-border/40 pb-2 flex items-center gap-2 font-semibold">
                <Icon name="Wrench" size={18} className="text-primary" />
                Проверки, следственные действия, ФСО и Медики
              </h4>
              
              <div className="space-y-3 text-xs font-sans text-muted-foreground">
                <div className="p-3 bg-black/40 border border-tactical-border rounded">
                  <strong className="text-foreground block mb-1">🔍 Проверки и надзор (Ст. 4.3, 4.4)</strong>
                  В рамках проверок и надзорной деятельности прокуратура и проверяющие вправе проезжать на закрытые объекты. 
                  <span className="text-yellow-400 block mt-1">↳ Исключение для Войсковых частей: Вход регулируется отдельной статьей 21 ФЗ.</span>
                </div>

                <div className="p-3 bg-black/40 border border-tactical-border rounded">
                  <strong className="text-foreground block mb-1">💼 Следствие и ФСО (Ст. 4.5, 4.7)</strong>
                  Следователи при проведении действий или задержании имеют доступ к объектам проверяемой структуры. Сотрудники ФСО проходят строго в сопровождении лиц, наделенных этим правом.
                </div>

                <div className="p-3 bg-red-950/20 border border-red-500/30 rounded text-red-300">
                  <strong className="text-foreground block mb-1 text-red-400">🚑 Медицинский персонал (Ст. 4.6)</strong>
                  Врачи ГБУЗ вправе проезжать для оказания помощи при <strong className="text-foreground font-bold">обязательной фиксации причины</strong>.
                  <p className="font-bold mt-1 text-[11px] text-yellow-400 uppercase">
                    ↳ ВАЖНО: Медицинский работник обязан незамедлительно покинуть закрытую территорию при первом требовании уполномоченного сотрудника охраняющей организации.
                  </p>
                </div>
              </div>
            </div>

            {/* Статья 5. Регламент допуска */}
            <div className="border border-tactical-border/60 bg-tactical-card/30 rounded-lg p-5 space-y-3">
              <h4 className="font-oswald text-base uppercase text-primary tracking-widest border-b border-tactical-border/40 pb-2 flex items-center gap-2 font-semibold">
                <Icon name="FileText" size={18} className="text-primary" />
                Статья 5. Регламент допуска государственных сотрудников
              </h4>
              <ul className="space-y-2 text-xs font-sans text-muted-foreground list-disc pl-4">
                <li>
                  <strong className="text-foreground">Основания:</strong> Порядок и условия получения допуска определяются настоящим ФЗ и актами Губернатора (5.1).
                </li>
                <li>
                  <strong className="text-foreground">Служебный доступ:</strong> При исполнении обязанностей госслужащие имеют право заходить на закрытые объекты по служебной необходимости (5.2).
                </li>
                <li className="text-yellow-400 font-semibold">
                  ⚠️ Обязанность отчета (5.3): Прошедший сотрудник по первому требованию ОБЯЗАН озвучить служебную необходимость своего нахождения на территории (если это не составляет государственную или служебную тайну).
                </li>
              </ul>
            </div>

            {/* Статья 12. Территория Управления Росгвардии */}
            <div className="border border-tactical-border/60 bg-tactical-card/30 rounded-lg p-5 space-y-3">
              <h4 className="font-oswald text-base uppercase text-primary tracking-widest border-b border-tactical-border/40 pb-2 flex items-center gap-2 font-semibold">
                <Icon name="Shield" size={18} className="text-primary" />
                Статья 12. Территория Управления Росгвардии (ФСВНГ)
              </h4>
              <div className="space-y-3 text-xs font-sans">
                <div className="p-3 bg-black/40 border border-tactical-border rounded">
                  <strong className="text-foreground block mb-1">🛑 Закрытая зона войсковой части (12.1)</strong>
                  Вся территория ВЧ, огражденная сплошным периметром забора (включая любые здания, крыши, внутренние сооружения и воздушное пространство), является закрытой для общего пользования и прохода гражданских лиц.
                </div>
                <div className="p-3 bg-black/40 border border-tactical-border rounded">
                  <strong className="text-foreground block mb-1">🛡️ Охраняемая прилегающая зона (12.2)</strong>
                  Вся прилегающая к внешнему периметру Управления ФСВНГ территория признается охраняемой зоной.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-tactical-border flex justify-end">
          <button
            onClick={onClose}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-oswald text-sm uppercase tracking-widest px-5 py-2 transition-colors corner-mark"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 11. MAP MEMO (Памятка: Карта Мира и Тен-Коды АВНГ)
// ═══════════════════════════════════════════════════════════════════════════════
export function MapMemo({ isOpen, onClose }: MemoProps) {
  if (!isOpen) return null;
  return createPortal(
    <div className="fixed inset-0 bg-background/85 backdrop-blur-sm z-50 overflow-y-auto flex items-start justify-center p-4 py-8 md:py-12">
      <div className="bg-tactical-card border-2 border-primary/50 max-w-5xl w-full corner-mark card-glow p-6 text-foreground relative animate-in fade-in zoom-in duration-200 min-h-[85vh] flex flex-col justify-between">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Icon name="X" size={20} />
        </button>
        
        <div>
          <h3 className="font-oswald text-xl uppercase tracking-wider text-foreground mb-4 pb-2 border-b border-tactical-border flex items-center gap-2">
            <Icon name="Map" className="text-primary" size={20} />
            Памятка: Карта Мира и Тен-Коды АВНГ
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Map Section */}
            <div className="lg:col-span-7 space-y-3">
              <h4 className="font-oswald text-base uppercase text-primary tracking-widest border-b border-tactical-border/40 pb-2 flex items-center gap-2 font-semibold">
                <Icon name="Compass" size={18} className="text-primary" />
                Карта Мира
              </h4>
              <p className="text-xs text-muted-foreground font-sans">
                Схема поставок и зон налётов на территории Арбата. Рекомендуется для изучения всем курсантам академии АВНГ.
              </p>
              <div className="border border-tactical-border p-2 bg-black/40 rounded overflow-hidden">
                <img 
                  src="/world_map.webp" 
                  alt="Карта поставок и налетов" 
                  className="w-full h-auto object-contain rounded border border-tactical-border/40"
                  loading="lazy"
                />
              </div>
            </div>

            {/* Codes Section */}
            <div className="lg:col-span-5 space-y-4">
              {/* Ten Codes */}
              <div className="border border-tactical-border/60 bg-tactical-card/30 rounded-lg p-4 space-y-3">
                <h4 className="font-oswald text-sm uppercase text-primary tracking-widest border-b border-tactical-border/40 pb-1.5 flex items-center gap-2 font-semibold">
                  <Icon name="Radio" size={16} className="text-primary" />
                  Тен-Коды в рации
                </h4>
                <div className="space-y-1.5 font-mono text-xs text-foreground/90">
                  <div className="flex justify-between border-b border-tactical-border/20 pb-1">
                    <span className="text-yellow-500 font-bold">10-0</span>
                    <span>Отбой</span>
                  </div>
                  <div className="flex justify-between border-b border-tactical-border/20 pb-1">
                    <span className="text-yellow-500 font-bold">10-4</span>
                    <span>Принято</span>
                  </div>
                  <div className="flex justify-between border-b border-tactical-border/20 pb-1">
                    <span className="text-yellow-500 font-bold">10-6</span>
                    <span>Занят, ожидайте</span>
                  </div>
                  <div className="flex justify-between border-b border-tactical-border/20 pb-1">
                    <span className="text-yellow-500 font-bold">10-10</span>
                    <span>Отрицание</span>
                  </div>
                  <div className="flex justify-between border-b border-tactical-border/20 pb-1">
                    <span className="text-yellow-500 font-bold">10-20</span>
                    <span>Моё местонахождение &lt;местоположение&gt;</span>
                  </div>
                  <div className="flex justify-between border-b border-tactical-border/20 pb-1">
                    <span className="text-yellow-500 font-bold">10-23</span>
                    <span>На месте *</span>
                  </div>
                  <div className="flex justify-between border-b border-tactical-border/20 pb-1">
                    <span className="text-yellow-500 font-bold">10-28</span>
                    <span>Какой ваш позывной?</span>
                  </div>
                  <div className="flex justify-between pb-1">
                    <span className="text-red-500 font-bold">10-34</span>
                    <span className="text-red-400">Нужно подкрепление</span>
                  </div>
                </div>
              </div>

              {/* Status Codes */}
              <div className="border border-tactical-border/60 bg-tactical-card/30 rounded-lg p-4 space-y-3">
                <h4 className="font-oswald text-sm uppercase text-primary tracking-widest border-b border-tactical-border/40 pb-1.5 flex items-center gap-2 font-semibold">
                  <Icon name="Activity" size={16} className="text-primary" />
                  Второстепенные коды
                </h4>
                <div className="space-y-2 font-mono text-xs">
                  <div className="p-2 bg-green-950/20 border-l-2 border-green-500 rounded flex justify-between items-center">
                    <span className="text-green-400 font-bold">Код - 1</span>
                    <span className="text-green-300">Все спокойно</span>
                  </div>
                  <div className="p-2 bg-yellow-950/20 border-l-2 border-yellow-500 rounded flex justify-between items-center">
                    <span className="text-yellow-400 font-bold">Код - 2</span>
                    <span className="text-yellow-300">Требуется внимание</span>
                  </div>
                  <div className="p-2 bg-red-950/20 border-l-2 border-red-500 rounded flex justify-between items-center">
                    <span className="text-red-400 font-bold">Код - 3</span>
                    <span className="text-red-300 font-bold">Проникновение / Требуется поддержка</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-tactical-border flex justify-end">
          <button
            onClick={onClose}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-oswald text-sm uppercase tracking-widest px-5 py-2 transition-colors corner-mark"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 12. OATH MEMO (Памятка присяги и строевые команды)
// ═══════════════════════════════════════════════════════════════════════════════
export function OathMemo({ isOpen, onClose }: MemoProps) {
  if (!isOpen) return null;
  return createPortal(
    <div className="fixed inset-0 bg-background/85 backdrop-blur-sm z-50 overflow-y-auto flex items-start justify-center p-4 py-8 md:py-12">
      <div className="bg-tactical-card border-2 border-primary/50 max-w-4xl w-full corner-mark card-glow p-6 text-foreground relative animate-in fade-in zoom-in duration-200 min-h-[85vh] flex flex-col justify-between">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Icon name="X" size={20} />
        </button>
        
        <div>
          <h3 className="font-oswald text-xl uppercase tracking-wider text-foreground mb-4 pb-2 border-b border-tactical-border flex items-center gap-2">
            <Icon name="BookOpen" className="text-primary" size={20} />
            Памятка присяги и строевые команды
          </h3>

          <div className="space-y-6 font-ibm text-sm text-foreground/90 leading-relaxed">
            {/* Военная Присяга */}
            <div className="border border-tactical-border/60 bg-tactical-card/30 rounded-lg p-5 space-y-3">
              <h4 className="font-oswald text-base uppercase text-primary tracking-widest border-b border-tactical-border/40 pb-2 flex items-center gap-2 font-semibold">
                <Icon name="Award" size={18} className="text-primary" />
                Военная присяга АВНГ
              </h4>
              <div className="bg-tactical-panel/40 border border-tactical-border/60 p-4 rounded text-foreground font-sans italic relative overflow-hidden">
                <div className="absolute right-2 bottom-2 w-16 h-16 opacity-5 pointer-events-none bg-contain bg-center bg-no-repeat" style={{ backgroundImage: 'url("/rosgvardia_emblem.png")' }} />
                <p className="indent-4 leading-relaxed font-semibold text-yellow-500 font-mono not-italic mb-2">
                  Текст ПРИСЯГИ для Курсанта Академии Войск Национальной Гвардии
                </p>
                <p className="indent-4 leading-relaxed">
                  «Я, <span className="text-yellow-500 font-mono font-semibold">[Фамилия, Имя, Отчество]</span>, поступая на службу в войска национальной гвардии, торжественно присягаю на верность Российской Федерации и ее народу!
                </p>
                <p className="indent-4 leading-relaxed mt-2">
                  Клянусь при осуществлении полномочий сотрудника войск национальной гвардии:
                </p>
                <p className="pl-6 leading-relaxed mt-1">
                  — уважать и защищать права и свободы человека и гражданина, свято соблюдать Конституцию Российской Федерации и федеральные законы;
                </p>
                <p className="pl-6 leading-relaxed mt-1">
                  — быть мужественным, честным и бдительным, не щадить своих сил в борьбе с преступностью;
                </p>
                <p className="pl-6 leading-relaxed mt-1">
                  — достойно исполнять свой служебный долг и возложенные на меня обязанности по обеспечению безопасности, законности и правопорядка, хранить государственную и служебную тайну.
                </p>
                <p className="indent-4 leading-relaxed mt-3 font-semibold uppercase text-red-500 font-mono tracking-wider">
                  Служу России, служу Закону!»
                </p>
              </div>
            </div>

            {/* Строевые Команды */}
            <div className="border border-tactical-border/60 bg-tactical-card/30 rounded-lg p-5 space-y-4">
              <h4 className="font-oswald text-base uppercase text-primary tracking-widest border-b border-tactical-border/40 pb-2 flex items-center gap-2 font-semibold">
                <Icon name="Shield" size={18} className="text-primary" />
                Основные строевые команды
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <span className="font-mono text-xs text-yellow-500 font-bold block">«РАВНЯЙСЯ!»</span>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      Все военнослужащие быстро поворачивают голову направо. Правофланговый держит голову прямо.
                    </p>
                  </div>
                  <div>
                    <span className="font-mono text-xs text-yellow-500 font-bold block">«СМИРНО!»</span>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      Быстро принять строевую стойку: стоять прямо, пятки вместе, носки развернуты по ширине ступни, руки опущены.
                    </p>
                  </div>
                  <div>
                    <span className="font-mono text-xs text-yellow-500 font-bold block">«ВОЛЬНО!»</span>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      Стать свободно, ослабить в колене правую или левую ногу, но не сходить с места и не разговаривать.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <span className="font-mono text-xs text-yellow-500 font-bold block">«ЗАПРАВИТЬСЯ!»</span>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      Не оставляя своего места в строю, поправить оружие, обмундирование и снаряжение. При необходимости выйти — спросить разрешения.
                    </p>
                  </div>
                  <div>
                    <span className="font-mono text-xs text-yellow-500 font-bold block">«РАЗОЙДИСЬ!»</span>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      Военнослужащие выходят из строя. Для сбора подается команда «В одну шеренгу — СТАНОВИСЬ!».
                    </p>
                  </div>
                  <div>
                    <span className="font-mono text-xs text-yellow-500 font-bold block">«ШАГОМ — МАРШ!»</span>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      Движение начинается с левой ноги. Подается для начала марша подразделения.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Повороты на месте */}
            <div className="border border-tactical-border/60 bg-tactical-card/30 rounded-lg p-5 space-y-3">
              <h4 className="font-oswald text-base uppercase text-primary tracking-widest border-b border-tactical-border/40 pb-2 flex items-center gap-2 font-semibold">
                <Icon name="Activity" size={18} className="text-primary" />
                Повороты на месте и движение
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
                <div className="p-2.5 bg-black/40 border border-tactical-border/30 rounded">
                  <span className="text-primary block font-bold mb-1">«НАПРА-ВО!»</span>
                  Поворот выполняется на каблуке правой ноги и на носке левой ноги в правую сторону на 90 градусов.
                </div>
                <div className="p-2.5 bg-black/40 border border-tactical-border/30 rounded">
                  <span className="text-primary block font-bold mb-1">«НАЛЕ-ВО!»</span>
                  Поворот выполняется на каблуке левой ноги и на носке правой ноги в левую сторону на 90 градусов.
                </div>
                <div className="p-2.5 bg-black/40 border border-tactical-border/30 rounded">
                  <span className="text-primary block font-bold mb-1">«КРУ-ГОМ!»</span>
                  Поворот выполняется через левое плечо на каблуке левой ноги и носке правой ноги на 180 градусов.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-tactical-border flex justify-end">
          <button
            onClick={onClose}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-oswald text-sm uppercase tracking-widest px-5 py-2 transition-colors corner-mark"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
