"use client";
export default function PrintButton() {
  return <button className="b noprint" type="button" onClick={() => window.print()}>Print</button>;
}
