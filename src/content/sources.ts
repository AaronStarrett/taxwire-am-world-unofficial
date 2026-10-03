import type { Source } from "./types";

const checkedAt = "2026-10-03";
export const sources: Source[] = [
  {
    id: "sst",
    title: "Streamlined Sales Tax — Remote Sellers and FAQs",
    url: "https://www.streamlinedsalestax.org/for-businesses/remote-seller-faqs",
    jurisdiction: "US; participating states and state-specific links",
    checkedAt,
    applicablePeriod:
      "Reference available on brief date; confirm law for each transaction period",
    facts:
      "Investigation of physical presence, remote sales, threshold bases and state-specific collection timing.",
    uncertainty:
      "No universal threshold or nexus conclusion; measurement definitions and effective dates require current state authority and professional review.",
    status: "needs_professional_review",
    summary:
      "The FAQ distinguishes physical presence from remote sales and gross, retail and taxable sales measures. It directs sellers to individual states for registration requirements.",
  },
  {
    id: "ny-software",
    title: "New York Tax Bulletin ST-128 — Computer Software",
    url: "https://www.tax.ny.gov/pubs_and_bulls/tg_bulletins/st/computer_software.htm",
    jurisdiction: "New York, US",
    checkedAt,
    applicablePeriod:
      "Bulletin issued 2014-08-05; page updated 2026-03-31; case-period applicability unreviewed",
    facts:
      "Prewritten versus custom software; separately stated services; location of users.",
    uncertainty:
      "Bulletin warns that subsequent law or interpretation may change its accuracy. Classification of any actual product requires its full facts and professional review.",
    status: "needs_professional_review",
    summary:
      "The bulletin describes prewritten software including remote access, custom modifications, related services and user-location allocation. It is a research lead, not a universal SaaS rule.",
  },
  {
    id: "tx-services",
    title: "Texas Comptroller — Taxable Services, publication 96-259",
    url: "https://comptroller.texas.gov/taxes/publications/96-259.php",
    jurisdiction: "Texas, US",
    checkedAt,
    applicablePeriod:
      "Public page retrieved on brief date; transaction-period law unreviewed",
    facts:
      "Service classification, data processing and professional-service distinction.",
    uncertainty:
      "Do not classify a service from its marketing label alone. Relevant rules and exemptions need case-specific review.",
    status: "needs_professional_review",
    summary:
      "The publication describes taxable service categories, data processing and its partial exemption, and distinguishes professional work that uses a computer as a tool. Game calculation rates remain synthetic.",
  },
  {
    id: "eu-oss",
    title: "European Commission — The One Stop Shop",
    url: "https://vat-one-stop-shop.ec.europa.eu/one-stop-shop_en",
    jurisdiction: "European Union",
    checkedAt,
    applicablePeriod:
      "Schemes described as applying from 2021-07-01; current case eligibility unreviewed",
    facts:
      "Compare non-Union, Union and import schemes; seller establishment, goods versus services, customer status.",
    uncertainty:
      "OSS does not eliminate every domestic obligation. Supplier eligibility, special rules, destination law and exceptions require professional review.",
    status: "needs_professional_review",
    summary:
      "The Commission describes three optional special schemes with different scopes. Import-scheme coverage includes qualifying low-value imported goods; OSS returns can be additional to domestic VAT returns.",
  },
  {
    id: "uk-services",
    title: "HMRC — Place of supply of services, VAT Notice 741A",
    url: "https://www.gov.uk/guidance/vat-place-of-supply-of-services-notice-741a",
    jurisdiction: "United Kingdom",
    checkedAt,
    applicablePeriod:
      "Public guidance on brief date; relevant supply period and exceptions must be reviewed",
    facts:
      "Customer business status, establishments, type of service, place of supply and reverse-charge investigation.",
    uncertainty:
      "Check special rules before defaults. Do not infer B2B from an email domain or apply every service rule to digital consumer sales.",
    status: "needs_professional_review",
    summary:
      "The notice separates B2B and B2C general rules, exceptions, evidence and reverse-charge treatment. Establish the precise service and customer facts before selecting a rule.",
  },
  {
    id: "ca-gst",
    title: "Canada Revenue Agency — GST/HST for businesses",
    url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses.html",
    jurisdiction: "Canada; federal GST/HST",
    checkedAt,
    applicablePeriod:
      "Index page details 2026-07-29; underlying rule versions need review",
    facts:
      "Registration, collection, reporting, input tax credits, filing and payment; provincial questions require separate authority.",
    uncertainty:
      "Index is a navigation source. Federal GST/HST is not an answer key for QST/PST or every digital-economy regime.",
    status: "needs_professional_review",
    summary:
      "CRA links the stages of GST/HST operations and non-resident digital-economy guidance. Use its detailed topic pages for a real case rather than treating this index as complete authority.",
  },
  {
    id: "taxwire-public",
    title: "Taxwire public offering",
    url: "https://www.taxwire.com/",
    jurisdiction: "Public company marketing; no legal authority",
    checkedAt,
    applicablePeriod:
      "Public presentation on brief date; no service contract inferred",
    facts:
      "Public offering context for an unofficial educational role simulation.",
    uncertainty:
      "Actual customer scope, internal tools, approvals, service levels and operating procedures remain unknown. Marketing statements are not learner authorization.",
    status: "public_reference",
    summary:
      "The public site presents a combined platform and managed service covering indirect-tax calculation, registration, filing and expert coordination. This game invents all customer and internal policies.",
  },
  {
    id: "taxwire-role",
    title: "Taxwire — Account Manager, Indirect Tax (public Ashby posting)",
    url: "https://jobs.ashbyhq.com/taxwire/c25198cc-5240-4ee3-aee0-e1f8f4ada1f9",
    jurisdiction: "Public role context; not employer procedure",
    checkedAt,
    applicablePeriod:
      "Matching job public API record published 2026-06-30; accessed on brief date",
    facts:
      "Post-onboarding relationship ownership, compliance coordination, retention, growth and scalable operations.",
    uncertainty:
      "Full public description retrieved through https://api.ashbyhq.com/posting-api/job-board/taxwire?includeCompensation=true. The job advertisement does not establish any actual internal approval authority.",
    status: "public_reference",
    summary:
      "The role emphasizes portfolio ownership, business understanding, coordination with tax and operations, renewals and expansion, account-health evidence, and reusable operational systems. The game provides fictional practice for these themes.",
  },
  {
    id: "training-policy",
    title: "Fictional training operating policy v1",
    url: "https://example.invalid/fictional-training-policy",
    jurisdiction: "Simulation only",
    checkedAt,
    applicablePeriod: "Campaign content v1; no actual employer procedure",
    facts:
      "Synthetic rates, compressed dates, capacity, approval and evidence rules used only for deterministic exercises.",
    uncertainty:
      "This authored policy is not a statement about Taxwire, law or an actual customer. All mission financial values are fictional.",
    status: "fictional_policy",
    summary:
      "AMs can investigate and communicate; tax specialists approve legal positions, customers approve financial actions, commercial leads approve offers. Closure needs evidence and owned residual work. No real message, filing or payment is sent.",
  },
];
