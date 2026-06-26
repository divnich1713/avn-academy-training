import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";

interface ThemeSettings {
  themePreset: "red" | "green" | "blue" | "amber" | "slate" | "custom";
  fontFamily: "ibm" | "inter" | "roboto" | "mono" | "system";
  fontSize: "sm" | "base" | "md" | "lg" | "xl";
  lineHeight: "normal" | "relaxed" | "loose";
  backgroundContrast: number; // 0.5 to 1.0 (overlay opacity)
  scanlinesOpacity: number; // 0 to 0.05
  watermarkOpacity: number; // 0 to 0.15
  highContrast: boolean;
  
  // Custom colors (only used if themePreset === 'custom')
  customPrimary: string;
  customBackground: string;
  customCard: string;
  customBorder: string;
  customForeground: string;
}

const DEFAULT_SETTINGS: ThemeSettings = {
  themePreset: "red",
  fontFamily: "ibm",
  fontSize: "base",
  lineHeight: "normal",
  backgroundContrast: 0.85,
  scanlinesOpacity: 0.015,
  watermarkOpacity: 0.05,
  highContrast: false,
  customPrimary: "#8c1c28",
  customBackground: "#0b0505",
  customCard: "#120707",
  customBorder: "#2a1012",
  customForeground: "#e5d5d5",
};

// HSL values for presets (space separated: H S% L%)
const COLOR_PRESETS = {
  red: {
    primary: "355 65% 38%", // #8c1c28
    background: "0 18% 6%", // #0b0505
    card: "0 16% 9%",      // #120707
    border: "0 14% 18%",   // #2a1012
    foreground: "15 15% 90%", // #e5d5d5
    scanlineRgb: "140, 30, 40",
  },
  green: {
    primary: "90 45% 32%", // #50782d
    background: "120 10% 6%", // #080a08
    card: "120 10% 9%",      // #0f120f
    border: "120 8% 18%",    // #242c24
    foreground: "120 10% 90%", // #e2ede2
    scanlineRgb: "80, 120, 45",
  },
  blue: {
    primary: "210 85% 45%", // #1a6fd3
    background: "220 30% 6%", // #06090e
    card: "220 25% 9%",      // #0d121b
    border: "220 20% 18%",    // #222d3d
    foreground: "210 20% 92%", // #eaf1f8
    scanlineRgb: "26, 111, 211",
  },
  amber: {
    primary: "42 75% 48%", // #cc961e
    background: "35 15% 6%", // #0b0907
    card: "35 12% 9%",      // #120f0c
    border: "35 10% 18%",    // #2b231c
    foreground: "42 10% 90%", // #ebe8e2
    scanlineRgb: "204, 150, 30",
  },
  slate: {
    primary: "0 0% 50%",   // #808080
    background: "0 0% 8%",  // #141414
    card: "0 0% 12%",       // #1f1f1f
    border: "0 0% 20%",      // #333333
    foreground: "0 0% 92%", // #ebebeb
    scanlineRgb: "128, 128, 128",
  },
};

// Hex to HSL space-separated helper
function hexToHslString(hex: string): string {
  hex = hex.replace(/^#/, "");
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

// Helper to convert Hex to RGB array string
function hexToRgbString(hex: string): string {
  hex = hex.replace(/^#/, "");
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

export function ThemeCustomizer() {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<ThemeSettings>(() => {
    const saved = localStorage.getItem("avn-custom-theme-settings");
    if (saved) {
      try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      } catch (e) {
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  });

  // Apply settings to document element
  useEffect(() => {
    const root = document.documentElement;
    
    // 1. High contrast overrides
    if (settings.highContrast) {
      root.style.setProperty("--background", "0 0% 0%");
      root.style.setProperty("--foreground", "0 0% 100%");
      root.style.setProperty("--card", "0 0% 5%");
      root.style.setProperty("--card-foreground", "0 0% 100%");
      root.style.setProperty("--primary", "0 0% 90%");
      root.style.setProperty("--primary-foreground", "0 0% 0%");
      root.style.setProperty("--border", "0 0% 40%");
      root.style.setProperty("--ring", "0 0% 90%");
      root.style.setProperty("--sidebar-background", "0 0% 0%");
      root.style.setProperty("--sidebar-border", "0 0% 40%");
      root.style.setProperty("--bg-overlay-opacity", "1.0");
      root.style.setProperty("--scanline-opacity", "0");
      root.style.setProperty("--watermark-opacity", "0");
      root.style.setProperty("--font-ibm", "system-ui, sans-serif");
      root.style.setProperty("--line-height-body", "1.7");
      root.style.setProperty("--font-weight-body", "500");
      return;
    }

    // 2. Apply theme colors (presets or custom)
    let colors = COLOR_PRESETS.red;
    if (settings.themePreset === "custom") {
      colors = {
        primary: hexToHslString(settings.customPrimary),
        background: hexToHslString(settings.customBackground),
        card: hexToHslString(settings.customCard),
        border: hexToHslString(settings.customBorder),
        foreground: hexToHslString(settings.customForeground),
        scanlineRgb: hexToRgbString(settings.customPrimary),
      };
    } else {
      colors = COLOR_PRESETS[settings.themePreset];
    }

    root.style.setProperty("--primary", colors.primary);
    root.style.setProperty("--primary-foreground", "0 0% 100%");
    root.style.setProperty("--background", colors.background);
    root.style.setProperty("--foreground", colors.foreground);
    root.style.setProperty("--card", colors.card);
    root.style.setProperty("--card-foreground", colors.foreground);
    root.style.setProperty("--popover", colors.card);
    root.style.setProperty("--popover-foreground", colors.foreground);
    root.style.setProperty("--border", colors.border);
    root.style.setProperty("--input", colors.card);
    root.style.setProperty("--ring", colors.primary);
    
    // Sidebar colors mapping
    root.style.setProperty("--sidebar-background", colors.background);
    root.style.setProperty("--sidebar-foreground", colors.foreground);
    root.style.setProperty("--sidebar-primary", colors.primary);
    root.style.setProperty("--sidebar-primary-foreground", "0 0% 100%");
    root.style.setProperty("--sidebar-border", colors.border);
    root.style.setProperty("--sidebar-ring", colors.primary);

    // 3. Scanline & Watermark settings
    root.style.setProperty("--scanline-opacity", settings.scanlinesOpacity.toString());
    root.style.setProperty("--scanline-color-rgb", colors.scanlineRgb);
    root.style.setProperty("--bg-overlay-opacity", settings.backgroundContrast.toString());
    root.style.setProperty("--watermark-opacity", settings.watermarkOpacity.toString());

    // 4. Fonts
    let fontName = '"IBM Plex Sans", sans-serif';
    switch (settings.fontFamily) {
      case "inter": fontName = '"Inter", sans-serif'; break;
      case "roboto": fontName = '"Roboto", sans-serif'; break;
      case "mono": fontName = '"IBM Plex Mono", monospace'; break;
      case "system": fontName = 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif'; break;
    }
    root.style.setProperty("--font-ibm", fontName);

    // Headings font
    let headingFontName = '"Oswald", sans-serif';
    if (settings.fontFamily === "inter" || settings.fontFamily === "system") {
      headingFontName = '"Inter", sans-serif';
    } else if (settings.fontFamily === "roboto") {
      headingFontName = '"Roboto", sans-serif';
    }
    root.style.setProperty("--font-oswald", headingFontName);

    // 5. Font size scaling
    let rootSize = "16px";
    switch (settings.fontSize) {
      case "sm": rootSize = "14px"; break;
      case "base": rootSize = "15px"; break;
      case "md": rootSize = "16.5px"; break;
      case "lg": rootSize = "18px"; break;
      case "xl": rootSize = "20px"; break;
    }
    root.style.fontSize = rootSize;

    // 6. Line height
    let lhValue = "1.5";
    switch (settings.lineHeight) {
      case "relaxed": lhValue = "1.65"; break;
      case "loose": lhValue = "1.85"; break;
    }
    root.style.setProperty("--line-height-body", lhValue);
    
    // Save to local storage
    localStorage.setItem("avn-custom-theme-settings", JSON.stringify(settings));
  }, [settings]);

  const updateSetting = <K extends keyof ThemeSettings>(key: K, value: ThemeSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  return (
    <>
      {/* Settings toggle button styled to match HUD */}
      <button
        onClick={() => setIsOpen(true)}
        title="Настройки интерфейса"
        className="text-muted-foreground hover:text-primary transition-all p-1.5 border border-tactical-border/40 hover:border-primary/50 bg-tactical-panel/40 rounded-sm flex items-center justify-center"
      >
        <Icon name="Palette" size={17} className="animate-pulse" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-xl bg-tactical-panel border-2 border-primary/70 shadow-[0_0_30px_rgba(140,30,40,0.3)] corner-mark max-h-[90vh] flex flex-col animate-scale-in">
            {/* Corner tech lines */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary" />
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary" />

            {/* Modal Header */}
            <div className="p-4 border-b border-tactical-border/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon name="Sliders" size={18} className="text-primary" />
                <h3 className="font-oswald text-md font-bold uppercase tracking-wider text-foreground">
                  Настройки отображения
                </h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground hover:text-primary transition-colors p-1"
              >
                <Icon name="X" size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-left font-ibm text-xs">
              {/* High Contrast Option */}
              <div className="flex items-center justify-between border border-primary/20 bg-primary/5 p-3 rounded-sm">
                <div>
                  <h4 className="font-bold text-foreground mb-0.5">Режим высокой контрастности</h4>
                  <p className="text-[10px] text-muted-foreground leading-normal">
                    Максимально простой чёрно-белый вид без фоновых изображений и сеток для лучшей читаемости.
                  </p>
                </div>
                <button
                  onClick={() => updateSetting("highContrast", !settings.highContrast)}
                  className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors duration-200 ${
                    settings.highContrast ? "bg-primary justify-end" : "bg-tactical-border justify-start"
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-foreground shadow-md" />
                </button>
              </div>

              {!settings.highContrast && (
                <>
                  {/* Theme Presets */}
                  <div className="space-y-2">
                    <label className="font-bold text-foreground block uppercase tracking-wider text-[10px]">
                      Цветовая гамма (Тема)
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {(["red", "green", "blue", "amber", "slate", "custom"] as const).map((preset) => {
                        const labels = {
                          red: "Красная",
                          green: "Зеленая",
                          blue: "Синяя",
                          amber: "Золотая",
                          slate: "Серая",
                          custom: "Своя",
                        };
                        const active = settings.themePreset === preset;
                        return (
                          <button
                            key={preset}
                            onClick={() => updateSetting("themePreset", preset)}
                            className={`p-2 border text-center transition-all font-oswald uppercase tracking-wider text-[10px] ${
                              active
                                ? "bg-primary border-primary text-foreground font-bold shadow-[0_0_8px_rgba(140,30,40,0.3)]"
                                : "bg-tactical-card/50 border-tactical-border hover:border-primary/50 text-muted-foreground"
                            }`}
                          >
                            {labels[preset]}
                          </button>
                        );
                      })}
                    </div>

                    {/* Custom Color Pickers */}
                    {settings.themePreset === "custom" && (
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-3 border border-tactical-border bg-tactical-card/30 mt-2 animate-fade-in">
                        <div className="space-y-1">
                          <label className="text-[9px] text-muted-foreground block">Акцент</label>
                          <div className="flex items-center gap-1">
                            <input
                              type="color"
                              value={settings.customPrimary}
                              onChange={(e) => updateSetting("customPrimary", e.target.value)}
                              className="w-5 h-5 bg-transparent border-0 cursor-pointer"
                            />
                            <span className="font-mono text-[9px]">{settings.customPrimary}</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] text-muted-foreground block">Фон</label>
                          <div className="flex items-center gap-1">
                            <input
                              type="color"
                              value={settings.customBackground}
                              onChange={(e) => updateSetting("customBackground", e.target.value)}
                              className="w-5 h-5 bg-transparent border-0 cursor-pointer"
                            />
                            <span className="font-mono text-[9px]">{settings.customBackground}</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] text-muted-foreground block">Карточки</label>
                          <div className="flex items-center gap-1">
                            <input
                              type="color"
                              value={settings.customCard}
                              onChange={(e) => updateSetting("customCard", e.target.value)}
                              className="w-5 h-5 bg-transparent border-0 cursor-pointer"
                            />
                            <span className="font-mono text-[9px]">{settings.customCard}</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] text-muted-foreground block">Границы</label>
                          <div className="flex items-center gap-1">
                            <input
                              type="color"
                              value={settings.customBorder}
                              onChange={(e) => updateSetting("customBorder", e.target.value)}
                              className="w-5 h-5 bg-transparent border-0 cursor-pointer"
                            />
                            <span className="font-mono text-[9px]">{settings.customBorder}</span>
                          </div>
                        </div>
                        <div className="space-y-1 col-span-2 sm:col-span-1">
                          <label className="text-[9px] text-muted-foreground block">Текст</label>
                          <div className="flex items-center gap-1">
                            <input
                              type="color"
                              value={settings.customForeground}
                              onChange={(e) => updateSetting("customForeground", e.target.value)}
                              className="w-5 h-5 bg-transparent border-0 cursor-pointer"
                            />
                            <span className="font-mono text-[9px]">{settings.customForeground}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Font Family Selection */}
              <div className="space-y-2">
                <label className="font-bold text-foreground block uppercase tracking-wider text-[10px]">
                  Шрифт текста
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {(["ibm", "inter", "roboto", "mono", "system"] as const).map((font) => {
                    const fontNames = {
                      ibm: "IBM Plex",
                      inter: "Inter",
                      roboto: "Roboto",
                      mono: "Plex Mono",
                      system: "Системный",
                    };
                    const fontStyles = {
                      ibm: { fontFamily: "IBM Plex Sans" },
                      inter: { fontFamily: "Inter" },
                      roboto: { fontFamily: "Roboto" },
                      mono: { fontFamily: "IBM Plex Mono" },
                      system: { fontFamily: "system-ui" },
                    };
                    return (
                      <button
                        key={font}
                        onClick={() => updateSetting("fontFamily", font)}
                        style={fontStyles[font]}
                        className={`p-2 border text-center transition-all text-xs truncate ${
                          settings.fontFamily === font
                            ? "bg-primary border-primary text-foreground font-bold"
                            : "bg-tactical-card/50 border-tactical-border hover:border-primary/50 text-muted-foreground"
                        }`}
                      >
                        {fontNames[font]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Text Size and Line Spacing */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="font-bold text-foreground block uppercase tracking-wider text-[10px]">
                    Размер шрифта
                  </label>
                  <div className="flex items-center gap-1 border border-tactical-border bg-tactical-card/30 p-1 rounded-sm justify-between">
                    {(["sm", "base", "md", "lg", "xl"] as const).map((size) => {
                      const labels = {
                        sm: "Аа-",
                        base: "Аа",
                        md: "Аа+",
                        lg: "Аа++",
                        xl: "Аа+++",
                      };
                      return (
                        <button
                          key={size}
                          onClick={() => updateSetting("fontSize", size)}
                          className={`flex-1 py-1 px-1.5 text-center font-bold text-[10px] transition-colors rounded-sm ${
                            settings.fontSize === size
                              ? "bg-primary text-foreground"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {labels[size]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="font-bold text-foreground block uppercase tracking-wider text-[10px]">
                    Межстрочный интервал
                  </label>
                  <div className="flex items-center gap-1 border border-tactical-border bg-tactical-card/30 p-1 rounded-sm justify-between">
                    {(["normal", "relaxed", "loose"] as const).map((lh) => {
                      const labels = {
                        normal: "Стандарт",
                        relaxed: "Ср. разряженный",
                        loose: "Широкий",
                      };
                      return (
                        <button
                          key={lh}
                          onClick={() => updateSetting("lineHeight", lh)}
                          className={`flex-1 py-1 px-1 text-center text-[10px] transition-colors rounded-sm ${
                            settings.lineHeight === lh
                              ? "bg-primary text-foreground font-bold"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {labels[lh]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {!settings.highContrast && (
                <>
                  {/* Background Camouflage & Noise Sliders */}
                  <div className="space-y-3.5 border-t border-tactical-border/60 pt-4">
                    <h4 className="font-bold text-foreground uppercase tracking-wider text-[10px]">
                      Настройки видимости фона
                    </h4>
                    
                    {/* Background camouflage opacity slider */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-muted-foreground">Затемнение фона (Скрыть камуфляж)</span>
                        <span className="font-mono text-primary font-bold">
                          {Math.round(settings.backgroundContrast * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="1.0"
                        step="0.05"
                        value={settings.backgroundContrast}
                        onChange={(e) => updateSetting("backgroundContrast", parseFloat(e.target.value))}
                        className="w-full h-1 bg-tactical-border rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                      <p className="text-[9px] text-muted-foreground leading-none">
                        100% — сплошной темный цвет без камуфляжа (лучшая читаемость).
                      </p>
                    </div>

                    {/* Scanlines / Grid lines slider */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-muted-foreground">Интенсивность тактической сетки (шум)</span>
                        <span className="font-mono text-primary font-bold">
                          {Math.round(settings.scanlinesOpacity * 2000)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="0.04"
                        step="0.005"
                        value={settings.scanlinesOpacity}
                        onChange={(e) => updateSetting("scanlinesOpacity", parseFloat(e.target.value))}
                        className="w-full h-1 bg-tactical-border rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                      <p className="text-[9px] text-muted-foreground leading-none">
                        0% — отключает сетку и полосы шума на фоне.
                      </p>
                    </div>

                    {/* Watermark opacity */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-muted-foreground">Яркость герба Росгвардии на заднем плане</span>
                        <span className="font-mono text-primary font-bold">
                          {Math.round(settings.watermarkOpacity * 1000)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="0.15"
                        step="0.01"
                        value={settings.watermarkOpacity}
                        onChange={(e) => updateSetting("watermarkOpacity", parseFloat(e.target.value))}
                        className="w-full h-1 bg-tactical-border rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-tactical-border/60 flex items-center justify-between bg-tactical-card/45">
              <button
                onClick={handleReset}
                className="px-3 py-1.5 border border-tactical-border text-muted-foreground hover:text-foreground hover:border-muted transition-colors rounded-sm flex items-center gap-1.5 font-oswald uppercase tracking-wider text-[10px]"
              >
                <Icon name="RefreshCw" size={11} />
                Сбросить
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-1.5 bg-primary border border-primary/50 text-foreground font-bold hover:bg-primary/95 transition-all shadow-[0_0_10px_rgba(140,30,40,0.25)] rounded-sm font-oswald uppercase tracking-wider text-[10px]"
              >
                Готово
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
