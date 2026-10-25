# Analytics

Privacy-conscious GA4 analytics for itelematics.com. Only the events below are sent, only after the
visitor allows analytics, and only with non-personal context.

- Code: [`src/lib/analytics/taxonomy.ts`](../../src/lib/analytics/taxonomy.ts) (events, link rules, sanitising),
  [`src/lib/analytics/client.ts`](../../src/lib/analytics/client.ts) (gating, consent, gtag),
  [`src/components/analytics/Analytics.tsx`](../../src/components/analytics/Analytics.tsx) (page views, click delegation, consent banner).
- Tests: `npm test` covers classification, sanitising, consent, gating and page-view de-duplication.

## How it loads

| Condition | Result |
|---|---|
| `next dev`, previews, any host not in `NEXT_PUBLIC_ANALYTICS_HOSTS` | Off. No banner, no script, no events. |
| Production host, visitor hasn't chosen | Consent banner. Nothing loaded. |
| Visitor declines, or browser sends Global Privacy Control | Nothing loaded. `ga-disable-<ID>` set, `_ga*` cookies removed. |
| Visitor allows | `gtag.js` loads after hydration; events are sent. |
| `NEXT_PUBLIC_ANALYTICS_DEBUG=true` | Events are logged to the browser console (`[analytics]`) instead of sent. Banner still applies. |

Visitors can change their choice with **Analytics preferences** in the footer.

### Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | `G-8JBWVSV5GE` | GA4 property. Set to an empty value to disable analytics. |
| `NEXT_PUBLIC_ANALYTICS_HOSTS` | `itelematics.com,www.itelematics.com,ev.engineer,www.ev.engineer` | Hostnames where analytics may run. |
| `NEXT_PUBLIC_ANALYTICS_DEBUG` | unset | `true` logs events locally. Never set in production. |

`NEXT_PUBLIC_*` values are inlined at build time, so rebuild after changing them.

## Events

| Event | Fires when | How it's detected |
|---|---|---|
| `page_view` | Each distinct path, including App Router (SPA) navigations | `usePathname()` in `<Analytics />`; de-duplicated per path |
| `satellite_engineering_click` | Link to `aerospace.ev.engineer/space/satellite-engineering…` or internal `/satellite-engineering…` | Destination rule |
| `interactive_3d_click` | Link to `…/space/satellite-engineering/interactive-3d` | Destination rule (checked first) |
| `research_platform_view` | Landing on `/research-platform…`, or a `data-track-view="research_platform_view"` section scrolling into view | Route map / IntersectionObserver |
| `internship_view` | Landing on `/internships…`, or a `data-track-view="internship_view"` section | Route map / IntersectionObserver |
| `internship_apply_click` | An Apply CTA | `data-track="internship_apply_click"` |
| `research_collaboration_click` | A "Discuss Research Collaboration" style CTA | `data-track="research_collaboration_click"` |
| `consultancy_click` | Any link inside the Consultancy & Services menu, or to internal `/consultancy…` | `data-track-fallback` / destination rule |
| `partner_click` | Link to Gamyaa AeroSystems, APEX (official site and ecosystem page), UFlight™, iFab, EV Society, `autonomous.ev.engineer`, `ev.engineer`, or `/ev-engineer` | Destination rule |
| `contact_submit` | A validated enquiry was handed to the visitor's email app: the form opened a `mailto:` draft to info@iTelematics.com. It measures intent, not delivery; the website cannot see whether the email was sent. Count actual enquiries in the mailbox. Invalid forms never fire it. | `ContactForm` |
| `join_rnd_click` | The Join Satellite Engineering / Discuss Research CTAs (event name unchanged) | `data-track="join_rnd_click"` |
| `mobile_navigation_use` | Mobile menu opened, or a mobile-menu link tapped that no other event claims | `Navbar` / `data-track-fallback` |

Destination rules are matched by URL, so the same link fires the same event in the hero, nav, footer,
desktop or mobile. Only `cta_location` changes.

### Parameters

Only these keys can be sent. Anything else is dropped by `sanitizeParams`.

| Parameter | Example | Notes |
|---|---|---|
| `page_path` | `/internships` | Never includes the query string. GA4 treats `page_path` as a reserved field and folds it into the page location, so report on the built-in **Page path** dimension rather than a custom one. Debug logs show it as-is |
| `section` | `Space Research & Workshops` | Nearest `data-analytics-section` |
| `cta_name` | `Explore Interactive 3D` | `data-track-name`, else `aria-label`, else link text |
| `cta_location` | `header-mobile`, `footer`, `hero` | Nearest `data-analytics-location`, else section |
| `destination` | `aerospace.ev.engineer/space/satellite-engineering`, `/contact` | Host + path only; `mailto`/`tel` never include the address |
| `destination_type` | `resource`, `partner`, `internal`, `external`, `document` | |
| `device_category` | `mobile`, `tablet`, `desktop` | Coarse, from pointer type and screen size |
| `enquiry_type` | `internship` | `contact_submit` only. Controlled vocabulary (below); any other value is dropped |
| `page_location`, `page_referrer` | `https://itelematics.com/contact` | Query-free; set on every hit via `gtag('set')` |

Country/region come from GA4's own geolocation; nothing location-related is collected by the site.

Free text is scrubbed of email addresses and phone/ID-like numbers and truncated to GA4 limits. Form
field values are never sent. The only form-derived value is the enquiry category, mapped from the fixed
dropdown option, never from free text.

### `enquiry_type` vocabulary

Allowed values: `internship`, `research`, `academic`, `industry`, `consultancy`, `investment`, `other`.
`sanitizeParams` drops anything else. Form options map onto them in
[`src/lib/contact/enquiries.ts`](../../src/lib/contact/enquiries.ts):

| Form option | `enquiry_type` |
|---|---|
| Satellite Engineering Internship | `internship` |
| Research Collaboration | `research` |
| Academic Collaboration | `academic` |
| Technical Review | `research` |
| Industry Collaboration | `industry` |
| Consultancy | `consultancy` |
| Research Platform | `research` |
| Investment / Strategic Discussion | `investment` |
| Other | `other` |

## Where the CTAs are tagged

Most links need nothing: destination rules already cover Satellite Engineering, Interactive 3D,
partners and consultancy. Explicit `data-track` is used only where the URL doesn't carry the meaning:

| CTA | Event | Where |
|---|---|---|
| Join Satellite Engineering (header and mobile menu) / Discuss Research (home hero) → `/contact?enquiry=research` (Research Collaboration preselected, changeable) | `join_rnd_click` | Header desktop + mobile, home hero |
| Apply for Internship | `internship_apply_click` | Home, Internships, Satellite Engineering, Research Platform |
| Discuss R&D / Research Collaboration | `research_collaboration_click` | Home, Satellite Engineering, Research Platform |
| Discuss Industry Collaboration | `research_collaboration_click` | Partners |
| Discuss Consultancy | `consultancy_click` (section fallback) | Consultancy & Services page |
| Explore Satellite Engineering (internal or course) | `satellite_engineering_click` | Hero, signposts, resource cards, CTA bands |
| Explore Interactive 3D | `interactive_3d_click` | Signposts, resource cards, footer |
| Ecosystem links | `partner_click` | Home (compact), Partners (list and ecosystem map) |
| EV.ENGINEER™ and Prerequisites (autonomous.ev.engineer/internships) | `partner_click` (destination rule) | Internships hero and closing CTA |

The homepage flagship section carries `data-track-view="research_platform_view"`; `/research-platform`
and `/internships` fire their view events on landing.

### EV.ENGINEER™ page (`/ev-engineer`)

Every link on the page carries an explicit `data-track`, so these events take precedence over the
destination rules above. Parameters are the standard ones: `section` (the research area, e.g.
`satellite-engineering`), `cta_name` (the item, e.g. `Open Interactive 3D`), `cta_location` (the button
location: `hero`, `primary-cta`, `secondary-cta`, `related-links`, `domain-cards`, `topic-links`,
`flagship`, `lab-card`, `pathway`, `partner`, `profile`, `research-index`, `final-cta`), `destination`
and `device_category`. No new parameters or GA4 custom definitions are needed.

The responsive-redesign brief (2026-10-25) suggested names such as `research_open` or `cta_click`
with `item` and `device_class`. They map onto the events already collecting data, so names were kept:
`research_open` → `ev_engineer_research_click`, `space_open` → `ev_engineer_space_click` /
`_satellite_click` / `_rocket_click`, `aerospace_open` → `ev_engineer_aerospace_click` / `_aqip_click`,
`battery_open` → `ev_engineer_battery_click`, `digital_twin_open` → `ev_engineer_digital_twin_click`,
`cybersecurity_open` → `ev_engineer_cybersecurity_click`, `ecosystem_open` → `ev_engineer_partner_click`,
`cta_click` → `ev_engineer_external_click`; `item` is `cta_name`, `device_class` is `device_category`.

| Event | Fires for |
|---|---|
| `ev_engineer_research_click` | Explore Research & Development (hero, final CTA), the four R&D domain cards and the "Also in R&D" topic links (in-page anchors) |
| `ev_engineer_space_click` | Space & Aerospace Technologies, Everyday Applications, Space Station, the index's Space group |
| `ev_engineer_satellite_click` | Satellite Engineering, Open Interactive 3D, CubeSat and Everyday Applications links in that section |
| `ev_engineer_rocket_click` | Rocket Engineering, Advanced Digital Twin, Model Rocketry |
| `ev_engineer_aerospace_click` | Aerospace Systems, UFlight™ 3D, the index's Aerospace group |
| `ev_engineer_aqip_click` | Aerospace Quality Intelligence |
| `ev_engineer_battery_click` | Flagship battery link; battery safety, health, pack engineering and electric-mobility links; Battery Engineering Portal and Repair pathways |
| `ev_engineer_digital_twin_click` | CubeTwin section and the four Learn by Building lab cards |
| `ev_engineer_cybersecurity_click` | Vehicle & Battery Cybersecurity: AegisCAN™ and Battery Cybersecurity |
| `ev_engineer_profile_click` | View Profile |
| `ev_engineer_partner_click` | Partnerships & Engineering Ecosystem cards and the index's Ecosystem group |
| `ev_engineer_external_click` | Explore / Visit EV.ENGINEER™ (autonomous.ev.engineer), ISHAVASYAM.ORG, the other Engineering Pathways and the index's Learning & Career group |

Same-page anchors (`href="#…"`, e.g. the sticky section navigation) never match destination rules;
they are counted only when tagged, as the R&D CTAs are.

### Rules when adding CTAs

- `data-track` must be on the clicked element (the `<a>`/`<button>`), not a wrapper.
- Use `<ExternalLink>` for new-tab links. It adds the screen-reader "(opens in a new tab)" note and
  sets `data-track-name` so the note never leaks into `cta_name`.
- If partner URLs change, update `PARTNER_HOSTS` in `taxonomy.ts`. Ecosystem content lives in
  [`src/lib/site.ts`](../../src/lib/site.ts).
- Don't add new event names casually. Extend the taxonomy and this document together.

## Key journeys

Build these as GA4 **Explore → Funnel exploration** reports (open funnel, steps in order):

| Journey | Step 1 | Step 2 | Step 3 |
|---|---|---|---|
| Home → Satellite Engineering → Internship | `page_view` path = `/` | `satellite_engineering_click` | `internship_view` or `internship_apply_click` |
| Home → Satellite Engineering → Interactive 3D | `page_view` path = `/` | `satellite_engineering_click` | `interactive_3d_click` |
| Home → Research Platform → Collaboration | `page_view` path = `/` | `research_platform_view` | `research_collaboration_click` |
| Home → Ecosystem → Partner | `page_view` path = `/` | `page_view` path = `/partners` | `partner_click` |
| Home → Consultancy → Contact | `page_view` path = `/` | `consultancy_click` (nav menu or `/consultancy`) | `contact_submit` with `enquiry_type = consultancy` |

Questions this answers:

- **Most-used Satellite Engineering pages**: Reports → Pages and screens, plus `satellite_engineering_click` by `destination`.
- **Internship interest**: `internship_view` users, and the share that reach `internship_apply_click`.
- **Interactive 3D opens**: `interactive_3d_click` count, compared with `satellite_engineering_click`.
- **Countries showing research interest**: `research_collaboration_click` / `research_platform_view` by Country.
- **Best-performing collaboration CTAs**: `research_collaboration_click` by `cta_name` × `cta_location`.
- **Ecosystem links used**: `partner_click` by `destination`.
- **Device mix**: built-in Device category, or `device_category`.
- **What enquiries are about**: `contact_submit` (email drafts opened) by `enquiry_type`; compare with enquiries actually received.

## One-time GA4 property setup (required)

1. **Admin → Data streams → Web → Enhanced measurement**:
   - Page views → Advanced → **turn off "Page changes based on browser history events"**. Page views are
     sent manually on each route change; leaving this on double-counts SPA navigations. Verified on
     2026-10-20 against this property: with the setting on, every in-app navigation produced a second
     `page_view` from gtag itself, and those carried the URL query string (e.g. `/contact?enquiry=research`).
     The site's own page views (the ones with `device_category`) were query-free and sent once.
   - Turn off scrolls, outbound clicks, site search, video engagement, file downloads and form
     interactions. They duplicate or exceed the events above.
2. **Admin → Custom definitions → Create custom dimension** (scope: Event) for `section`, `cta_name`,
   `cta_location`, `destination`, `destination_type`, `device_category` and `enquiry_type`.
   Parameters that aren't registered can't be used in standard reports. Page path is built in.
3. **Admin → Events → Mark as key event**: `contact_submit`, `internship_apply_click`,
   `research_collaboration_click`, `join_rnd_click`.
4. **Admin → Data collection**: keep Google signals off. **Data retention**: choose the shortest period
   that still covers year-on-year comparison (2 or 14 months).
5. Optional: define an internal-traffic filter for office IPs.

## Verifying

1. Locally: `NEXT_PUBLIC_ANALYTICS_DEBUG=true npm run dev`. Allow analytics in the banner and watch the
   console as you navigate and click. Expect one `page_view` per route change and nothing for plain
   links like About. Submitting a valid contact form opens an email draft and logs exactly one
   `contact_submit`; an invalid form logs nothing.
2. In production: open the site with the [Google Analytics Debugger](https://chromewebstore.google.com/detail/google-analytics-debugger/jnkmfdileelhofjcijamephohjechhna)
   extension, allow analytics, and use **Admin → DebugView**. Confirm no `page_view` arrives before
   consent, exactly one per navigation after it, and none after declining via Analytics preferences.
3. Check iOS Safari and Chrome Android: banner buttons are reachable above the home indicator, and
   mobile-menu taps arrive with `cta_location = header-mobile`.
