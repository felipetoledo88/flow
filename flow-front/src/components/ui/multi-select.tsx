import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface MultiSelectProps {
  value: string[];
  onValueChange: (values: string[]) => void;
  placeholder?: string;
  children: React.ReactNode;
  disabled?: boolean;
}

interface MultiSelectItemProps {
  value: string;
  children: React.ReactNode;
}

const MultiSelectContext = React.createContext<{
  value: string[];
  onValueChange: (values: string[]) => void;
} | null>(null);

export const MultiSelect: React.FC<MultiSelectProps> = ({ value, onValueChange, placeholder, children, disabled }) => {
  const [open, setOpen] = React.useState(false);

  const toggleValue = (val: string) => {
    if (value.includes(val)) {
      onValueChange(value.filter(v => v !== val));
    } else {
      onValueChange([...value, val]);
    }
  };

  return (
    <MultiSelectContext.Provider value={{ value, onValueChange: toggleValue }}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between" disabled={disabled}>
            <MultiSelectValue placeholder={placeholder} />
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar..." />
            <CommandList>
              <CommandEmpty>Nenhum resultado.</CommandEmpty>
              <CommandGroup>
                {children}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </MultiSelectContext.Provider>
  );
};

export const MultiSelectValue: React.FC<{ placeholder?: string }> = ({ placeholder }) => {
  const ctx = React.useContext(MultiSelectContext);
  if (!ctx) return null;
  if (!ctx.value.length) return <span className="text-muted-foreground">{placeholder || "Selecione"}</span>;
  return (
    <div className="flex gap-1 flex-wrap">
      {ctx.value.map(val => (
        <Badge key={val} variant="secondary" className="rounded-sm px-1.5">
          {val}
        </Badge>
      ))}
    </div>
  );
};

export const MultiSelectItem: React.FC<MultiSelectItemProps> = ({ value, children }) => {
  const ctx = React.useContext(MultiSelectContext);
  if (!ctx) return null;
  const isSelected = ctx.value.includes(value);
  return (
    <CommandItem
      value={value}
      onSelect={() => ctx.onValueChange(value)}
      className="flex items-center gap-2"
    >
      <Check className={`h-4 w-4 ${isSelected ? 'opacity-100' : 'opacity-0'}`} />
      <span>{children}</span>
    </CommandItem>
  );
};

export const MultiSelectTrigger = React.forwardRef<HTMLButtonElement, React.ComponentProps<typeof Button>>(
  ({ children, ...props }, ref) => (
    <Button ref={ref} {...props}>
      {children}
    </Button>
  )
);

MultiSelectTrigger.displayName = "MultiSelectTrigger";

export const MultiSelectContent: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>;
