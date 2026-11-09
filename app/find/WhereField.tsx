"use client";
import { useState } from "react";
import AddressInput from "@/app/components/AddressInput";

// The "Where?" search box. When someone picks a suggestion, the city and
// state ride along so the search matches that place exactly.
export default function WhereField({ defaultValue }: { defaultValue: string }) {
  const [picked, setPicked] = useState<{ label: string; city: string; st: string } | null>(null);
  return (
    <>
      <AddressInput
        name="where"
        defaultValue={defaultValue}
        placeholder="Where? Start typing a city or address"
        ariaLabel="Where"
        onPick={(p) => setPicked(p.city && p.state ? { label: p.label, city: p.city, st: p.state } : null)}
      />
      {picked && (
        <>
          <input type="hidden" name="wl" value={picked.label} />
          <input type="hidden" name="city" value={picked.city} />
          <input type="hidden" name="st" value={picked.st} />
        </>
      )}
    </>
  );
}
