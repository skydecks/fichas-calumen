"use client";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";

export default function CatalogCombobox({
  label,
  value,
  options,
  onChange,
  placeholder = "Buscar o escribir un valor…",
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <Combobox items={options} value={value} onValueChange={onChange}>
      <ComboboxInput label={label} placeholder={placeholder} />
      <ComboboxContent>
        <ComboboxEmpty>
          Sin coincidencias. Se guardará el texto escrito.
        </ComboboxEmpty>
        <ComboboxList>
          {(item) => (
            <ComboboxItem key={item} value={item}>
              {item}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
