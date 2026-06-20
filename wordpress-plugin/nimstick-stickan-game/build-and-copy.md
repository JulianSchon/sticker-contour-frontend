# Building and deploying the game bundle

1. From repo root: `cd game && npm install && npm run build:wp`
   - This builds the game and copies `game/dist/` into this plugin's `dist/` folder.
2. Commit the updated `dist/` (the plugin ships its built bundle).
3. To install on WordPress: zip the `nimstick-stickan-game` folder and upload via
   WordPress -> Plugins -> Add New -> Upload, or copy into `wp-content/plugins/`.
4. Activate the plugin, then add the shortcode `[nimstick_game]` to any page.
   Optional height: `[nimstick_game height="600px"]`.
