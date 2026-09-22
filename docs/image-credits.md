# Photography credits and licences

Stock photography used on the public site. Unless a row says otherwise, each
photo is published on Pexels under the [Pexels License](https://www.pexels.com/license/);
the Unsplash photo is under the [Unsplash License](https://unsplash.com/license).
Both: free for commercial use, no attribution required, modification allowed. The people
shown are stock models — they are not our staff, clients or patients, and the
copy around each photo never claims otherwise.

Files live in `public/images/`. Each source was downloaded from the Pexels/Unsplash CDN
at 2000–2400px, cropped to the aspect ratio the layout needs and re-encoded with
sharp (mozjpeg, quality 80). `next/image` serves the responsive variants.

| File | Used on | Source | Photographer | Crop |
| --- | --- | --- | --- | --- |
| `dental-xray-review.jpg` | Homepage — Services intro (split layout) | https://unsplash.com/photos/-m-4tYmtLlI (CDN id `photo-1606811841689-23dfddce3e95`) | Caroline LM — **Unsplash License** (free, commercial use, no attribution required) | 1600×1200 (4:3) |
| `dental-reception-booking.jpg` | Homepage — Patient journey | https://www.pexels.com/photo/woman-at-reception-desk-showing-a-calendar-to-a-man-6809657/ | Pavel Danilyuk | 1600×1200 (4:3) |
| `step-enter-website.jpg` | Homepage — How it works, step 01 flip card | https://www.pexels.com/photo/a-receptionist-looking-at-a-tablet-4269275/ | Cedric Fauntleroy | 1000×1250 (4:5) |
| `step-patient-search.jpg` | Homepage — How it works, step 02 flip card; About — focus card "Local Visibility" | https://www.pexels.com/photo/person-using-smartphone-looking-for-directions-5448171/ | Theo Decker | 1000×1250 (4:5) |
| `step-growth-review.jpg` | Homepage — How it works, step 03 flip card | https://www.pexels.com/photo/dentist-by-dental-chair-6812452/ | Pavel Danilyuk | 1000×1250 (4:5), offset left |
| `step-review-findings.jpg` | Homepage — How it works, step 04 flip card; About — focus card "Performance & Insights" | https://www.pexels.com/photo/two-men-looking-at-the-monitor-6812518/ | Pavel Danilyuk | 1000×1250 (4:5), centre |
| `audit-backdrop-dental-model.jpg` | Homepage — Free website audit section backdrop (washed to near-white) | https://images.unsplash.com/photo-1684607631747-045ecfeeb4c7 (supplied CDN URL; standard `images.unsplash.com` host, not Unsplash+) | Unsplash contributor — **Unsplash License**; photo page/photographer to be confirmed | 2000×1125 (16:9) |
| `tools/tool-mirror.jpg` | Homepage — arc showcase card 1 | https://www.pexels.com/photo/close-up-of-a-dental-instrument-12374351/ | Anna Astakhova | 720×720, tight crop on the mirror |
| `tools/tool-explorer.jpg` | Homepage — arc showcase card 2 | https://www.pexels.com/photo/essential-dental-tools-on-neutral-background-39257053/ | artmondday | 720×720 |
| `tools/tool-scaler.jpg` | Homepage — arc showcase card 3 | https://www.pexels.com/photo/dental-instruments-on-textured-surface-31786500/ | buselliyy | 720×720 |
| `tools/tool-handpiece.jpg` | Homepage — arc showcase card 4 | https://www.pexels.com/photo/dental-instruments-on-a-holder-6812477/ | Pavel Danilyuk | 720×720 |
| `tools/tool-forceps.jpg` | Homepage — arc showcase card 5 | https://www.pexels.com/photo/close-up-shot-of-dental-tools-4269366/ | Cedric Fauntleroy | 720×720 |
| `tools/tool-syringe.jpg` | Homepage — arc showcase card 6 | https://www.pexels.com/photo/close-up-shot-of-a-dental-syringe-and-other-dental-tools-on-blue-surface-6502746/ | cottonbro | 720×720 |
| `reception-enquiry.jpg` | Homepage — missed-opportunity calculator | https://www.pexels.com/photo/a-receptionist-smiling-at-a-person-4269206/ | Cedric Fauntleroy | 1200×1500 (4:5) |
| `dental-consultation-smile.jpg` | Homepage — Trust / consultation card | https://www.pexels.com/photo/a-dentist-explaining-to-a-patient-using-a-dental-cast-5355723/ | Tima Miroshnichenko | 1600×1000 (16:10) |
| `about-hero.jpg` | About — hero | https://www.pexels.com/photo/3845553/ | Shvetsa | 1600×1280 (5:4) |
| `about-team-tablet.jpg` | About — Who we help | https://www.pexels.com/photo/3952136/ | Olly | 1600×1200 (4:3) |
| `focus-consultation.jpg` | About — focus card "Website Experience" | https://www.pexels.com/photo/12635375/ | Jerussa Paredes | 1200×900 (4:3) |
| `focus-imaging.jpg` | About — focus card "SEO & Content" | https://www.pexels.com/photo/9951392/ | Bakytzhan Baurzhanov | 1200×900 (4:3) |
| `about-evidence-xray.jpg` | About — Evidence before assumptions | https://www.pexels.com/photo/4270093/ | Cedric Fauntleroy | 1200×1500 (4:5) |
| `about-clinic-wide.jpg` | About — Canadian dental focus banner | https://www.pexels.com/photo/7800669/ | Nadezhda Moryak | 2000×900 (20:9), upper section of the portrait source |

Pre-existing assets (added before this record was kept; source not recorded in
the repository):

| File | Used on |
| --- | --- |
| `dental-operatory-bright.jpg` | Homepage hero |
| `dental-operatory-calm.jpg` | Currently unused |

## Selection rules

- Real dental environments and natural patient/front-desk interactions only —
  no AI-generated imagery, illustrations or generic corporate stock.
- No third-party clinic branding visible in the frame (several photos from the
  same shoot were rejected for a visible clinic logo).
- Consistent bright, neutral clinic lighting so the photos sit together.
- Alt text describes the scene; it never names people or implies affiliation.

## Video

| File | Used on | Source | Creator | Notes |
| --- | --- | --- | --- | --- |
| `public/video/clinic-reception.mp4` + `clinic-reception-poster.jpg` | Homepage — cinematic band below the hero | https://www.pexels.com/video/a-dentist-treating-a-patient-7803281/ | Nadezhda Moryak — **Pexels License** (free, commercial use, no attribution required) | 19.5 s loop, muted H.264 at Full HD 1920×1080 / 30 fps, CRF 26 (~3.8 MB); poster is frame at 3 s |
