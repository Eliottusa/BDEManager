'use client';

import { useState, useRef, useCallback } from 'react';

interface GeoResult {
  label: string;
  city: string;
  postcode: string;
  lat: number;
  lon: number;
}

interface Props {
  onSelect: (addr: GeoResult) => void;
  placeholder?: string;
}

export default function AddressAutocomplete({ onSelect, placeholder = 'Rechercher une adresse…' }: Props) {
  const [value, setValue] = useState('');
  const [suggestions, setSuggestions] = useState<GeoResult[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((q: string) => {
    if (q.length < 3) { setSuggestions([]); setOpen(false); return; }
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    fetch(`http://localhost:3001/api/v1/geo/search?q=${encodeURIComponent(q)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((data: GeoResult[]) => { setSuggestions(data); setOpen(data.length > 0); })
      .catch(() => {});
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setValue(q);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => search(q), 300);
  };

  const handleSelect = (addr: GeoResult) => {
    setValue(addr.label);
    setSuggestions([]);
    setOpen(false);
    onSelect(addr);
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      />
      {open && (
        <ul className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
          {suggestions.map((s) => (
            <li
              key={s.label}
              onMouseDown={() => handleSelect(s)}
              className="cursor-pointer px-3 py-2 text-sm hover:bg-blue-50"
            >
              {s.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
