# Avatar Season 2 Quest

A dramatic, unserious GitHub Pages invitation for choosing an Avatar Season 2 watch time.

## Add images

Drop images into these exact paths and they will automatically appear:

- `images/avatar/map-bg.jpg`
- `images/me/judging-1 (1).jpeg`
- `images/me/judging-1 (2).jpeg`
- `images/me/cheers.jpeg`
- `images/me/sad-drinking.mp4`

If an image is missing, the site shows a placeholder label with the filename you need.

The judging images shuffle randomly when he makes choices on the time/day screens.

## Google Apps Script submission setup

1. Create a Google Sheet.
2. In the sheet, go to **Extensions > Apps Script**.
3. Paste the contents of `apps-script/Code.gs`.
4. Click **Deploy > New deployment**.
5. Choose **Web app**.
6. Set **Execute as** to **Me**.
7. Set **Who has access** to **Anyone**.
8. Deploy and copy the Web App URL.
9. Paste that URL into `config.js` as `googleAppsScriptUrl`.

The site logs rejections, invalid time choices, and final valid submissions.

## Availability logic

The site shows Madrid time. Valid windows are:

- Earth Kingdom, Saturday, July 4, 2026: 1:00 PM-6:00 PM Madrid
- Water Tribe, Sunday, July 5, 2026: 1:00 PM-6:00 PM Madrid

Those correspond to 7:00 PM-12:00 AM Shanghai.
