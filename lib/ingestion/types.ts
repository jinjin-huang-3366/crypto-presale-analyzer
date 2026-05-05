export type IngestionProjectRecord = {
  name: string;
  slug: string;
  ticker: string;
  description: string;
  status: "upcoming" | "live" | "ended";
  website: string;
  twitter: string | null;
  whitepaper: string | null;
  start_date: Date | null;
  end_date: Date | null;
  fdv: string | null;
  sale_price: string | null;
  total_supply: string | null;
  vesting_summary: string | null;
};

export type IngestionSource = "auto" | "mock" | "coinpaprika" | "icodrops";
