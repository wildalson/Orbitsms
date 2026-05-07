const PREFIX_OPERATOR: Record<string, "Globe" | "Smart" | "DITO"> = {
  "0817": "Globe",
  "0837": "Globe",
  "0838": "Globe",
  "0849": "Globe",
  "0905": "Globe",
  "0906": "Globe",
  "0916": "Globe",
  "0917": "Globe",
  "0926": "Globe",
  "0927": "Globe",
  "0935": "Globe",
  "0936": "Globe",
  "0937": "Globe",
  "0938": "Globe",
  "0939": "Globe",
  "0945": "Globe",
  "0953": "Globe",
  "0954": "Globe",
  "0955": "Globe",
  "0956": "Globe",
  "0965": "Globe",
  "0966": "Globe",
  "0967": "Globe",
  "0975": "Globe",
  "0976": "Globe",
  "0977": "Globe",
  "0978": "Globe",
  "0979": "Globe",
  "0995": "Globe",
  "0996": "Globe",
  "0997": "Globe",
  "0907": "Smart",
  "0908": "Smart",
  "0909": "Smart",
  "0910": "Smart",
  "0911": "Smart",
  "0912": "Smart",
  "0913": "Smart",
  "0914": "Smart",
  "0918": "Smart",
  "0919": "Smart",
  "0920": "Smart",
  "0921": "Smart",
  "0922": "Smart",
  "0923": "Smart",
  "0924": "Smart",
  "0925": "Smart",
  "0928": "Smart",
  "0929": "Smart",
  "0931": "Smart",
  "0932": "Smart",
  "0933": "Smart",
  "0934": "Smart",
  "0942": "Smart",
  "0943": "Smart",
  "0946": "Smart",
  "0947": "Smart",
  "0948": "Smart",
  "0949": "Smart",
  "0998": "Smart",
  "0999": "Smart",
  "0895": "DITO",
  "0896": "DITO",
  "0897": "DITO",
  "0898": "DITO",
  "0991": "DITO",
  "0992": "DITO",
  "0993": "DITO",
  "0994": "DITO",
};

function normalizePhilippineNumber(raw: string): string {
  let number = raw.replace(/\D/g, "");
  if (number.startsWith("63") && number.length === 12) {
    number = `0${number.slice(2)}`;
  }
  if (number.startsWith("9") && number.length === 10) {
    number = `0${number}`;
  }
  return number;
}

export function detectPhilippineOperator(raw: string): "Globe" | "Smart" | "DITO" | "Unknown" {
  const number = normalizePhilippineNumber(raw);
  const prefix = number.slice(0, 4);
  return PREFIX_OPERATOR[prefix] ?? "Unknown";
}
