-- Migration: Add initial promotion settings for SOBR
INSERT INTO t_p29017774_avn_academy_training.instructor_promotion_settings (unit, points_config, ranks_flow)
VALUES (
    'СОБР',
    $$[
      {
        "num": 1,
        "name": "Участие в ГМП",
        "desc": "3+ фракции, похитки, теракты",
        "points": 100
      },
      {
        "num": 2,
        "name": "Участие в поставке",
        "points": 35
      },
      {
        "num": 3,
        "name": "Отбитие налёта/ограбления",
        "points": 20,
        "bonusPoints": 15,
        "bonusLabel": "Успешное отбитие (+15 баллов)",
        "hasSubPoints": true
      },
      {
        "num": 4,
        "name": "Отбитие КРАЗА",
        "desc": "доставка на титул",
        "points": 20,
        "bonusPoints": 15,
        "bonusLabel": "Успешная доставка (+15 баллов)",
        "hasSubPoints": true
      },
      {
        "num": 5,
        "name": "Тренировка на арене / Участие в трене",
        "points": 15
      },
      {
        "num": 7,
        "name": "Мобильный патруль МСК и МО 60 мин",
        "desc": "от 2 чел",
        "points": 30
      },
      {
        "num": 8,
        "name": "Штраф",
        "desc": "фото оплаты",
        "points": 15
      },
      {
        "num": 9,
        "name": "Арест человека",
        "desc": "фото посадки",
        "points": 20
      },
      {
        "num": 10,
        "name": "Групповой моб. патруль МСК и МО",
        "desc": "от 3 чел/час",
        "points": 30
      },
      {
        "num": 11,
        "name": "Пост ФСВНГ КПП/Вышки",
        "desc": "1 час",
        "points": 30
      },
      {
        "num": 12,
        "name": "Охрана собеседования, призыва",
        "desc": "начало/конец",
        "points": 20
      },
      {
        "num": 13,
        "name": "Присутствие на вечерней поверке",
        "points": 10
      },
      {
        "num": 14,
        "name": "Вербовка",
        "points": 25
      },
      {
        "num": 15,
        "name": "Проведение экзамена",
        "points": 15
      },
      {
        "num": 16,
        "name": "Проверка рапорта на повышения",
        "points": 10
      },
      {
        "num": 17,
        "name": "Проведение практики (задержание/стрельба)",
        "points": 10
      }
    ]$$::jsonb,
    $$[
      {
        "from": "Сержант",
        "to": "Старший Сержант",
        "points": 450,
        "mandatory": [
          { "num": 2, "name": "Участие в поставке", "count": 5 },
          { "num": 3, "name": "Отбитие налёта/ограбления", "count": 2 },
          { "num": 17, "name": "Практика задержания и ареста", "count": 1 }
        ]
      },
      {
        "from": "Старший Сержант",
        "to": "Старшина",
        "points": 600,
        "mandatory": [
          { "num": 2, "name": "Участие в поставке", "count": 7 },
          { "num": 3, "name": "Отбитие налёта/ограбления", "count": 3 },
          { "num": 12, "name": "Охрана собеседования, призыва", "count": 1 }
        ]
      },
      {
        "from": "Старшина",
        "to": "Прапорщик",
        "points": 700,
        "mandatory": [
          { "num": 2, "name": "Участие в поставке", "count": 9 },
          { "num": 3, "name": "Отбитие налёта/ограбления", "count": 3 },
          { "num": 8, "name": "Штраф", "count": 3 },
          { "num": 12, "name": "Охрана собеседования, призыва", "count": 1 }
        ]
      },
      {
        "from": "Прапорщик",
        "to": "Старший Прапорщик",
        "points": 850,
        "mandatory": [
          { "num": 2, "name": "Участие в поставке", "count": 10 },
          { "num": 3, "name": "Отбитие налёта/ограбления", "count": 5 },
          { "num": 9, "name": "Арест человека", "count": 3 },
          { "num": 12, "name": "Охрана собеседования, призыва", "count": 1 }
        ]
      },
      {
        "from": "Старший Прапорщик",
        "to": "Младший Лейтенант",
        "points": 1000,
        "mandatory": [
          { "num": 2, "name": "Участие в поставке", "count": 12 },
          { "num": 3, "name": "Отбитие налёта/ограбления", "count": 5 },
          { "num": 9, "name": "Арест человека", "count": 3 },
          { "num": 1, "name": "Участие в ГМП", "count": 1 }
        ]
      },
      {
        "from": "Младший Лейтенант",
        "to": "Лейтенант",
        "points": 1200,
        "mandatory": [
          { "num": 2, "name": "Участие в поставке", "count": 13 },
          { "num": 3, "name": "Отбитие налёта/ограбления", "count": 7 },
          { "num": 9, "name": "Арест человека", "count": 7 },
          { "num": 1, "name": "Участие в ГМП", "count": 1 }
        ]
      },
      {
        "from": "Лейтенант",
        "to": "Старший Лейтенант",
        "points": 1400,
        "mandatory": [
          { "num": 2, "name": "Участие в поставке", "count": 15 },
          { "num": 3, "name": "Отбитие налёта/ограбления", "count": 7 },
          { "num": 9, "name": "Арест человека", "count": 7 },
          { "num": 8, "name": "Штраф", "count": 3 },
          { "num": 1, "name": "Участие в ГМП", "count": 1 }
        ]
      },
      {
        "from": "Старший Лейтенант",
        "to": "Капитан",
        "points": 1600,
        "mandatory": [
          { "num": 2, "name": "Участие в поставке", "count": 20 },
          { "num": 3, "name": "Отбитие налёта/ограбления", "count": 10 },
          { "num": 9, "name": "Арест человека", "count": 10 },
          { "num": 8, "name": "Штраф", "count": 3 },
          { "num": 1, "name": "Участие в ГМП", "count": 1 }
        ]
      }
    ]$$::jsonb
)
ON CONFLICT (unit) 
DO UPDATE SET 
    points_config = EXCLUDED.points_config,
    ranks_flow = EXCLUDED.ranks_flow;
