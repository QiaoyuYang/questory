/** The figures behind why Questory is played on foot and with friends, each with where it comes from. */

export type Source = { name: string; url: string };
export type Fact = { value: string; label: string; source: Source };

const INACTIVITY: Source = {
  name: "The Lancet Global Health, 2024",
  url: "https://doi.org/10.1016/S2214-109X(24)00150-5",
};
const STEPS: Source = { name: "The Lancet Public Health, 2025", url: "https://doi.org/10.1016/S2468-2667(25)00164-1" };
const LONELINESS: Source = {
  name: "WHO, 2025",
  url: "https://www.who.int/news/item/30-06-2025-social-connection-linked-to-improved-heath-and-reduced-risk-of-early-death",
};

export const WALKING_FACTS: Fact[] = [
  { value: "1 in 3", label: "adults don't get enough physical activity.", source: INACTIVITY },
  { value: "47%", label: "lower risk of death at 7,000 steps a day than at 2,000.", source: STEPS },
];

export const TOGETHER_FACTS: Fact[] = [
  { value: "1 in 6", label: "people worldwide are affected by loneliness.", source: LONELINESS },
];
