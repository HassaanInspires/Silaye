'use client';

import * as React from 'react';
import { Check, Sliders, Smartphone, Menu, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  getNavLayoutPreference,
  setNavLayoutPreference,
  type NavLayoutPreference,
  NAV_LAYOUT_CHANGED_EVENT,
} from '@/lib/nav-preferences';
import { useLanguage } from '@/lib/language-provider';

export interface NavigationLayoutCardProps {
  value?: NavLayoutPreference;
  onChange?: (value: NavLayoutPreference) => void;
  className?: string;
  compact?: boolean;
}

interface NavOptionDefinition {
  id: NavLayoutPreference;
  titleEn: string;
  titleUr: string;
  badgeEn: string;
  badgeUr: string;
  badgeVariant: 'gold' | 'cyan' | 'amber';
  descEn: string;
  descUr: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_OPTIONS: ReadonlyArray<NavOptionDefinition> = [
  {
    id: 'tabs',
    titleEn: 'Modern Tabs + Action Button',
    titleUr: 'ماڈرن باٹم ٹیبز',
    badgeEn: 'Recommended',
    badgeUr: 'تجویز کردہ',
    badgeVariant: 'gold',
    descEn: '4 Bottom tabs + Center gold FAB for 1-thumb use. Clean minimal top header without menu clutter.',
    descUr: '4 باٹم ٹیبز اور درمیان میں گولڈ نیا سوٹ بٹن — ایک ہاتھ اور انگوٹھے سے تیز رفتار استعمال کے لیے۔',
    icon: Smartphone,
  },
  {
    id: 'drawer',
    titleEn: 'Classic Drawer Only',
    titleUr: 'کلاسک ڈراور',
    badgeEn: 'Max Screen Space',
    badgeUr: 'بڑی سکرین',
    badgeVariant: 'cyan',
    descEn: 'Fullscreen view with top hamburger menu. Hides the bottom bar to maximize vertical space.',
    descUr: 'مکمل فل سکرین ویو اور اوپر ہیمبرگر مینو — باٹم بار چھپا کر ڈیٹا کے لیے زیادہ جگہ فراہم کرتا ہے۔',
    icon: Menu,
  },
  {
    id: 'hybrid',
    titleEn: 'Hybrid Master',
    titleUr: 'ہائبرڈ ماسٹر',
    badgeEn: 'Power User',
    badgeUr: 'ہمہ گیر',
    badgeVariant: 'amber',
    descEn: 'Bottom tabs + Top hamburger drawer. Access quick counter shortcuts and full slide-out sidebar simultaneously.',
    descUr: 'باٹم ٹیبز اور اوپر ہیمبرگر ڈراور دونوں بیک وقت فعال — فوری بکنگ اور مکمل مینو دونوں دستیاب۔',
    icon: Layers,
  },
];

export function NavigationLayoutCard({
  value,
  onChange,
  className,
  compact = false,
}: NavigationLayoutCardProps) {
  const { language } = useLanguage();
  const [internalLayout, setInternalLayout] = React.useState<NavLayoutPreference>(() =>
    value !== undefined ? value : getNavLayoutPreference()
  );

  React.useEffect(() => {
    if (value !== undefined) {
      setInternalLayout(value);
      return;
    }

    if (typeof window !== 'undefined') {
      setInternalLayout(getNavLayoutPreference());
      const handleLayoutChange = () => {
        setInternalLayout(getNavLayoutPreference());
      };
      window.addEventListener(NAV_LAYOUT_CHANGED_EVENT, handleLayoutChange);
      return () => {
        window.removeEventListener(NAV_LAYOUT_CHANGED_EVENT, handleLayoutChange);
      };
    }
  }, [value]);

  const activeLayout = value !== undefined ? value : internalLayout;

  const handleSelect = (layoutId: NavLayoutPreference) => {
    if (onChange) {
      onChange(layoutId);
    } else {
      setInternalLayout(layoutId);
      setNavLayoutPreference(layoutId);
    }
  };

  return (
    <Card className={cn('border-border bg-card shadow-sm', className)}>
      <CardHeader className={cn(compact ? 'p-4 pb-2' : 'p-6 pb-3')}>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm sm:text-base text-foreground flex items-center gap-2 font-semibold">
            <Sliders className="h-4 w-4 text-primary shrink-0" />
            {language === 'ur' ? (
              <div className="flex items-center gap-1.5">
                <span className="font-urdu-sans text-base text-foreground font-bold" dir="rtl">
                  نیویگیشن اسٹائل
                </span>
                <bdi dir="ltr" className="text-xs text-muted-foreground font-sans">
                  (Navigation Layout)
                </bdi>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="font-sans">Navigation Layout</span>
                <span className="font-urdu-sans text-xs text-primary/90 -mt-0.5" dir="rtl">
                  نیویگیشن اسٹائل
                </span>
              </div>
            )}
          </CardTitle>

          <Badge
            variant="outline"
            className="text-[10px] font-mono border-primary/30 bg-primary/10 text-primary py-0.5 px-2 shrink-0"
          >
            {activeLayout === 'tabs' ? 'Tabs Mode' : activeLayout === 'drawer' ? 'Drawer Mode' : 'Hybrid Mode'}
          </Badge>
        </div>

        <CardDescription className="text-xs text-muted-foreground mt-1">
          {language === 'ur'
            ? 'موبائل پر نیویگیشن کا طریقہ کار منتخب کریں۔ تبدیلی فوری طور پر لاگو ہوگی۔'
            : 'Choose your preferred mobile navigation interface. Changes take effect immediately.'}
        </CardDescription>
      </CardHeader>

      <CardContent className={cn('space-y-3', compact ? 'p-4 pt-2' : 'p-6 pt-2')}>
        <div role="radiogroup" aria-label="Mobile Navigation Layout Style" className="space-y-3">
          {NAV_OPTIONS.map((option) => {
            const isSelected = activeLayout === option.id;
            const Icon = option.icon;

            return (
              <div
                key={option.id}
                onClick={() => handleSelect(option.id)}
                role="radio"
                aria-checked={isSelected}
                tabIndex={0}
                data-testid={`nav-layout-option-${option.id}`}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    handleSelect(option.id);
                  }
                }}
                className={cn(
                  'p-3.5 sm:p-4 rounded-xl border cursor-pointer transition-all duration-200 flex items-start justify-between gap-3 select-none active:scale-[0.99]',
                  isSelected
                    ? 'border-primary/60 bg-primary/10 shadow-[0_0_15px_rgba(197,154,63,0.15)] ring-1 ring-primary/40'
                    : 'border-border/60 bg-card hover:border-border hover:bg-accent/40'
                )}
              >
                <div className="flex items-start gap-3 w-full">
                  {/* Radio Indicator */}
                  <div
                    className={cn(
                      'h-5 w-5 rounded-full border flex items-center justify-center mt-0.5 shrink-0 transition-colors',
                      isSelected
                        ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                        : 'border-muted-foreground/40 bg-muted/20'
                    )}
                  >
                    {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                  </div>

                  <div className="space-y-1 w-full min-w-0">
                    <div className="flex items-center gap-2 flex-wrap justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Icon className={cn('h-4 w-4 shrink-0', isSelected ? 'text-primary' : 'text-muted-foreground')} />
                        {language === 'ur' ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-urdu-sans text-sm font-bold text-foreground" dir="rtl">
                              {option.titleUr}
                            </span>
                            <bdi dir="ltr" className="text-xs text-muted-foreground font-sans">
                              ({option.titleEn})
                            </bdi>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs sm:text-sm font-semibold text-foreground font-sans">
                              {option.titleEn}
                            </span>
                            <span className="font-urdu-sans text-xs text-primary leading-relaxed" dir="rtl">
                              {option.titleUr}
                            </span>
                          </div>
                        )}
                      </div>

                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[9px] sm:text-[10px] py-0 px-1.5 shrink-0 font-medium',
                          option.badgeVariant === 'gold' && 'text-primary border-primary/30 bg-primary/10',
                          option.badgeVariant === 'cyan' && 'text-cyan-600 dark:text-cyan-300 border-cyan-500/30 bg-cyan-500/10',
                          option.badgeVariant === 'amber' && 'text-amber-600 dark:text-amber-300 border-amber-500/30 bg-amber-500/10'
                        )}
                      >
                        {language === 'ur' ? option.badgeUr : option.badgeEn}
                      </Badge>
                    </div>

                    {language === 'ur' ? (
                      <div className="space-y-1 pt-0.5">
                        <p className="font-urdu-sans text-xs text-foreground/90 leading-relaxed" dir="rtl">
                          {option.descUr}
                        </p>
                        <bdi dir="ltr" className="block text-[11px] text-muted-foreground leading-normal text-left font-sans">
                          {option.descEn}
                        </bdi>
                      </div>
                    ) : (
                      <div className="space-y-1 pt-0.5">
                        <p className="text-xs text-foreground/90 leading-relaxed font-sans">
                          {option.descEn}
                        </p>
                        <p className="font-urdu-sans text-[11px] text-muted-foreground leading-relaxed" dir="rtl">
                          {option.descUr}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default NavigationLayoutCard;
