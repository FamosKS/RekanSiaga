# Public article cover delivery

## What failed

Article and featured-article readers received a private Storage path and attempted to create a signed URL with the anonymous browser client. Admin previews signed the same private object with the authenticated staff client, so a cover could appear in Admin and remain unavailable publicly when anonymous Storage signing was denied. The resolver silently converted that failure to an absent cover.

## Fix

`public-article-cover` is a read-only Edge Function. It accepts only an article slug, queries the single article with `publication_status='published'` and non-null `published_at`, validates that the stored cover path belongs to that article in the existing private `article-media` bucket, then redirects to a 60-second Storage signed URL. Missing, unpublished, invalid-path, and absent-cover cases return the same 404. The bucket stays private; no article rows, RLS, policies, or Flutter contracts change. The public URL contains a slug, not an internal storage path or credential.

Run from an interactive PowerShell in the Web repository after approving the function deployment:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "D:\Rekan Siaga\rekansiaga-web\scripts\deploy-dev-public-article-cover.ps1" -ApprovedPublicArticleCover
```

The script verifies the Supabase CLI project list against `rekansiaga-dev` / `uiuiouosblyuqgnvfpeh` before deploying. It does not ask for the database password and makes no SQL or bucket changes.

## Acceptance

After confirmed deployment, restart Vite and verify a published article with an Admin-uploaded cover on `/informasi`, its detail page, and Home's Informasi Utama. Check the image request returns a redirect followed by image bytes; confirm an unpublished article slug returns 404 and no report-evidence/private-report content can be reached through this function. Archive/publish changes may remain in browser/CDN cache for at most one minute due to the signed URL lifetime. Do not claim LIVE PASS until observed in the browser.
