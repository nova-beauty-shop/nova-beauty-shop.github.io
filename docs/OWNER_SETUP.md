# Nova Shop: setup for a new Supabase project

1. In Supabase Dashboard, open SQL Editor and create a new query.
2. Open `SUPABASE_SETUP.sql` from this project, copy its full contents, paste into SQL Editor, and click Run once. This script contains all 27 migrations in chronological order and is intended only for a brand-new, empty Supabase project.
3. In Authentication settings, configure the email confirmation behavior before public signup. The app currently expects email confirmation and shows a message telling customers to check their inbox. Supabase's default email service is limited; configure custom SMTP for reliable public customer email delivery.
4. Publish the website, then create your own account through the existing sign-up screen.
5. Open `/admin` and press `ثبت به عنوان مالک فروشگاه`. The claim is one-time only. Do this before sharing the website publicly.

Never put a Supabase secret/service-role key in the website or any `VITE_` environment variable. Only the publishable key belongs in the browser.
