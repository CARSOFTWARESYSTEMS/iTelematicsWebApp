# Go-live checklist: itelematics.com Satellite Engineering site

Work through these in order. Don't announce the contact form as working until step 1 passes.

## 1. Contact form (email draft)

The contact form does not send email from the website. After validation, "Open Email Draft →" opens the
visitor's email app with a draft to `info@iTelematics.com` (subject and body pre-filled), and a "Copy
message" fallback appears in case no email app opens. No server configuration is needed.

Test on the live site with analytics allowed and GA4 **DebugView** open:

- [ ] Desktop with a configured mail app (Apple Mail / Outlook): the draft opens with the right subject and body.
- [ ] iPhone (Mail) and Android (Gmail): the draft opens; the subject and line breaks survive.
- [ ] A browser with no mail app: "Copy message" copies the full enquiry.
- [ ] DebugView shows exactly **one** `contact_submit` per draft, with the right `enquiry_type`.
- [ ] An invalid form (e.g. bad email) shows field errors and logs no `contact_submit`.
- [ ] A sent test email arrives in the `info@iTelematics.com` mailbox.

## 2. GA4 property settings

GA4 → Admin → Data streams → Web → Enhanced measurement:

- [ ] Page views → Advanced → turn **off** "Page changes based on browser history events".
- [ ] Turn off scrolls, outbound clicks, site search, video engagement, file downloads and form interactions.
- [ ] Register event-scoped custom dimensions: `section`, `cta_name`, `cta_location`, `destination`,
  `destination_type`, `device_category`, `enquiry_type`.
- [ ] Mark key events: `contact_submit`, `internship_apply_click`, `research_collaboration_click`, `join_rnd_click`.

Then verify in DebugView: navigate `/ → /satellite-engineering → /contact` and confirm exactly **one**
`page_view` per page, with no query strings in the page location. (Local testing on 2026-10-20, with the
history setting still on, showed a duplicate `page_view` for every in-app navigation.)

## 3. Final browser smoke test (after steps 1 and 2)

| Check | Desktop Chrome | Desktop Safari | Android Chrome | iOS Safari |
|---|---|---|---|---|
| No horizontal scrolling | ☐ | ☐ | ☐ | ☐ |
| Consent: Allow → events in DebugView | ☐ | ☐ | ☐ | ☐ |
| Consent: Decline → no gtag, no hits (also after reload) | ☐ | ☐ | ☐ | ☐ |
| Mobile navigation opens, links work, menu closes | — | — | ☐ | ☐ |
| Consultancy menu (click and keyboard) | ☐ | ☐ | ☐ | ☐ |
| Explore Satellite Engineering → `satellite_engineering_click` | ☐ | ☐ | ☐ | ☐ |
| Explore Interactive 3D → `interactive_3d_click` | ☐ | ☐ | ☐ | ☐ |
| Apply for Internship → `internship_apply_click` | ☐ | ☐ | ☐ | ☐ |
| Join Satellite Engineering → `/contact?enquiry=research`, Research Collaboration preselected, `join_rnd_click` | ☐ | ☐ | ☐ | ☐ |
| Partner outbound links → `partner_click` | ☐ | ☐ | ☐ | ☐ |
| Contact form opens an email draft | ☐ | ☐ | ☐ | ☐ |

## Already verified locally (2026-10-20, production build)

- Desktop Chrome and Android Chrome (Pixel 7 emulation): 34/34 end-to-end checks with real gtag.js and
  intercepted GA hits (consent, every CTA event including both APEX links, email-draft flow, only the selected
  Research workspace panel visible, no personal data in hits, withdrawal).
- Safari engine (WebKit 26.6): 13/13: 3D satellite, workspace tabs and panel visibility, chart keyboard
  crosshair, Join Satellite Engineering preselect, no overflow, no page errors.
- iOS 18 Safari (Simulator): home and Research Platform rendering (checked on the V3 build; not re-run for V4).
- Responsive sweep: 10 pages × 11 widths (360–1920 px): no horizontal overflow, no touch targets under 40 px.
- Full-page screenshots of every major page reviewed at 1440 px and 390 px, plus each Research tab.

## Documents

- Public documents with the personal name removed live in `public/documents/`. `public/public/iTelematics.pdf`
  and `public/public/AI-Powered EV Battery Fire Prevention System.pdf` were cleaned in place. Unredacted
  originals are kept in `archive/public-originals/` (not served). Old URLs redirect (301).
- Still to decide: those two unlinked legacy PDFs show a personal phone number and email in their footers.
  The password-protected IEEE certificate couldn't be inspected.
