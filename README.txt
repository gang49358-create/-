BAZE CHINA — SCRIPT.JS

1. Open the repository: https://github.com/gang49358-create/bazechias
2. Open script.js and replace its contents with the included script.js.
3. Commit changes and wait for GitHub Pages to deploy.
4. Reload the site with Ctrl+F5.

This version includes the existing shop/admin/review code and sends BOTH `content` and `text` when publishing news, because the Supabase news_items table shown in your screenshot has both columns marked NOT NULL.

Important: this JavaScript fix does not guarantee that Supabase permissions (RLS) allow inserts. If publication still fails, send the exact new error message. Never put a Supabase service_role/secret key in browser JavaScript.
