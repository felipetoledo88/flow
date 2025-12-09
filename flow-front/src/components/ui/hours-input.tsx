import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  decimalToHoursAndMinutes,
  hoursAndMinutesToDecimal,
  getMinuteOptions,
} from '@/lib/time-utils';
import { cn } from '@/lib/utils';

interface HoursInputProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  minHours?: number;
  maxHours?: number;
  disabled?: boolean;
  className?: string;
  error?: string;
  showLabel?: boolean;
}

export function HoursInput({
  value,
  onChange,
  label,
  minHours = 0,
  maxHours = 999,
  disabled = false,
  className,
  error,
  showLabel = true,
}: HoursInputProps) {
  const { hours, minutes } = decimalToHoursAndMinutes(value);
  const [localHours, setLocalHours] = useState(hours.toString());
  const [localMinutes, setLocalMinutes] = useState(minutes);

  // Sincroniza estado local quando value muda externamente
  useEffect(() => {
    const { hours: newHours, minutes: newMinutes } = decimalToHoursAndMinutes(value);
    setLocalHours(newHours.toString());
    setLocalMinutes(newMinutes);
  }, [value]);

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setLocalHours(inputValue);

    const numHours = parseInt(inputValue) || 0;
    if (numHours >= minHours && numHours <= maxHours) {
      onChange(hoursAndMinutesToDecimal(numHours, localMinutes));
    }
  };

  const handleHoursBlur = () => {
    const numHours = Math.max(minHours, Math.min(maxHours, parseInt(localHours) || 0));
    setLocalHours(numHours.toString());
    onChange(hoursAndMinutesToDecimal(numHours, localMinutes));
  };

  const handleMinutesChange = (minutesStr: string) => {
    const numMinutes = parseInt(minutesStr);
    setLocalMinutes(numMinutes);
    const numHours = parseInt(localHours) || 0;
    onChange(hoursAndMinutesToDecimal(numHours, numMinutes));
  };

  const minuteOptions = getMinuteOptions();

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && showLabel && (
        <Label className="text-sm font-medium">{label}</Label>
      )}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <Input
            type="number"
            value={localHours}
            onChange={handleHoursChange}
            onBlur={handleHoursBlur}
            min={minHours}
            max={maxHours}
            disabled={disabled}
            className={cn(
              'w-16 text-center',
              error && 'border-destructive focus-visible:ring-destructive'
            )}
          />
          <span className="text-sm text-muted-foreground">h</span>
        </div>
        <div className="flex items-center gap-1">
          <Select
            value={localMinutes.toString()}
            onValueChange={handleMinutesChange}
            disabled={disabled}
          >
            <SelectTrigger
              className={cn(
                'w-20',
                error && 'border-destructive focus-visible:ring-destructive'
              )}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {minuteOptions.map((min) => (
                <SelectItem key={min} value={min.toString()}>
                  {min.toString().padStart(2, '0')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">min</span>
        </div>
      </div>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}

interface HoursInputCompactProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

/**
 * Versão compacta do input de horas (apenas um campo)
 * Aceita valores como "1.5" ou "1:30"
 */
export function HoursInputCompact({
  value,
  onChange,
  disabled = false,
  className,
  placeholder = "0",
}: HoursInputCompactProps) {
  const { hours, minutes } = decimalToHoursAndMinutes(value);
  const [localHours, setLocalHours] = useState(hours.toString());
  const [localMinutes, setLocalMinutes] = useState(minutes);

  useEffect(() => {
    const { hours: newHours, minutes: newMinutes } = decimalToHoursAndMinutes(value);
    setLocalHours(newHours.toString());
    setLocalMinutes(newMinutes);
  }, [value]);

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setLocalHours(inputValue);
    const numHours = parseInt(inputValue) || 0;
    if (numHours >= 0) {
      onChange(hoursAndMinutesToDecimal(numHours, localMinutes));
    }
  };

  const handleMinutesChange = (minutesStr: string) => {
    const numMinutes = parseInt(minutesStr);
    setLocalMinutes(numMinutes);
    const numHours = parseInt(localHours) || 0;
    onChange(hoursAndMinutesToDecimal(numHours, numMinutes));
  };

  const minuteOptions = getMinuteOptions();

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Input
        type="number"
        value={localHours}
        onChange={handleHoursChange}
        min={0}
        disabled={disabled}
        placeholder={placeholder}
        className="w-14 text-center h-8 text-sm"
      />
      <span className="text-xs text-muted-foreground">h</span>
      <Select
        value={localMinutes.toString()}
        onValueChange={handleMinutesChange}
        disabled={disabled}
      >
        <SelectTrigger className="w-16 h-8 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {minuteOptions.map((min) => (
            <SelectItem key={min} value={min.toString()}>
              {min.toString().padStart(2, '0')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-xs text-muted-foreground">min</span>
    </div>
  );
}
