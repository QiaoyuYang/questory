/** The figures behind why Questory is played on foot, outside, each with where it comes from. */

export type Source = { name: string; url: string };
export type Fact = { value: string; label: string; source: Source };

const doi = (id: string) => `https://doi.org/${id}`;

const ADULTS: Source = { name: "The Lancet Global Health, 2024", url: doi("10.1016/S2214-109X(24)00150-5") };
const STEPS: Source = { name: "The Lancet Public Health, 2025", url: doi("10.1016/S2468-2667(25)00164-1") };

/** How little people move, and where it's heading. */
export const INACTIVITY_FACTS: Fact[] = [
  { value: "31%", label: "of adults don't get enough physical activity, up from 23% in 2000.", source: ADULTS },
  {
    value: "35%",
    label: "of adults could be inactive by 2030 if the trend continues.",
    source: {
      name: "WHO, 2024",
      url: "https://www.who.int/news/item/26-06-2024-nearly-1.8-billion-adults-at-risk-of-disease-from-not-doing-enough-physical-activity",
    },
  },
  {
    value: "4,961",
    label: "steps a day on average, counted by the phones of nearly 700,000 people in 46 countries.",
    source: { name: "Nature, 2017", url: doi("10.1038/nature23018") },
  },
  {
    value: "7.2%",
    label: "of deaths worldwide are due to physical inactivity.",
    source: { name: "British Journal of Sports Medicine, 2022", url: doi("10.1136/bjsports-2020-103640") },
  },
];

/** What walking, and being out in daylight, does for people. Most are associations, not trials. */
export const WALKING_FACTS: Fact[] = [
  { value: "47%", label: "lower risk of death at 7,000 steps a day than at 2,000.", source: STEPS },
  {
    value: "25%",
    label: "lower risk of depression with the activity of 2.5 hours of brisk walking a week.",
    source: { name: "JAMA Psychiatry, 2022", url: doi("10.1001/jamapsychiatry.2022.0609") },
  },
  {
    value: "20%",
    label: "lower odds of depression for people who get the most daylight.",
    source: { name: "Nature Mental Health, 2023", url: doi("10.1038/s44220-023-00135-8") },
  },
  {
    value: "60%",
    label: "more creative ideas while walking than while sitting.",
    source: { name: "Journal of Experimental Psychology: Learning, Memory, and Cognition, 2014", url: doi("10.1037/a0036577") },
  },
];

/** The two the landing page leads with, from different journals: how many people don't move enough, and what walking does. */
export const HEADLINE_FACTS: Fact[] = [INACTIVITY_FACTS[0], WALKING_FACTS[1]];
