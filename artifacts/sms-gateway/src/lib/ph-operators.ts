export interface PhOperator {
  name: string;
  brand: string;
  mccmnc: string;
  routeVia: "Globe" | "Smart" | "DITO";
  color: string;
  bgColor: string;
  borderColor: string;
}

const OPERATORS: PhOperator[] = [
  { name: "Globe", brand: "Globe", mccmnc: "51502", routeVia: "Globe", color: "text-blue-400", bgColor: "bg-blue-500/10", borderColor: "border-blue-500/20" },
  { name: "TM", brand: "TM (Globe)", mccmnc: "51502", routeVia: "Globe", color: "text-blue-300", bgColor: "bg-blue-500/10", borderColor: "border-blue-400/20" },
  { name: "GOMO", brand: "GOMO (Globe)", mccmnc: "51502", routeVia: "Globe", color: "text-cyan-400", bgColor: "bg-cyan-500/10", borderColor: "border-cyan-500/20" },
  { name: "Smart", brand: "Smart", mccmnc: "51503", routeVia: "Smart", color: "text-green-400", bgColor: "bg-green-500/10", borderColor: "border-green-500/20" },
  { name: "TNT", brand: "Talk \'N Text (Smart)", mccmnc: "51503", routeVia: "Smart", color: "text-green-300", bgColor: "bg-green-500/10", borderColor: "border-green-400/20" },
  { name: "Sun", brand: "Sun (Smart)", mccmnc: "51503", routeVia: "Smart", color: "text-yellow-400", bgColor: "bg-yellow-500/10", borderColor: "border-yellow-500/20" },
  { name: "DITO", brand: "DITO", mccmnc: "51566", routeVia: "DITO", color: "text-purple-400", bgColor: "bg-purple-500/10", borderColor: "border-purple-500/20" },
];

const PREFIX_MAP: Record<string, string> = {
  // Globe
  "0817": "Globe", "0905": "Globe", "0906": "Globe", "0916": "Globe", "0917": "Globe",
  "0926": "Globe", "0927": "Globe", "0935": "Globe", "0936": "Globe", "0945": "Globe",
  "0953": "Globe", "0954": "Globe", "0955": "Globe", "0956": "Globe", "0965": "Globe",
  "0966": "Globe", "0967": "Globe", "0975": "Globe", "0976": "Globe", "0977": "Globe",
  "0978": "Globe", "0979": "Globe", "0995": "Globe", "0996": "Globe", "0997": "Globe",
  // TM (Globe subsidiary)
  "0837": "TM", "0838": "TM", "0849": "TM", "0937": "TM", "0938": "TM", "0939": "TM",
  // GOMO (Globe infrastructure)
  "0176": "GOMO",
  // Smart
  "0908": "Smart", "0911": "Smart", "0912": "Smart", "0913": "Smart", "0914": "Smart",
  "0918": "Smart", "0919": "Smart", "0920": "Smart", "0921": "Smart", "0928": "Smart",
  "0929": "Smart", "0946": "Smart", "0947": "Smart", "0948": "Smart", "0949": "Smart",
  "0998": "Smart", "0999": "Smart",
  // Talk 'N Text (Smart subsidiary)
  "0907": "TNT", "0909": "TNT", "0910": "TNT",
  // Sun Cellular (now under Smart)
  "0922": "Sun", "0923": "Sun", "0924": "Sun", "0925": "Sun",
  "0931": "Sun", "0932": "Sun", "0933": "Sun", "0934": "Sun",
  "0942": "Sun", "0943": "Sun",
  // DITO
  "0895": "DITO", "0896": "DITO", "0897": "DITO", "0898": "DITO",
  "0991": "DITO", "0992": "DITO", "0993": "DITO", "0994": "DITO",
};

function normalizeNumber(raw: string): string {
  let n = raw.replace(/\D/g, "");
  if (n.startsWith("63") && n.length === 12) n = "0" + n.slice(2);
  if (n.startsWith("9") && n.length === 10) n = "0" + n;
  return n;
}

export function detectOperator(raw: string): PhOperator | null {
  const n = normalizeNumber(raw);
  if (n.length < 11) return null;
  const prefix = n.slice(0, 4);
  const name = PREFIX_MAP[prefix];
  if (!name) return null;
  return OPERATORS.find(o => o.name === name) ?? null;
}

export function formatPHNumber(raw: string): string {
  const n = normalizeNumber(raw);
  if (n.length === 11 && n.startsWith("0")) {
    return `+63 ${n[1]}${n[2]}${n[3]} ${n.slice(4, 7)} ${n.slice(7)}`;
  }
  return raw;
}

export const PH_OPERATORS_LIST = [
  { label: "Globe", mccmnc: "51502", color: "text-blue-400" },
  { label: "Smart", mccmnc: "51503", color: "text-green-400" },
  { label: "DITO", mccmnc: "51566", color: "text-purple-400" },
];
