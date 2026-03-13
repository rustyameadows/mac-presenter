import type { ForgeConfig } from "@electron-forge/shared-types";
import { MakerZIP } from "@electron-forge/maker-zip";
import { WebpackPlugin } from "@electron-forge/plugin-webpack";

import { createPresenterDocumentTypes } from "./src/main/mac-open-file";

const config: ForgeConfig = {
  packagerConfig: {
    appBundleId: "com.rustymeadows.presenter",
    appCategoryType: "public.app-category.graphics-design",
    name: "Presenter",
    extendInfo: {
      LSUIElement: "1",
      CFBundleDocumentTypes: createPresenterDocumentTypes()
    }
  },
  makers: [new MakerZIP({}, ["darwin"])],
  plugins: [
    new WebpackPlugin({
      mainConfig: "./webpack.main.config.js",
      renderer: {
        config: "./webpack.renderer.config.js",
        entryPoints: [
          {
            name: "main_window",
            html: "./src/renderer/index.html",
            js: "./src/renderer/index.tsx",
            preload: {
              js: "./src/preload/index.ts"
            }
          }
        ]
      }
    })
  ]
};

export default config;
