"use client";

import React, { useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import {
  STATIC_SECTORS,
  STATIC_OCCUPATIONS,
  STATIC_UNITS,
  STATIC_COMPETENCIES,
  type StaticCompetency,
} from "../../lib/taxonomy-static-data";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface TaxItem { id: string; name: string }
export interface Competency { id: string; name: string; category: string }

export interface TaxonomyState {
  sectors:      TaxItem[];
  occupations:  TaxItem[];
  units:        TaxItem[];
  titles:       TaxItem[];
  competencies: Competency[];
  sectorId:     string;
  occupationId: string;
  unitId:       string;
  selUnits:     Set<string>;
  selTitles:    Set<string>;
  selComps:     Set<string>;
  setSectorId:     (id: string) => void;
  setOccupationId: (id: string) => void;
  setUnitId:       (id: string) => void;
  toggleUnit:  (id: string) => void;
  toggleTitle: (id: string) => void;
  toggleComp:  (id: string) => void;
  /** Build a multi-line context string from selected taxonomy */
  buildContext: () => string;
  /** Names of selected sector + occupation */
  sectorName:     string;
  occupationName: string;
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useTaxonomy(): TaxonomyState {
  const [sectorId,     setSectorId]     = useState("");
  const [occupationId, setOccupationId] = useState("");
  const [unitId,       setUnitId]       = useState("");

  const [selUnits,  setSelUnits]  = useState<Set<string>>(new Set());
  const [selTitles, setSelTitles] = useState<Set<string>>(new Set());
  const [selComps,  setSelComps]  = useState<Set<string>>(
    new Set(STATIC_COMPETENCIES.map((c) => c.id))
  );

  // Sectors: always show all
  const sectors = STATIC_SECTORS;

  // Occupations: show all when a sector is selected (no sector-occupation mapping in source data)
  const occupations = sectorId ? STATIC_OCCUPATIONS : [];

  // Units: show all predefined units when an occupation is selected
  const units = occupationId ? STATIC_UNITS : [];

  // Titles: not in source data — empty
  const titles: TaxItem[] = [];

  // Competencies: show full list when occupation is selected
  const competencies: Competency[] = occupationId ? STATIC_COMPETENCIES : [];

  const handleSetSectorId = (id: string) => {
    setSectorId(id);
    setOccupationId("");
    setUnitId("");
    setSelUnits(new Set());
    setSelTitles(new Set());
    setSelComps(new Set(STATIC_COMPETENCIES.map((c) => c.id)));
  };

  const handleSetOccupationId = (id: string) => {
    setOccupationId(id);
    setUnitId("");
    setSelUnits(new Set(STATIC_UNITS.map((u) => u.id)));
    setSelTitles(new Set());
    setSelComps(new Set(STATIC_COMPETENCIES.map((c) => c.id)));
  };

  const handleSetUnitId = (id: string) => {
    setUnitId(id);
  };

  const toggle = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) =>
    setter((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const buildContext = () => {
    const parts: string[] = [];
    const sector = sectors.find((s) => s.id === sectorId);
    const occ    = occupations.find((o) => o.id === occupationId);
    if (sector) parts.push(`Sektör: ${sector.name}`);
    if (occ)    parts.push(`Meslek: ${occ.name}`);
    const uNames = units.filter((u) => selUnits.has(u.id)).map((u) => u.name);
    const tNames = titles.filter((t) => selTitles.has(t.id)).map((t) => t.name);
    const cSelected = competencies.filter((c) => selComps.has(c.id)) as StaticCompetency[];
    if (uNames.length) parts.push(`Birimler: ${uNames.join(", ")}`);
    if (tNames.length) parts.push(`Ünvanlar: ${tNames.join(", ")}`);
    if (cSelected.length) {
      const byCat: Record<string, string[]> = {};
      cSelected.forEach((c) => (byCat[c.category] ||= []).push(c.name));
      parts.push(`Yetkinlikler: ${Object.entries(byCat).map(([k, v]) => `${k}: ${v.join(", ")}`).join(" | ")}`);
    }
    return parts.join("\n");
  };

  return {
    sectors, occupations, units, titles, competencies,
    sectorId, occupationId, unitId,
    selUnits, selTitles, selComps,
    setSectorId:     handleSetSectorId,
    setOccupationId: handleSetOccupationId,
    setUnitId:       handleSetUnitId,
    toggleUnit:  (id) => toggle(setSelUnits, id),
    toggleTitle: (id) => toggle(setSelTitles, id),
    toggleComp:  (id) => toggle(setSelComps, id),
    buildContext,
    sectorName:     sectors.find((s) => s.id === sectorId)?.name     ?? "",
    occupationName: occupations.find((o) => o.id === occupationId)?.name ?? "",
  };
}

// ─── CascadeSelect ─────────────────────────────────────────────────────────────

export function CascadeSelect({
  label, value, onChange, options, placeholder, disabled, accentClass = "focus:ring-blue-500",
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: TaxItem[]; placeholder: string; disabled?: boolean; accentClass?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || options.length === 0}
        className={`w-full text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-2 ${accentClass} disabled:bg-gray-50 disabled:text-gray-400`}
      >
        <option value="">{options.length === 0 && disabled ? "Önce üstünü seçin" : placeholder}</option>
        {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
    </div>
  );
}

// ─── MultiCheck ────────────────────────────────────────────────────────────────

export function MultiCheck({
  label, items, selected, onToggle, groupKey, accentClass = "bg-blue-600 border-blue-600",
}: {
  label: string;
  items: TaxItem[] | Competency[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  groupKey?: keyof Competency;
  accentClass?: string;
}) {
  const [open, setOpen] = useState(true);
  if (items.length === 0) return null;

  const selCount = items.filter((i) => selected.has(i.id)).length;
  const allSel   = selCount === items.length;

  const toggleAll = () => {
    if (allSel) items.forEach((i) => { if (selected.has(i.id)) onToggle(i.id); });
    else        items.forEach((i) => { if (!selected.has(i.id)) onToggle(i.id); });
  };

  const grouped: Record<string, (TaxItem | Competency)[]> = {};
  if (groupKey) {
    (items as Competency[]).forEach((c) => {
      (grouped[c[groupKey] as string] ||= []).push(c);
    });
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 bg-gray-100 hover:bg-gray-200 transition-colors">
        <span className="text-xs font-semibold text-gray-700">{label}</span>
        <div className="flex items-center gap-2">
          {selCount > 0 && (
            <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 rounded-full">{selCount}</span>
          )}
          <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>
      {open && (
        <div className="p-2 max-h-44 overflow-y-auto bg-white">
          <button type="button" onClick={toggleAll}
            className="text-[10px] text-blue-600 hover:text-blue-800 px-1 pb-1 border-b border-gray-100 mb-1.5 w-full text-left">
            {allSel ? "Tümünü kaldır" : "Tümünü seç"}
          </button>
          {groupKey
            ? Object.entries(grouped).map(([cat, comps]) => (
                <div key={cat} className="mb-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide px-1 mb-0.5">{cat}</p>
                  {comps.map((c) => <CheckRow key={c.id} id={c.id} label={c.name} selected={selected} onToggle={onToggle} accentClass={accentClass} />)}
                </div>
              ))
            : items.map((i) => <CheckRow key={i.id} id={i.id} label={i.name} selected={selected} onToggle={onToggle} accentClass={accentClass} />)
          }
        </div>
      )}
    </div>
  );
}

function CheckRow({ id, label, selected, onToggle, accentClass }: {
  id: string; label: string; selected: Set<string>; onToggle: (id: string) => void; accentClass: string;
}) {
  const checked = selected.has(id);
  return (
    <label className="flex items-center gap-2 px-1 py-0.5 rounded hover:bg-gray-50 cursor-pointer select-none">
      <span className={`w-3.5 h-3.5 flex-shrink-0 rounded border flex items-center justify-center transition-colors ${checked ? accentClass : "border-gray-300"}`}>
        {checked && <Check className="w-2.5 h-2.5 text-white" />}
      </span>
      <input type="checkbox" checked={checked} onChange={() => onToggle(id)} className="hidden" />
      <span className="text-xs text-gray-700">{label}</span>
    </label>
  );
}

// ─── Full taxonomy block ────────────────────────────────────────────────────────

export function TaxonomyBlock({
  tax, disabled, accentClass,
}: {
  tax: TaxonomyState; disabled: boolean; accentClass?: string;
}) {
  return (
    <div className="border-t border-gray-200 pt-3 space-y-2">
      <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Taxonomy</p>

      <CascadeSelect label="Sektör" value={tax.sectorId} onChange={tax.setSectorId}
        options={tax.sectors} placeholder="— Sektör seçin —" disabled={disabled} accentClass={accentClass} />

      <CascadeSelect label="Meslek" value={tax.occupationId} onChange={tax.setOccupationId}
        options={tax.occupations} placeholder="— Meslek seçin —"
        disabled={disabled || !tax.sectorId} accentClass={accentClass} />

      {tax.units.length > 0 && (
        <CascadeSelect label="Birim (ünvan listesi için)" value={tax.unitId} onChange={tax.setUnitId}
          options={tax.units} placeholder="— Birim seçin —" disabled={disabled} accentClass={accentClass} />
      )}

      {tax.units.length > 0 && (
        <MultiCheck label={`Birimler (${tax.units.length})`} items={tax.units}
          selected={tax.selUnits} onToggle={tax.toggleUnit} accentClass={accentClass} />
      )}

      {tax.titles.length > 0 && (
        <MultiCheck label={`Ünvanlar (${tax.titles.length})`} items={tax.titles}
          selected={tax.selTitles} onToggle={tax.toggleTitle} accentClass={accentClass} />
      )}

      {tax.competencies.length > 0 && (
        <MultiCheck label={`Yetkinlikler (${tax.competencies.length})`} items={tax.competencies}
          selected={tax.selComps} onToggle={tax.toggleComp} groupKey="category" accentClass={accentClass} />
      )}
    </div>
  );
}
